import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { CATEGORY_TAGS, STORE_HOURS, VAULT_SYSTEM_PROMPT } from "@/lib/constants";
import { TABLES, putItem, scanItems } from "@/lib/dynamodb";
import { createUnifiedConversationRecord } from "@/lib/conversation-model";
import { ChatMessage, createChatCompletion } from "@/lib/openai";
import { sendSMS } from "@/lib/twilio";
import { getAgentConfigBatch } from "@/lib/agent-config";
import { getStoreStatusInEastern } from "@/lib/store-status";

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
  return getStoreStatusInEastern(STORE_HOURS);
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

      console.log(`   🔍 Searching inventory - Category: "${category}", Keyword: "${keyword}"`);

      const all = await scanItems<Record<string, unknown>>(TABLES.inventory);
      console.log(`   📦 Total inventory items in DB: ${all.length}`);

      // Debug: List first 3 items to see structure
      if (all.length > 0) {
        console.log(`   📋 Sample item structure:`, JSON.stringify(all[0], null, 2).substring(0, 500));
      }

      const filtered = all.filter((item) => {
        const itemCategory = String(item.category ?? "").toLowerCase();
        const brand = String(item.brand ?? "").toLowerCase();
        const description = String(item.description ?? "").toLowerCase();

        const categoryMatch = !category || itemCategory.includes(category);
        const keywordMatch = !keyword || 
                            brand.includes(keyword) || 
                            description.includes(keyword) ||
                            itemCategory.includes(keyword);
        
        return categoryMatch && keywordMatch;
      });

      console.log(`   ✓ Filtered results: ${filtered.length} items matching`);
      if (filtered.length > 0) {
        console.log(`   Top match: ${String(filtered[0].category)} - ${String(filtered[0].description)}`);
        console.log(`   Top match brand: "${String(filtered[0].brand ?? '')}"`);
        // Check both image_url (from seed) and images array (from UI)
        const imageField = filtered[0].image_url || (Array.isArray(filtered[0].images) && filtered[0].images[0]);
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

      const topMatches = filtered.slice(0, 5);
      
      // Return inventory items with a special flag for image display
      // Check both image_url (from seed script) and images array (from UI-created items)
      let displayImage: string | null = null;
      if (topMatches.length > 0) {
        const firstItem = topMatches[0];
        displayImage = String(firstItem.image_url ?? "") || 
                      (Array.isArray(firstItem.images) && firstItem.images.length > 0 ? String(firstItem.images[0]) : null);
      }
      console.log(`   📸 Display image for response: "${displayImage || 'NONE'}"`);
      
      const result = {
        __inventory_results: true,
        categories: CATEGORY_TAGS,
        count: filtered.length,
        top_matches: topMatches,
        // Include image from first match for chat display
        display_image: displayImage,
        display_summary: topMatches.length > 0 
          ? `Found ${filtered.length} item${filtered.length !== 1 ? 's' : ''} matching your search. Top result: ${String(topMatches[0].category ?? "")} - ${String(topMatches[0].description ?? "")}`
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

    console.log(`\n📋 SYSTEM PROMPT (first 300 chars):`);
    console.log(`   ${systemPrompt.substring(0, 300)}${systemPrompt.length > 300 ? '...' : ''}`);

    const baseMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];

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

      for (const call of toolCalls) {
        const result = await handleToolCall(call, req);
        
        // Special handling for form requests - return directly to frontend
        if (call.function.name === "request_form" && (result as { __form_request?: boolean }).__form_request) {
          console.log(`   ✓ Form request detected, returning to frontend`);
          // Save conversation state before returning form
          const now = new Date().toISOString();
          const formConversation = createUnifiedConversationRecord({
            conversation_id: conversationId,
            source: "web_chat",
            channel: "web",
            messages: [...userMessages, { role: "assistant", content: "[Form Request]" }] as unknown as Array<Record<string, unknown>>,
            started_at: now,
            ended_at: now,
          });
          await putItem(TABLES.conversations, formConversation);

          // Return form spec as JSON for frontend to parse
          const response = streamTextResponse(JSON.stringify(result));
          response.headers.set("X-Conversation-ID", conversationId);
          return response;
        }

        // Special handling for inventory results with images
        if (call.function.name === "check_inventory" && (result as { __inventory_results?: boolean }).__inventory_results) {
          const invResult = result as { display_image?: string | null };
          if (invResult.display_image) {
            inventoryImageUrl = invResult.display_image;
          }
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        } as ChatMessage);
      }

      console.log(`\n🤖 LLM CALL #2 (with tool results)`);
      console.log(`   Inventory image URL before 2nd call: "${inventoryImageUrl || 'NULL/UNDEFINED'}"`);
      
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
      
      console.log(`   Final response: "${finalText?.substring(0, 150)}${finalText && finalText.length > 150 ? '...' : ''}"`);
      
      // If we have an inventory image, return special response with image URL
      if (inventoryImageUrl) {
        console.log(`   ✓ Inventory image attached: ${inventoryImageUrl}`);
        const responseWithImage = JSON.stringify({
          __with_image: true,
          content: finalText,
          image_url: inventoryImageUrl,
        });

        const now = new Date().toISOString();
        const imageConversation = createUnifiedConversationRecord({
          conversation_id: conversationId,
          source: "web_chat",
          channel: "web",
          messages: [...userMessages, { role: "assistant", content: finalText, image_url: inventoryImageUrl }] as unknown as Array<Record<string, unknown>>,
          started_at: now,
          ended_at: now,
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
      source: "web_chat",
      channel: "web",
      messages: completeMessages as unknown as Array<Record<string, unknown>>,
      started_at: now,
      ended_at: now,
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
