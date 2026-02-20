import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { APPRAISAL_MODE_PROMPT, CATEGORY_TAGS, GENERAL_SYSTEM_PROMPT, OPS_SYSTEM_PROMPT, STORE_HOURS, VAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { TABLES, putItem, scanItems } from "@/lib/dynamodb";
import { createUnifiedConversationRecord } from "@/lib/conversation-model";
import { ChatMessage, createChatCompletion } from "@/lib/openai";
import { sendSMS } from "@/lib/twilio";
import { getAgentConfigBatch } from "@/lib/agent-config";
import { getStoreStatusInEastern } from "@/lib/store-status";
import { searchInventoryItems } from "@/lib/inventory-search";

type ChatRequestBody = {
  messages: ChatMessage[];
  conversationId?: string;
  mode?: "general" | "appraisal" | "ops";
  pagePath?: string;
  roleHint?: "customer" | "staff_or_owner";
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type InventoryToolResult = {
  __inventory_results?: boolean;
  count?: number;
  top_matches?: Array<Record<string, unknown>>;
  display_image?: string | null;
  query_category?: string;
  query_keyword?: string;
};

type ScheduleVisitToolResult = {
  scheduled?: boolean;
  confirmation_code?: string;
  lead_id?: string;
  sms_status?: {
    success?: boolean;
    reason?: string;
  };
};

function normalizeFormKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseSubmittedFormData(messageContent: string): Record<string, string> | null {
  const markerRegex = /(Here is the requested information:|Please schedule a visit with the following details:)/i;
  const markerMatch = messageContent.match(markerRegex);
  if (!markerMatch || markerMatch.index == null) return null;

  const afterMarker = messageContent.slice(markerMatch.index + markerMatch[0].length);
  const lines = afterMarker
    .split("\n")
    .map((line) => line.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const parsed: Record<string, string> = {};
  for (const line of lines) {
    const separatorIndex = line.search(/[:=-]/);
    if (separatorIndex <= 0) continue;

    const rawKey = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!rawKey || !rawValue) continue;

    parsed[normalizeFormKey(rawKey)] = rawValue;
  }

  if (Object.keys(parsed).length === 0) {
    const regexExtract = (
      labelPattern: RegExp,
      fallbackPattern?: RegExp,
    ) => {
      const primary = afterMarker.match(labelPattern)?.[1]?.trim();
      if (primary) return primary;
      return fallbackPattern ? afterMarker.match(fallbackPattern)?.[1]?.trim() ?? "" : "";
    };

    const customerName = regexExtract(/(?:customer\s*name|full\s*name|name)\s*[:=-]\s*([^\n]+)/i);
    const phone = regexExtract(/(?:phone|phone\s*number)\s*[:=-]\s*([^\n]+)/i);
    const preferredTime = regexExtract(/(?:preferred\s*time|time\s*slot|time)\s*[:=-]\s*([^\n]+)/i);
    const itemDescription = regexExtract(/(?:item\s*description|item\s*details?)\s*[:=-]\s*([^\n]+)/i);

    if (customerName) parsed.customer_name = customerName;
    if (phone) parsed.phone = phone;
    if (preferredTime) parsed.preferred_time = preferredTime;
    if (itemDescription) parsed.item_description = itemDescription;
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

function extractScheduleSubmission(formData: Record<string, string>) {
  const customerName = formData.customer_name ?? formData.full_name ?? formData.name ?? "";
  const phone = formData.phone ?? formData.phone_number ?? "";
  const preferredTime = formData.preferred_time ?? formData.time ?? "";
  const itemDescription = formData.item_description ?? "Pawn/valuation inquiry";

  if (!customerName || !phone || !preferredTime) {
    return null;
  }

  return {
    customer_name: customerName,
    phone,
    preferred_time: preferredTime,
    item_description: itemDescription,
  };
}

function streamTextResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

function getStoreStatus() {
  return getStoreStatusInEastern(STORE_HOURS);
}

function getBasePromptForMode(mode: "general" | "appraisal" | "ops") {
  if (mode === "appraisal") return APPRAISAL_MODE_PROMPT;
  if (mode === "ops") return OPS_SYSTEM_PROMPT;
  return GENERAL_SYSTEM_PROMPT || VAULT_SYSTEM_PROMPT;
}

function formatInventoryResponse(result: InventoryToolResult): string {
  const count = Number(result.count ?? 0);
  const topMatches = Array.isArray(result.top_matches) ? result.top_matches : [];

  if (count <= 0 || topMatches.length === 0) {
    return "I couldn't find a match in current inventory. Call (904) 650-3007 or visit 6132 Merrill Rd and we’ll check live floor stock for you.";
  }

  const preview = topMatches
    .slice(0, 3)
    .map((item, index) => {
      const brand = String(item.brand ?? "").trim();
      const model = String(item.model ?? "").trim();
      const category = String(item.category ?? "item").trim();

      const titleParts = [brand, model].filter(
        (part) => part && part.toLowerCase() !== "unbranded"
      );
      const title = titleParts.length > 0 ? titleParts.join(" ") : category;
      return `${index + 1}) ${title}`;
    })
    .filter(Boolean)
    .join(" | ");

  const noun = count === 1 ? "item" : "items";

  if (count > 1) {
    return `I found ${count} ${noun}. Top matches: ${preview}. Want details on #1, or see the next match?`;
  }

  return `I found ${count} ${noun}. Top match: ${preview}. Want details or something similar?`;
}

function clampInventoryIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
}

type InventoryDetailLevel = "brief" | "detailed";
type InventoryQuestionIntent = "price" | "condition" | "brand" | "model" | "availability" | "details" | "none";

function inferInventoryDetailLevel(lastUserText: string): InventoryDetailLevel {
  const text = lastUserText.toLowerCase();
  if (/\b(details?|elaborate|tell me more|more about|describe|condition|price|brand|model|specs?)\b/.test(text)) {
    return "detailed";
  }
  return "brief";
}

function inferInventoryQuestionIntent(lastUserText: string): InventoryQuestionIntent {
  const text = lastUserText.toLowerCase();

  if (/\b(how much|price|cost|asking|tagged|what\s+is\s+the\s+price|what'?s\s+the\s+price)\b/.test(text)) {
    return "price";
  }
  if (/\b(condition|any wear|scratches|damage|mint|clean)\b/.test(text)) {
    return "condition";
  }
  if (/\b(brand|maker|who makes)\b/.test(text)) {
    return "brand";
  }
  if (/\b(model|version|series)\b/.test(text)) {
    return "model";
  }
  if (/\b(still available|available|in stock|on hand|do you have it)\b/.test(text)) {
    return "availability";
  }
  if (/\b(details?|tell me more|more about|describe|specs?)\b/.test(text)) {
    return "details";
  }

  return "none";
}

function normalizeLabelCandidate(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isReasonableTitlePart(value: string): boolean {
  if (!value) return false;
  if (value.length > 36) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  if (/[,.;:!?]/.test(value)) return false;
  return true;
}

function getItemShortTitle(item: Record<string, unknown>): string {
  const brand = normalizeLabelCandidate(item.brand);
  const model = normalizeLabelCandidate(item.model);
  const category = normalizeLabelCandidate(item.category || "item");

  const titleParts = [brand, model].filter((part) => {
    if (!isReasonableTitlePart(part)) return false;
    return part.toLowerCase() !== "unbranded";
  });

  return titleParts.length > 0 ? titleParts.join(" ") : category;
}

function getItemBriefDescription(item: Record<string, unknown>, maxLength?: number): string {
  const raw = String(item.description ?? "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/^this is\s+/i, "").replace(/\s+/g, " ");
  if (!maxLength || maxLength <= 0 || normalized.length <= maxLength) return normalized;

  const sentenceEnd = normalized.slice(0, maxLength).lastIndexOf(".");
  if (sentenceEnd >= 45) {
    return normalized.slice(0, sentenceEnd + 1);
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function extractDisplayImage(item: Record<string, unknown>): string | null {
  const imageUrl = String(item.image_url ?? "").trim();
  if (imageUrl) return imageUrl;

  if (Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = String(item.images[0] ?? "").trim();
    return firstImage || null;
  }

  return null;
}

function getItemNumericPrice(item: Record<string, unknown>): number | null {
  const rawPrice = item.price;
  const numericPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) return null;
  return numericPrice;
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/[.!?…]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function getItemDetailTail(item: Record<string, unknown>): string {
  const condition = normalizeLabelCandidate(item.condition);
  const rawPrice = item.price;
  const numericPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
  const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;

  const detailParts: string[] = [];
  if (condition) detailParts.push(`condition: ${condition.toLowerCase()}`);
  if (hasPrice) detailParts.push(`tagged at $${Math.round(numericPrice)}`);

  if (detailParts.length === 0) return "";
  return detailParts.join(", ");
}

function extractShownMatchIndexFromAssistant(message: string): number | null {
  const explicit = message.match(/showing\s*#\s*(\d+)/i);
  if (explicit) {
    const value = Number(explicit[1]);
    if (Number.isFinite(value) && value > 0) return value - 1;
  }

  const topMatch = message.match(/top\s+match:\s*(\d+)\)/i);
  if (topMatch) {
    const value = Number(topMatch[1]);
    if (Number.isFinite(value) && value > 0) return value - 1;
  }

  return null;
}

function inferInventoryRequestedIndex(
  lastUserText: string,
  previousAssistantText: string | null,
): number {
  const userText = lastUserText.toLowerCase();
  const previousAssistantLower = (previousAssistantText ?? "").toLowerCase();
  const previousIndex = previousAssistantText
    ? extractShownMatchIndexFromAssistant(previousAssistantText)
    : null;

  const asksForMoreOnCurrent = /\b(that one|this one|it|same one|more on|more about|tell me more|details?)\b/.test(userText);
  const asksForNext = /\bnext\b|\banother\b|\bother one\b|\bone more\b/.test(userText);
  const asksForPrevious = /\bprevious\b|\bprev\b|\bback\b/.test(userText);
  const isAffirmative = /^(yes|yeah|yep|yup|sure|ok|okay|please|do it|go ahead|sounds good|why not)\b/.test(userText.trim());
  const promptedForAnother = /want to see another one\?|see the next match\?|see another/.test(previousAssistantLower);
  const promptedForBack = /want to go back to the other one\?|go back to the other one/.test(previousAssistantLower);

  const ordinalMap: Array<{ regex: RegExp; index: number }> = [
    { regex: /#\s*1\b|\bfirst\b/, index: 0 },
    { regex: /#\s*2\b|\bsecond\b/, index: 1 },
    { regex: /#\s*3\b|\bthird\b/, index: 2 },
    { regex: /#\s*4\b|\bfourth\b/, index: 3 },
    { regex: /#\s*5\b|\bfifth\b/, index: 4 },
  ];

  for (const candidate of ordinalMap) {
    if (candidate.regex.test(userText)) {
      return candidate.index;
    }
  }

  if (isAffirmative && promptedForAnother) {
    if (previousIndex != null) return previousIndex + 1;
    return 1;
  }

  if (isAffirmative && promptedForBack) {
    if (previousIndex != null) return Math.max(0, previousIndex - 1);
    return 0;
  }

  if (asksForNext) {
    if (previousIndex != null) return previousIndex + 1;
    return 1;
  }

  if (asksForPrevious) {
    if (previousIndex != null) return Math.max(0, previousIndex - 1);
    return 0;
  }

  if (asksForMoreOnCurrent && previousIndex != null) {
    return previousIndex;
  }

  if (asksForMoreOnCurrent) {
    if (promptedForBack) return Number.MAX_SAFE_INTEGER;
    if (promptedForAnother) return 0;
  }

  return 0;
}

function formatInventoryResponseWithSelection(
  result: InventoryToolResult,
  requestedIndex: number,
  lastUserText: string,
): string {
  const count = Number(result.count ?? 0);
  const topMatches = Array.isArray(result.top_matches) ? result.top_matches : [];

  if (count <= 0 || topMatches.length === 0) {
    return formatInventoryResponse(result);
  }

  const selectedIndex = clampInventoryIndex(requestedIndex, topMatches.length);
  const selected = topMatches[selectedIndex];
  const selectionPrefix = count > 1 ? `Showing #${selectedIndex + 1} of ${topMatches.length}. ` : "";
  const title = getItemShortTitle(selected);
  const brief = getItemBriefDescription(selected);
  const questionIntent = inferInventoryQuestionIntent(lastUserText);
  const numericPrice = getItemNumericPrice(selected);
  const condition = normalizeLabelCandidate(selected.condition);
  const brand = normalizeLabelCandidate(selected.brand);
  const model = normalizeLabelCandidate(selected.model);

  let lead: string;
  switch (questionIntent) {
    case "price":
      lead = numericPrice != null
        ? `I found ${title} — it’s tagged at $${Math.round(numericPrice)}.`
        : `I found ${title} — I don’t have a tagged price listed yet, but staff can quote it quickly.`;
      break;
    case "condition":
      lead = condition
        ? `I found ${title} — condition is listed as ${condition.toLowerCase()}.`
        : `I found ${title} — condition isn’t listed, but I can have staff verify it for you.`;
      break;
    case "brand":
      lead = brand
        ? `I found ${title} — brand is ${brand}.`
        : `I found ${title} — brand isn’t explicitly listed in this record.`;
      break;
    case "model":
      lead = model
        ? `I found ${title} — model is ${model}.`
        : `I found ${title} — model isn’t explicitly listed in this record.`;
      break;
    case "availability":
      lead = `I found ${title} — it shows in current inventory.`;
      break;
    case "details":
    case "none":
    default:
      lead = brief ? `I found ${title} — ${brief}` : `I found ${title}.`;
      break;
  }

  if (count > 1) {
    if (selectedIndex >= topMatches.length - 1) {
      return `${selectionPrefix}${lead} Want to go back to the other one?`;
    }
    return `${selectionPrefix}${lead} Want to see another one?`;
  }

  return `${selectionPrefix}${lead}`;
}

function formatInventoryImageReply(
  result: InventoryToolResult,
  requestedIndex: number,
  detailLevel: InventoryDetailLevel,
  lastUserText: string,
): string {
  const topMatches = Array.isArray(result.top_matches) ? result.top_matches : [];
  if (topMatches.length === 0) return formatInventoryResponse(result);

  const selectedIndex = clampInventoryIndex(requestedIndex, topMatches.length);
  const selected = topMatches[selectedIndex];
  const count = Number(result.count ?? topMatches.length);
  const selectionPrefix = count > 1 ? `Showing #${selectedIndex + 1} of ${topMatches.length}. ` : "";
  const title = getItemShortTitle(selected);
  const brief = getItemBriefDescription(selected, detailLevel === "detailed" ? undefined : undefined);
  const questionIntent = inferInventoryQuestionIntent(lastUserText);
  const numericPrice = getItemNumericPrice(selected);
  const condition = normalizeLabelCandidate(selected.condition);
  const brand = normalizeLabelCandidate(selected.brand);
  const model = normalizeLabelCandidate(selected.model);

  const questionTail = count > 1
    ? selectedIndex >= topMatches.length - 1
      ? " Want to go back to the other one?"
      : " Want to see another one?"
    : "";

  if (questionIntent === "price") {
    if (numericPrice != null) {
      return `${selectionPrefix}I found ${title} — it’s tagged at $${Math.round(numericPrice)}.${questionTail}`;
    }
    return `${selectionPrefix}I found ${title} — I don’t have a tagged price listed yet, but staff can quote it quickly.${questionTail}`;
  }

  if (questionIntent === "condition") {
    if (condition) {
      return `${selectionPrefix}I found ${title} — condition is listed as ${condition.toLowerCase()}.${questionTail}`;
    }
    return `${selectionPrefix}I found ${title} — condition isn’t listed, but I can have staff verify it for you.${questionTail}`;
  }

  if (questionIntent === "brand") {
    if (brand) {
      return `${selectionPrefix}I found ${title} — brand is ${brand}.${questionTail}`;
    }
    return `${selectionPrefix}I found ${title} — brand isn’t explicitly listed in this record.${questionTail}`;
  }

  if (questionIntent === "model") {
    if (model) {
      return `${selectionPrefix}I found ${title} — model is ${model}.${questionTail}`;
    }
    return `${selectionPrefix}I found ${title} — model isn’t explicitly listed in this record.${questionTail}`;
  }

  if (questionIntent === "availability") {
    return `${selectionPrefix}I found ${title} — it shows in current inventory.${questionTail}`;
  }

  if (detailLevel === "detailed") {
    const detailTail = getItemDetailTail(selected);
    const briefSentence = brief ? ensureTerminalPunctuation(brief) : "";
    if (brief && detailTail) {
      return `${selectionPrefix}I found ${title} — ${briefSentence} ${detailTail}.${questionTail}`;
    }
    if (brief) {
      return `${selectionPrefix}I found ${title} — ${briefSentence}${questionTail}`;
    }
    if (detailTail) {
      return `${selectionPrefix}I found ${title}; ${detailTail}.${questionTail}`;
    }
    return `${selectionPrefix}I found ${title}.${questionTail}`;
  }

  if (brief) {
    const briefSentence = ensureTerminalPunctuation(brief);
    return `${selectionPrefix}I found ${title} — ${briefSentence}${questionTail}`;
  }

  return `${selectionPrefix}I found ${title}.${questionTail}`;
}

async function handleToolCall(toolCall: ToolCall, req: NextRequest) {
  const args = (() => {
    try {
      return JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      return {};
    }
  })() as Record<string, unknown>;

  console.log(`\n📞 TOOL CALL: ${toolCall.function.name}`);
  console.log(`   Arguments:`, JSON.stringify(args, null, 2));

  switch (toolCall.function.name) {
    case "appraise_item": {
      return {
        message:
          "For the most accurate appraisal, switch to Appraisal mode in Hero Chat and upload clear multi-angle photos with item details.",
        category: args.category ?? null,
      };
    }

    case "schedule_visit": {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const phone = String(args.phone ?? "");
      const customerName = String(args.customer_name ?? args.name ?? "");
      const preferredTime = String(args.preferred_time ?? "your requested time");
      const itemDescription = String(args.item_description ?? "Pawn/valuation inquiry");
      const estimatedValueRaw = Number(args.estimated_value ?? 0);
      const estimatedValue = Number.isFinite(estimatedValueRaw) ? estimatedValueRaw : 0;
      const now = new Date().toISOString();
      const leadId = randomUUID();
      const appointmentId = randomUUID();

      const smsBody = `USA Pawn Holdings appointment confirmed for ${preferredTime}. Confirmation: ${code}. Visit us at 6132 Merrill Rd Ste 1, Jacksonville, FL 32277.`;
      const sms = await sendSMS(phone, smsBody);

      await putItem(TABLES.leads, {
        lead_id: leadId,
        appointment_id: appointmentId,
        type: "appointment",
        source: "chat",
        source_channel: "chat",
        contact_method: "chat",
        customer_name: customerName,
        phone,
        preferred_time: preferredTime,
        scheduled_time: preferredTime,
        appointment_time: preferredTime,
        item_description: itemDescription,
        estimated_value: estimatedValue,
        confirmation_code: code,
        status: "scheduled",
        sms_sent: sms.success === true,
        created_at: now,
        timestamp: now,
        updated_at: now,
      });

      return {
        scheduled: true,
        confirmation_code: code,
        lead_id: leadId,
        sms_status: sms,
      };
    }

    case "check_inventory": {
      const category = String(args.category ?? "").toLowerCase();
      const keyword = String(args.keyword ?? "").toLowerCase();
      console.log(`   🔍 Searching inventory - Category: "${category}", Keyword: "${keyword}"`);

      const all = await scanItems<Record<string, unknown>>(TABLES.inventory);
      console.log(`   📦 Total inventory items in DB: ${all.length}`);

      // Debug: List first 3 items to see structure
      if (all.length > 0) {
        console.log(`   📋 Sample item structure:`, JSON.stringify(all[0], null, 2).substring(0, 500));
      }

      const searchResult = searchInventoryItems(all, { category, keyword, limit: 5 });
      const filteredCount = searchResult.count;
      const usedKeywordFallback = searchResult.usedKeywordFallback;
      const topMatches = searchResult.topMatches;

      if (usedKeywordFallback) {
        console.log("   ↪️  Strict category match returned 0; using keyword-only fallback.");
      }
      console.log(`   ✓ Filtered results: ${filteredCount} items matching`);
      if (topMatches.length > 0) {
        const first = topMatches[0];
        console.log(`   Top match: ${String(first.category)} - ${String(first.description)}`);
        console.log(`   Top match brand: "${String(first.brand ?? '')}"`);
        // Check both image_url (from seed) and images array (from UI)
        const imageField = first.image_url || (Array.isArray(first.images) && first.images[0]);
        console.log(`   Top match image field: "${String(imageField ?? 'EMPTY/NULL')}"`);
      } else {
        // Debug: Show what jewelry items we have if keyword was jewelry-related
        if (keyword.includes('necklace') || keyword.includes('gold') || keyword.includes('jewelry')) {
          const jewelryItems = all.filter(item => String(item.category ?? "").toLowerCase().includes('jewelry'));
          console.log(`   ⚠️  No matches found. We have ${jewelryItems.length} jewelry items total:`);
          jewelryItems.slice(0, 3).forEach((item, idx) => {
            console.log(`      [${idx}] Brand: "${String(item.brand ?? '')}", Desc: "${String(item.description ?? '').substring(0, 50)}"`);
          });
        }
      }

      const displayImage = searchResult.displayImage;
      console.log(`   📸 Display image for response: "${displayImage || 'NONE'}"`);
      
      const result = {
        __inventory_results: true,
        categories: CATEGORY_TAGS,
        count: filteredCount,
        top_matches: topMatches,
        query_category: category,
        query_keyword: keyword,
        category_fallback_used: usedKeywordFallback,
        // Include image from first match for chat display
        display_image: displayImage,
        display_summary: topMatches.length > 0 
          ? `Found ${filteredCount} item${filteredCount !== 1 ? 's' : ''} matching your search. Top result: ${String(topMatches[0].category ?? "")} - ${String(topMatches[0].description ?? "")}`
          : `No items found matching your search.`,
      };

      console.log(`   Result count: ${result.count}, Summary: ${result.display_summary}`);
      return result;
    }

    case "get_gold_spot_price": {
      const response = await fetch(`${req.nextUrl.origin}/api/gold-price`, { cache: "no-store" });
      if (!response.ok) {
        return { gold: 2050, silver: 24.5, platinum: 950, source: "fallback" };
      }
      return response.json();
    }

    case "log_lead": {
      const leadId = randomUUID();
      const now = new Date().toISOString();

      await putItem(TABLES.leads, {
        lead_id: leadId,
        source: String(args.source ?? "web").toLowerCase(),
        source_channel: String(args.source ?? "web").toLowerCase(),
        contact_method: String(args.contact_method ?? "web").toLowerCase(),
        customer_name: String((args.customer_info as { name?: string } | undefined)?.name ?? ""),
        phone: String((args.customer_info as { phone?: string } | undefined)?.phone ?? ""),
        item_description: String(args.item_interest ?? ""),
        estimated_value: Number(args.estimated_value ?? 0),
        status: "new",
        created_at: now,
        timestamp: now,
      });

      return { success: true, lead_id: leadId };
    }

    case "check_store_status": {
      return getStoreStatus();
    }

    case "escalate_to_staff": {
      const leadId = randomUUID();
      await putItem(TABLES.leads, {
        lead_id: leadId,
        source: "web",
        source_channel: "web",
        contact_method: "web",
        item_description: String(args.reason ?? "Escalation requested"),
        estimated_value: Number(args.estimated_value ?? 0),
        priority: String(args.priority ?? "high"),
        status: "escalated",
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      });

      return { success: true, escalated: true, lead_id: leadId };
    }

    case "request_form": {
      // Return the form specification exactly as provided - frontend will render it
      return {
        __form_request: true,
        form_spec: {
          title: String(args.title ?? "Please Fill Out"),
          description: args.description ? String(args.description) : undefined,
          fields: Array.isArray(args.fields) ? args.fields : [],
          submitLabel: args.submitLabel ? String(args.submitLabel) : undefined,
        },
      };
    }

    default:
      console.log(`   ⚠️  UNHANDLED TOOL: ${toolCall.function.name}`);
      return { error: `Unsupported function: ${toolCall.function.name}` };
  }
}

export async function POST(req: NextRequest) {
  let conversationId: string = randomUUID();

  try {
    const body = (await req.json()) as ChatRequestBody;
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    conversationId = body.conversationId ?? conversationId;
    const mode = body.mode ?? "general";
    const pagePath = body.pagePath ?? "unknown";
    const roleHint = body.roleHint ?? "customer";

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎯 CHAT REQUEST #${conversationId.slice(0, 8)}`);
    console.log(`   Incoming messages: ${userMessages.length}`);
    userMessages.forEach((msg, i) => {
      const contentStr = typeof msg.content === "string" ? msg.content : "";
      const content = contentStr.substring(0, 100);
      console.log(`   [${i}] ${msg.role}: "${content}${contentStr.length > 100 ? '...' : ''}"`);
    });

    // ── Build dynamic system prompt from agent config ──
    const agentConfig = await getAgentConfigBatch("agent_chat_");

    // Base prompt: custom override or default
    const customPrompt = agentConfig["agent_chat_system_prompt"];
    let systemPrompt = customPrompt && customPrompt.trim().length > 0
      ? customPrompt
      : getBasePromptForMode(mode);

    systemPrompt += `\n\nSESSION CONTEXT:\n- Mode: ${mode}\n- Page: ${pagePath}\n- Role hint: ${roleHint}`;

    // Append tone instruction
    const tone = agentConfig["agent_chat_tone"];
    if (tone && tone !== "casual") {
      const toneMap: Record<string, string> = {
        professional: "\n\nTONE OVERRIDE: Respond in a professional, business-like tone. Avoid slang and casual language.",
        friendly: "\n\nTONE OVERRIDE: Be extra warm, encouraging, and approachable. Use the customer's name when possible.",
        firm: "\n\nTONE OVERRIDE: Be direct and authoritative. Keep responses concise and no-nonsense.",
      };
      systemPrompt += toneMap[tone] ?? "";
    }

    // Append response length guidance
    const responseLength = agentConfig["agent_chat_max_response_length"];
    if (responseLength && responseLength !== "short") {
      const lengthMap: Record<string, string> = {
        medium: "\n\nRESPONSE LENGTH: Provide 2-4 sentence responses. Give helpful detail without over-explaining.",
        long: "\n\nRESPONSE LENGTH: Provide detailed, thorough responses when the topic warrants it.",
      };
      systemPrompt += lengthMap[responseLength] ?? "";
    }

    // Append escalation threshold override
    const threshold = agentConfig["agent_chat_escalation_threshold"];
    if (threshold && threshold !== "500") {
      systemPrompt += `\n\nESCALATION: Flag items estimated above $${threshold} for staff review (instead of default $500).`;
    }

    // Append additional rules
    const rules = agentConfig["agent_chat_rules"];
    if (rules && rules.trim().length > 0) {
      systemPrompt += `\n\nADDITIONAL RULES (from store owner):\n${rules}`;
    }

    // Append special info / announcements
    const specialInfo = agentConfig["agent_chat_special_info"];
    if (specialInfo && specialInfo.trim().length > 0) {
      systemPrompt += `\n\nCURRENT SPECIAL INFORMATION (from store owner — reference when relevant):\n${specialInfo}`;
    }

    const chatGreeting = agentConfig["agent_chat_greeting"];
    if (chatGreeting && chatGreeting.trim().length > 0 && userMessages.length <= 1) {
      systemPrompt += `\n\nGREETING OVERRIDE:\nIf this is the user's first interaction in this session, open with this exact greeting:\n"${chatGreeting.trim()}"`;
    } else if (userMessages.length <= 1) {
      systemPrompt += `\n\nDEFAULT OPENING:\nFor a new session, introduce yourself as Merrill Vault Assistant.`;
    }

    console.log(`\n📋 SYSTEM PROMPT (first 300 chars):`);
    console.log(`   ${systemPrompt.substring(0, 300)}${systemPrompt.length > 300 ? '...' : ''}`);

    const baseMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];

    const lastUserMessage = [...userMessages].reverse().find((message) => message.role === "user");
    const previousAssistantMessage = [...userMessages].reverse().find((message) => message.role === "assistant");
    const parsedFormData = typeof lastUserMessage?.content === "string"
      ? parseSubmittedFormData(lastUserMessage.content)
      : null;
    const schedulePayload = parsedFormData ? extractScheduleSubmission(parsedFormData) : null;
    const lastUserText = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";
    const inventoryRequestedIndex = inferInventoryRequestedIndex(
      lastUserText,
      typeof previousAssistantMessage?.content === "string" ? previousAssistantMessage.content : null,
    );
    const inventoryDetailLevel = inferInventoryDetailLevel(lastUserText);

    if (schedulePayload) {
      const scheduleToolCall: ToolCall = {
        id: `direct_schedule_${Date.now()}`,
        type: "function",
        function: {
          name: "schedule_visit",
          arguments: JSON.stringify(schedulePayload),
        },
      };

      const scheduleResult = (await handleToolCall(scheduleToolCall, req)) as ScheduleVisitToolResult;
      const smsSuccess = scheduleResult.sms_status?.success === true;
      const finalText = scheduleResult.scheduled
        ? smsSuccess
          ? `Appointment confirmed for ${schedulePayload.preferred_time}. Confirmation code: ${scheduleResult.confirmation_code}. We sent your SMS details now.`
          : `Appointment confirmed for ${schedulePayload.preferred_time}. Confirmation code: ${scheduleResult.confirmation_code}. SMS failed to send, so please call (904) 650-3007 if you need updates.`
        : "I couldn't finalize your appointment yet. Please retry or call (904) 650-3007 and we’ll book it manually.";

      const now = new Date().toISOString();
      const unifiedConversation = createUnifiedConversationRecord({
        conversation_id: conversationId,
        source: mode === "appraisal" ? "appraise" : "web_chat",
        channel: "web",
        messages: [...userMessages, { role: "assistant", content: finalText }] as unknown as Array<Record<string, unknown>>,
        started_at: now,
        ended_at: now,
        source_metadata: {
          mode,
          page_path: pagePath,
          role_hint: roleHint,
          auto_schedule_from_form: true,
        },
      });

      await putItem(TABLES.conversations, unifiedConversation);

      const response = streamTextResponse(finalText);
      response.headers.set("X-Conversation-ID", conversationId);
      return response;
    }

    console.log(`\n🤖 LLM CALL #1 (without tool results)`);
    const first = await createChatCompletion(baseMessages);
    const assistantMessage = first.choices?.[0]?.message as {
      content?: string | null;
      tool_calls?: ToolCall[];
      role?: "assistant";
    };

    let finalText = assistantMessage?.content ?? "";
    console.log(`   Response: "${finalText?.substring(0, 150)}${finalText && finalText.length > 150 ? '...' : ''}"`);

    const toolCalls = assistantMessage?.tool_calls ?? [];
    console.log(`   Tool calls requested: ${toolCalls.length}`);
    
    if (toolCalls.length > 0) {
      const toolMessages: ChatMessage[] = [];
      let inventoryImageUrl: string | null = null;
      let inventorySelectedItem: Record<string, unknown> | null = null;
      let inventoryDirectText: string | null = null;
      let inventoryImageText: string | null = null;
      const hasOnlyInventoryTools = toolCalls.every((call) => call.function.name === "check_inventory");
      let hadInventoryToolCall = false;

      for (const call of toolCalls) {
        const result = await handleToolCall(call, req);
        
        // Special handling for form requests - return directly to frontend
        if (call.function.name === "request_form" && (result as { __form_request?: boolean }).__form_request) {
          console.log(`   ✓ Form request detected, returning to frontend`);
          // Save conversation state before returning form
          const now = new Date().toISOString();
          const formConversation = createUnifiedConversationRecord({
            conversation_id: conversationId,
            source: mode === "appraisal" ? "appraise" : "web_chat",
            channel: "web",
            messages: [...userMessages, { role: "assistant", content: "[Form Request]" }] as unknown as Array<Record<string, unknown>>,
            started_at: now,
            ended_at: now,
            source_metadata: {
              mode,
              page_path: pagePath,
              role_hint: roleHint,
            },
          });
          await putItem(TABLES.conversations, formConversation);

          // Return form spec as JSON for frontend to parse
          const response = streamTextResponse(JSON.stringify(result));
          response.headers.set("X-Conversation-ID", conversationId);
          return response;
        }

        // Special handling for inventory results with images
        if (call.function.name === "check_inventory" && (result as { __inventory_results?: boolean }).__inventory_results) {
          hadInventoryToolCall = true;
          const invResult = result as InventoryToolResult;
          const topMatches = Array.isArray(invResult.top_matches) ? invResult.top_matches : [];
          const selectedIndex = clampInventoryIndex(inventoryRequestedIndex, topMatches.length);
          const selectedItem = topMatches[selectedIndex];
          const selectedImage = selectedItem ? extractDisplayImage(selectedItem) : null;

          if (selectedImage) {
            inventoryImageUrl = selectedImage;
            inventorySelectedItem = selectedItem ?? null;
            inventoryImageText = formatInventoryImageReply(invResult, inventoryRequestedIndex, inventoryDetailLevel, lastUserText);
          } else if (invResult.display_image) {
            inventoryImageUrl = invResult.display_image;
            inventorySelectedItem = selectedItem ?? null;
            inventoryImageText = formatInventoryImageReply(invResult, inventoryRequestedIndex, inventoryDetailLevel, lastUserText);
          }
          inventoryDirectText = formatInventoryResponseWithSelection(invResult, inventoryRequestedIndex, lastUserText);
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        } as ChatMessage);
      }

      if (hasOnlyInventoryTools && inventoryDirectText) {
        finalText = inventoryDirectText;
      } else {
        console.log(`\n🤖 LLM CALL #2 (with tool results)`);
        console.log(`   Inventory image URL before 2nd call: "${inventoryImageUrl || 'NULL/UNDEFINED'}"`);

        const inventoryTruthGuard: ChatMessage | null = hadInventoryToolCall
          ? {
              role: "system",
              content:
                "Tool results are authoritative. If check_inventory returned items, do not claim you lack access or that inventory is unavailable. Summarize the returned matches clearly.",
            }
          : null;

        const second = await createChatCompletion(
          [
            ...baseMessages,
            ...(inventoryTruthGuard ? [inventoryTruthGuard] : []),
            {
              role: "assistant",
              content: assistantMessage?.content ?? "",
              tool_calls: toolCalls,
            } as ChatMessage,
            ...toolMessages,
          ],
        );

        finalText =
          second.choices?.[0]?.message?.content ??
          finalText ??
          "Thanks for reaching out to USA Pawn Holdings. How can I help next?";
      }
      
      console.log(`   Final response: "${finalText?.substring(0, 150)}${finalText && finalText.length > 150 ? '...' : ''}"`);
      
      // If we have an inventory image, return special response with image URL
      if (inventoryImageUrl) {
        if (inventoryImageText) {
          finalText = inventoryImageText;
        }
        console.log(`   ✓ Inventory image attached: ${inventoryImageUrl}`);
        const responseWithImage = JSON.stringify({
          __with_image: true,
          content: finalText,
          image_url: inventoryImageUrl,
          product_item: inventorySelectedItem,
        });

        const now = new Date().toISOString();
        const imageConversation = createUnifiedConversationRecord({
          conversation_id: conversationId,
          source: mode === "appraisal" ? "appraise" : "web_chat",
          channel: "web",
          messages: [...userMessages, { role: "assistant", content: finalText, image_url: inventoryImageUrl }] as unknown as Array<Record<string, unknown>>,
          started_at: now,
          ended_at: now,
          source_metadata: {
            mode,
            page_path: pagePath,
            role_hint: roleHint,
          },
        });
        await putItem(TABLES.conversations, imageConversation);
        
        const response = streamTextResponse(responseWithImage);
        response.headers.set("X-Conversation-ID", conversationId);
        console.log(`${'='.repeat(70)}\n`);
        return response;
      }
    }

    // Save complete conversation with all messages + response
    const completeMessages = [
      ...userMessages,
      {
        role: "assistant",
        content: finalText,
      },
    ];

    console.log(`\n✅ FINAL RESPONSE: "${finalText?.substring(0, 150)}${finalText && finalText.length > 150 ? '...' : ''}"`);
    console.log(`💾 SAVING conversation ${conversationId} with ${completeMessages.length} messages to DynamoDB`);

    const now = new Date().toISOString();
    const unifiedConversation = createUnifiedConversationRecord({
      conversation_id: conversationId,
      source: mode === "appraisal" ? "appraise" : "web_chat",
      channel: "web",
      messages: completeMessages as unknown as Array<Record<string, unknown>>,
      started_at: now,
      ended_at: now,
      source_metadata: {
        mode,
        page_path: pagePath,
        role_hint: roleHint,
      },
    });

    await putItem(TABLES.conversations, unifiedConversation);
    console.log(`✅ Conversation ${conversationId} saved successfully`);
    console.log(`${'='.repeat(70)}\n`);

    const response = streamTextResponse(finalText || "How can I help you today?");
    response.headers.set("X-Conversation-ID", conversationId);
    return response;
  } catch (error) {
    // Log error for debugging but don't save empty error conversations to DB
    console.error(`❌ ERROR in chat POST:`, error);
    console.log(`${'='.repeat(70)}\n`);

    const response = streamTextResponse(
      "I'm having trouble right now, but I can still help if you try again in a moment.",
    );
    response.headers.set("X-Conversation-ID", conversationId);
    return response;
  }
}
