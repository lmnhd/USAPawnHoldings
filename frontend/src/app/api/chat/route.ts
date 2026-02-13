import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { CATEGORY_TAGS, STORE_HOURS, VAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { TABLES, putItem, scanItems } from "@/lib/dynamodb";
import { ChatMessage, createChatCompletion } from "@/lib/openai";
import { sendSMS } from "@/lib/twilio";
import { getAgentConfigBatch } from "@/lib/agent-config";

type ChatRequestBody = {
  messages: ChatMessage[];
  conversationId?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

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
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const schedule = STORE_HOURS[weekday as keyof typeof STORE_HOURS] ?? "Closed";

  if (schedule.toLowerCase() === "closed") {
    return { open: false, message: "Store is currently closed." };
  }

  const [openRaw, closeRaw] = schedule.split(" - ");
  const today = now.toLocaleDateString("en-US");
  const open = new Date(`${today} ${openRaw}`);
  const close = new Date(`${today} ${closeRaw}`);
  const isOpen = now >= open && now <= close;

  return {
    open: isOpen,
    message: isOpen ? `We are open now until ${closeRaw}.` : `We are currently closed and open at ${openRaw}.`,
  };
}

async function handleToolCall(toolCall: ToolCall, req: NextRequest) {
  const args = (() => {
    try {
      return JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      return {};
    }
  })() as Record<string, unknown>;

  switch (toolCall.function.name) {
    case "appraise_item": {
      return {
        message:
          "For the most accurate appraisal, please continue on /appraise or upload a clear photo with item details.",
        category: args.category ?? null,
      };
    }

    case "schedule_visit": {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const phone = String(args.phone ?? "");
      const preferredTime = String(args.preferred_time ?? "your requested time");

      const smsBody = `USA Pawn Holdings appointment confirmed for ${preferredTime}. Confirmation: ${code}. Visit us at 6132 Merrill Rd Ste 1, Jacksonville, FL 32277.`;
      const sms = await sendSMS(phone, smsBody);

      return {
        scheduled: true,
        confirmation_code: code,
        sms_status: sms,
      };
    }

    case "check_inventory": {
      const category = String(args.category ?? "").toLowerCase();
      const keyword = String(args.keyword ?? "").toLowerCase();

      const all = await scanItems<Record<string, unknown>>(TABLES.inventory);
      const filtered = all.filter((item) => {
        const itemCategory = String(item.category ?? "").toLowerCase();
        const brand = String(item.brand ?? "").toLowerCase();
        const description = String(item.description ?? "").toLowerCase();

        const categoryMatch = !category || itemCategory.includes(category);
        const keywordMatch = !keyword || brand.includes(keyword) || description.includes(keyword);
        return categoryMatch && keywordMatch;
      });

      return {
        categories: CATEGORY_TAGS,
        count: filtered.length,
        top_matches: filtered.slice(0, 5),
      };
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
        source: String(args.source ?? "web"),
        customer_name: String((args.customer_info as { name?: string } | undefined)?.name ?? ""),
        phone: String((args.customer_info as { phone?: string } | undefined)?.phone ?? ""),
        item_description: String(args.item_interest ?? ""),
        estimated_value: Number(args.estimated_value ?? 0),
        status: "new",
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
        item_description: String(args.reason ?? "Escalation requested"),
        estimated_value: Number(args.estimated_value ?? 0),
        priority: String(args.priority ?? "high"),
        status: "escalated",
        timestamp: new Date().toISOString(),
      });

      return { success: true, escalated: true, lead_id: leadId };
    }

    default:
      return { error: `Unsupported function: ${toolCall.function.name}` };
  }
}

export async function POST(req: NextRequest) {
  let conversationId: string = randomUUID();

  try {
    const body = (await req.json()) as ChatRequestBody;
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    conversationId = body.conversationId ?? conversationId;

    // ── Build dynamic system prompt from agent config ──
    const agentConfig = await getAgentConfigBatch("agent_chat_");

    // Base prompt: custom override or default
    const customPrompt = agentConfig["agent_chat_system_prompt"];
    let systemPrompt = customPrompt && customPrompt.trim().length > 0
      ? customPrompt
      : VAULT_SYSTEM_PROMPT;

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

    const baseMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];

    const first = await createChatCompletion(baseMessages);
    const assistantMessage = first.choices?.[0]?.message as {
      content?: string | null;
      tool_calls?: ToolCall[];
      role?: "assistant";
    };

    let finalText = assistantMessage?.content ?? "";

    const toolCalls = assistantMessage?.tool_calls ?? [];
    if (toolCalls.length > 0) {
      const toolMessages: ChatMessage[] = [];

      for (const call of toolCalls) {
        const result = await handleToolCall(call, req);
        toolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        } as ChatMessage);
      }

      const second = await createChatCompletion(
        [
          ...baseMessages,
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

    // Save complete conversation with all messages + response
    const completeMessages = [
      ...userMessages,
      {
        role: "assistant",
        content: finalText,
      },
    ];

    await putItem(TABLES.conversations, {
      conversation_id: conversationId,
      channel: "web",
      messages: completeMessages as unknown[],
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      message_count: completeMessages.length,
    });

    const response = streamTextResponse(finalText || "How can I help you today?");
    response.headers.set("X-Conversation-ID", conversationId);
    return response;
  } catch {
    await putItem(TABLES.conversations, {
      conversation_id: conversationId,
      channel: "web",
      messages: [],
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      error: "chat_processing_failed",
      message_count: 0,
    }).catch(() => undefined);

    const response = streamTextResponse(
      "I'm having trouble right now, but I can still help if you try again in a moment.",
    );
    response.headers.set("X-Conversation-ID", conversationId);
    return response;
  }
}
