import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { TABLES, putItem, scanItems, deleteItem } from "@/lib/dynamodb";
import { createUnifiedConversationRecord } from "@/lib/conversation-model";
import { analyzeImage, analyzeImages } from "@/lib/openai";
import { getAgentConfigBatch } from "@/lib/agent-config";

type AppraiseRequestBody = {
  photoUrl?: string;
  photoUrls?: string[];
  photoLabels?: string[];
  description?: string;
  category: string;
  transaction_type?: 'pawn' | 'sell';
};

function extractNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function extractCondition(text: string): "excellent" | "good" | "fair" {
  if (/excellent/i.test(text)) {
    return "excellent";
  }
  if (/fair|poor/i.test(text)) {
    return "fair";
  }
  return "good";
}

function estimateRetailValue(analysisText: string): number {
  const direct = extractNumber(analysisText, /\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  if (direct) {
    return direct;
  }

  const rangeTop = extractNumber(analysisText, /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:usd|dollars)/i);
  if (rangeTop) {
    return rangeTop;
  }

  return 500;
}

function inferMetalType(category: string, text: string): "gold" | "silver" | "platinum" | "unknown" {
  const haystack = `${category} ${text}`.toLowerCase();
  if (haystack.includes("platinum")) {
    return "platinum";
  }
  if (haystack.includes("silver") || haystack.includes("sterling")) {
    return "silver";
  }
  if (haystack.includes("gold") || haystack.includes("14k") || haystack.includes("18k") || haystack.includes("10k")) {
    return "gold";
  }
  return "unknown";
}

function inferPurity(text: string): number {
  if (/24k/i.test(text)) {
    return 0.999;
  }
  if (/18k/i.test(text)) {
    return 0.75;
  }
  if (/14k/i.test(text)) {
    return 0.585;
  }
  if (/10k/i.test(text)) {
    return 0.417;
  }
  return 0.75;
}

async function fetchGoldPrices(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/gold-price`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("gold-price route unavailable");
    }
    return (await response.json()) as { gold: number; silver: number; platinum: number };
  } catch {
    return { gold: 2050, silver: 24.5, platinum: 950 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AppraiseRequestBody;
    const transactionType = body.transaction_type || 'pawn';

    // Support both single photo (legacy) and multi-photo
    const photoUrls: string[] = body.photoUrls ?? (body.photoUrl ? [body.photoUrl] : []);
    const photoLabels: string[] = body.photoLabels ?? [];

    if (photoUrls.length === 0 || !body?.category) {
      return NextResponse.json(
        { error: "Missing required fields: at least one photo and category" },
        { status: 400 },
      );
    }

    // Build a richer prompt when multiple photos are provided
    const photoCount = photoUrls.length;
    const labelContext = photoLabels.length > 0
      ? `\nThe customer provided ${photoCount} photo(s) labeled: ${photoLabels.join(", ")}.`
      : `\nThe customer provided ${photoCount} photo(s).`;

    const descContext = body.description
      ? `\nCustomer description: "${body.description}"`
      : "";

    const prompt = `Analyze this item for pawn shop appraisal. ${photoCount > 1 ? `You have ${photoCount} photos showing different angles.` : ""}${labelContext}${descContext}

Identify: item type, brand/model, condition, approximate weight (if jewelry/precious metal), materials, retail value estimate range. Be specific and thorough.`;

    // ── Build dynamic system message from agent config ──
    const appraisalConfig = await getAgentConfigBatch("agent_appraisal_");

    let appraisalSystemMessage: string | undefined;

    // Custom override or default
    const customPrompt = appraisalConfig["agent_appraisal_system_prompt"];
    if (customPrompt && customPrompt.trim().length > 0) {
      appraisalSystemMessage = customPrompt;
    } else {
      appraisalSystemMessage = `You are an expert appraiser for USA Pawn Holdings analyzing an item for ${transactionType === 'sell' ? 'SALE' : 'PAWN'}. 

For SALE: Estimate retail/market resale value. This is what a customer would get outright in cash. Consider buyer appeal and market demand. Use higher estimates based on comparable sales.

For PAWN: Estimate conservative collateral value. This is a short-term loan against the item. Prioritize safety and recovery value. Be conservative; customer gets item back if they repay.

Be specific and thorough. When uncertain, state your confidence level. Always consider current market conditions.`;
    }

    // Append conservatism guidance
    const conservatism = appraisalConfig["agent_appraisal_conservatism"];
    if (conservatism && conservatism !== "moderate") {
      const conservatismMap: Record<string, string> = {
        conservative: "\n\nPRICING STANCE: Be conservative with value estimates. Err on the lower side to protect store margins. Focus on potential defects and depreciation.",
        generous: "\n\nPRICING STANCE: Be competitive with value estimates. Highlight positive features and give benefit of the doubt on condition when unclear.",
      };
      appraisalSystemMessage += conservatismMap[conservatism] ?? "";
    }

    // Append priority categories
    const focusCats = appraisalConfig["agent_appraisal_focus_categories"];
    if (focusCats && focusCats.trim().length > 0) {
      appraisalSystemMessage += `\n\nPRIORITY CATEGORIES: Pay extra attention to: ${focusCats}. Provide more detailed analysis for these item types.`;
    }

    // Append custom rules
    const appraisalRules = appraisalConfig["agent_appraisal_rules"];
    if (appraisalRules && appraisalRules.trim().length > 0) {
      appraisalSystemMessage += `\n\nADDITIONAL RULES:\n${appraisalRules}`;
    }

    // Append market notes
    const marketNotes = appraisalConfig["agent_appraisal_special_info"];
    if (marketNotes && marketNotes.trim().length > 0) {
      appraisalSystemMessage += `\n\nCURRENT MARKET NOTES:\n${marketNotes}`;
    }

    const vision = photoUrls.length === 1
      ? await analyzeImage(photoUrls[0], prompt, appraisalSystemMessage)
      : await analyzeImages(photoUrls, prompt, appraisalSystemMessage);

    const content = vision.choices?.[0]?.message?.content;
    const analysisText = typeof content === "string"
      ? content
      : "Unable to parse analysis.";

    const category = body.category.toLowerCase();
    const jewelryLike = /(jewel|gold|silver|platinum|ring|chain|watch)/i.test(category);
    const retailEstimate = estimateRetailValue(analysisText);

    let estimatedValue = 0;
    let valueRange = "0-0";
    let metalType: "gold" | "silver" | "platinum" | "unknown" = "unknown";

    // Adjust pawn value multiplier based on conservatism setting
    const conservatismFactor = conservatism === "conservative" ? 0.85 : conservatism === "generous" ? 1.15 : 1.0;

    if (jewelryLike) {
      const metalPrices = await fetchGoldPrices(req.nextUrl.origin);
      metalType = inferMetalType(category, analysisText);
      const purity = inferPurity(analysisText);

      const gramsFromText = extractNumber(analysisText, /([0-9]+(?:\.[0-9]+)?)\s?g/i);
      const weightGrams = gramsFromText ?? 10;
      const weightOunces = weightGrams / 31.1034768;

      const selectedSpot =
        metalType === "silver"
          ? metalPrices.silver
          : metalType === "platinum"
            ? metalPrices.platinum
            : metalPrices.gold;

      const scrapValue = weightOunces * selectedSpot * purity * 0.3 * conservatismFactor;
      const maxValue = retailEstimate * 0.33 * conservatismFactor;
      const low = Math.max(1, Math.round(scrapValue));
      const high = Math.max(low, Math.round(maxValue));

      estimatedValue = Math.round((low + high) / 2);
      valueRange = `${low}-${high}`;
    } else {
      const condition = extractCondition(analysisText);
      const pctRange =
        condition === "excellent" ? [0.3, 0.4] : condition === "good" ? [0.2, 0.3] : [0.1, 0.2];

      const low = Math.max(1, Math.round(retailEstimate * pctRange[0] * conservatismFactor));
      const high = Math.max(low, Math.round(retailEstimate * pctRange[1] * conservatismFactor));

      estimatedValue = Math.round((low + high) / 2);
      valueRange = `${low}-${high}`;
    }

    // ── Apply haircut (breathing room for negotiations) ──
    const haircutRaw = appraisalConfig["agent_appraisal_haircut"];
    const haircutAmount = Math.max(0, Number(haircutRaw) || 0);
    if (haircutAmount > 0) {
      const [rangeLowStr, rangeHighStr] = valueRange.split("-");
      const adjLow = Math.max(1, Number(rangeLowStr) - haircutAmount);
      const adjHigh = Math.max(adjLow, Number(rangeHighStr) - haircutAmount);
      estimatedValue = Math.max(1, estimatedValue - haircutAmount);
      valueRange = `${adjLow}-${adjHigh}`;
    }

    const appraisalId = randomUUID();
    const now = new Date().toISOString();
    const primaryPhotoUrl = photoUrls[0] ?? null;
    
    // Truncate description to fit within DynamoDB 400KB item limit
    const maxDescriptionLength = 500;
    
    const truncatedDescription = (body.description ?? "").length > maxDescriptionLength
      ? (body.description ?? "").substring(0, maxDescriptionLength) + "..."
      : body.description ?? "";

    // Store minimal data in DynamoDB (don't store analysis_text as it's too large)
    await putItem(TABLES.appraisals, {
      appraisal_id: appraisalId,
      item_category: body.category,
      metal_type: metalType === "unknown" ? undefined : metalType,
      estimated_value: estimatedValue,
      value_range: valueRange,
      timestamp: now,
      description: truncatedDescription,
      photo_count: photoUrls.length,
      photo_url: primaryPhotoUrl,
    });

    const appraisalConversation = createUnifiedConversationRecord({
      conversation_id: `appraise_${appraisalId}`,
      source: "appraise",
      channel: "appraise",
      started_at: now,
      ended_at: now,
      metadata: {
        event: "appraise_submission",
        appraisal_id: appraisalId,
        item_category: body.category,
      },
      source_metadata: {
        photo_count: photoUrls.length,
        labels: photoLabels,
      },
      messages: [
        {
          role: "user",
          content: `Appraisal request for ${body.category}. Description: ${truncatedDescription || "(none)"}. Photos: ${photoUrls.length}.`,
          timestamp: now,
        },
        {
          role: "assistant",
          content: `Estimated value range: $${valueRange}. ${analysisText}`,
          timestamp: now,
        },
      ],
    });

    await putItem(TABLES.conversations, appraisalConversation);

    return NextResponse.json({
      appraisal_id: appraisalId,
      photo_url: primaryPhotoUrl,
      item_category: body.category,
      metal_type: metalType,
      estimated_value: estimatedValue,
      value_range: valueRange,
      explanation: analysisText,
      next_steps: "Visit us at 6132 Merrill Rd to get your official offer!",
      confidence: "medium",
    });
  } catch (error) {
    console.error("Appraisal error:", error);
    return NextResponse.json(
      {
        error: "Unable to complete appraisal right now.",
        next_steps: "Visit us at 6132 Merrill Rd to get your official offer!",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const clearAll = params.get('clear_all') === 'true';
    const appraisalId = params.get('appraisal_id');

    if (clearAll) {
      // Clear appraisal metadata from appraisals table
      const appraisals = await scanItems<Record<string, unknown>>(TABLES.appraisals);
      let deletedAppraisals = 0;
      for (const appraisal of appraisals) {
        await deleteItem(TABLES.appraisals, { appraisal_id: appraisal.appraisal_id });
        deletedAppraisals++;
      }

      // Also clear appraisal leads from leads table (source='appraise_page')
      const allLeads = await scanItems<Record<string, unknown>>(TABLES.leads);
      const appraisalLeads = allLeads.filter((lead) => lead.source === 'appraise_page');
      let deletedLeads = 0;
      for (const lead of appraisalLeads) {
        await deleteItem(TABLES.leads, { lead_id: lead.lead_id });
        deletedLeads++;
      }

      return NextResponse.json({ 
        success: true, 
        deleted: deletedAppraisals, 
        deleted_leads: deletedLeads,
        message: `Cleared ${deletedAppraisals} appraisals and ${deletedLeads} appraisal leads` 
      });
    }

    if (appraisalId) {
      await deleteItem(TABLES.appraisals, { appraisal_id: appraisalId });
      return NextResponse.json({ success: true, appraisal_id: appraisalId });
    }

    return NextResponse.json({ error: 'Provide appraisal_id or clear_all=true' }, { status: 400 });
  } catch (error) {
    console.error("Delete appraisal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete appraisals" },
      { status: 500 },
    );
  }
}
