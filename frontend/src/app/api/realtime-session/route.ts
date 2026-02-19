import { NextResponse } from "next/server";
import { getAgentConfigBatch } from "@/lib/agent-config";
import { STORE_HOURS, FUNCTION_TOOLS } from "@/lib/constants";
import { getStoreStatusInEastern } from "@/lib/store-status";

type RealtimeSessionRequest = {
  mode?: "general" | "appraisal" | "ops";
  conversationId?: string | null;
  pagePath?: string;
  roleHint?: "customer" | "staff_or_owner";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

/* ──────────────────────────────────────────────────────
   POST /api/realtime-session

   Creates an ephemeral OpenAI Realtime API session token
   for browser-based WebRTC voice chat. The browser uses
   the returned client_secret to negotiate a WebRTC
   connection directly with OpenAI — no relay server needed.

   The session is preconfigured with:
   - USA Pawn system prompt (shared brain with text chat)
   - Voice-optimized addendum for browser conversations
   - Tool definitions (schedule_visit, check_store_status)
   - Server VAD for turn detection
   ────────────────────────────────────────────────────── */

const DEFAULT_CHAT_PROMPT = `You are Merrill Vault Assistant, the AI assistant for USA Pawn Holdings in Jacksonville, FL.

CONVERSATION STYLE (CRITICAL):
- Keep every response SHORT: max 1-2 sentences
- Be warm and conversational, not formal
- Use natural language (contractions OK, casual tone)
- Only give detailed info if they ask for it

Store Info:
- Address: 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
- Phone: (904) 744-5611
- Hours: Mon-Fri 9 AM - 6 PM, Sat 9 AM - 5 PM, Sun Closed

What You Can Do:
- Quick appraisals and guidance
- Schedule in-store visits
- Check inventory availability (IMPORTANT: use check_inventory tool)
- Loan info (25% interest, 30 days, usually 25-33% of resale value)
- Spot prices (gold/silver/platinum)

Rules:
- NEVER invent prices — use spot price API + weight estimate
- Escalate items >$500 to staff
- Be upfront about loan terms`;

const BROWSER_VOICE_ADDENDUM = `
BROWSER VOICE CHAT INSTRUCTIONS:
- The user is speaking to you through their browser microphone.
- Keep responses SHORT — 1-2 sentences max. Natural and conversational.
- If someone wants an appraisal, tell them they can upload a photo on the website or describe the item.
- If someone wants to schedule a visit or you need 2+ related inputs, IMMEDIATELY use request_form instead of asking multiple sequential questions.
- After request_form returns, wait for submitted form data and then use schedule_visit.
- If asked about store hours, ALWAYS call the check_store_status tool first.
- If asked whether you have an item in stock, ALWAYS call check_inventory.
- Tool output is source-of-truth: if check_inventory returns count > 0, NEVER say inventory is unavailable or inaccessible.
- When inventory results are returned, keep it minimal: count + first match only, no long descriptions unless asked.
- After every inventory response, ask exactly one next-step question (for example: details, next match, or refine search).
- Never continue into long explanations unless the user asks for more detail.
- If the user asks to see the next item or another option, call check_inventory again before responding.

GREETING (first thing you say):
"Hey! I'm Merrill Vault Assistant for USA Pawn Holdings. What can I help you with?"

CLOSING:
When wrapping up, say: "Glad I could help! If you need anything else, just click the mic again. Have a great day!"`;

// Convert function_tools schema to OpenAI Realtime format
const VOICE_TOOLS = FUNCTION_TOOLS.map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
}));

async function buildSystemPrompt(context: RealtimeSessionRequest): Promise<string> {
  try {
    const storeStatus = getStoreStatusInEastern(STORE_HOURS);
    const statusContext = [
      "STORE HOURS REFERENCE:",
      `- Time zone: ${storeStatus.timezone}`,
      `- Approximate local time: ${storeStatus.now_label}`,
      `- Today's schedule: ${storeStatus.today_schedule}`,
      `- IMPORTANT: If a user asks whether the store is open/closed, ALWAYS call the check_store_status tool.`,
    ].join("\n");

    const [chatConfig, voiceConfig] = await Promise.all([
      getAgentConfigBatch("agent_chat_"),
      getAgentConfigBatch("agent_voice_"),
    ]);

    const basePrompt =
      chatConfig["agent_chat_system_prompt"]?.trim() || DEFAULT_CHAT_PROMPT;

    const parts = [basePrompt, BROWSER_VOICE_ADDENDUM, statusContext];

    const chatGreeting = chatConfig["agent_chat_greeting"]?.trim();
    const voiceGreeting = voiceConfig["agent_voice_greeting"]?.trim();
    const activeGreeting = voiceGreeting || chatGreeting;
    if (activeGreeting) {
      parts.push(`\nGREETING OVERRIDE:\nUse this exact opening greeting if this is the first assistant turn:\n"${activeGreeting}"`);
    }

    if (context.mode || context.pagePath || context.roleHint || context.conversationId) {
      parts.push(
        [
          "\nSESSION CONTEXT:",
          `- Mode: ${context.mode ?? "general"}`,
          `- Page: ${context.pagePath ?? "unknown"}`,
          `- Role hint: ${context.roleHint ?? "customer"}`,
          `- Conversation id: ${context.conversationId ?? "none"}`,
        ].join("\n")
      );
    }

    if (Array.isArray(context.history) && context.history.length > 0) {
      const trimmed = context.history.slice(-8);
      const historyText = trimmed
        .map((entry) => `- ${entry.role.toUpperCase()}: ${entry.content}`)
        .join("\n");
      parts.push(`\nRECENT CONVERSATION HISTORY (continue seamlessly):\n${historyText}`);
    }

    const tone = chatConfig["agent_chat_tone"];
    if (tone && tone !== "casual") {
      parts.push(`\nTONE: Speak in a ${tone} manner.`);
    }

    const rules = chatConfig["agent_chat_rules"]?.trim();
    if (rules) {
      parts.push(`\nADDITIONAL RULES:\n${rules}`);
    }

    const specialInfo = chatConfig["agent_chat_special_info"]?.trim();
    if (specialInfo) {
      parts.push(
        `\nCURRENT SPECIAL INFO (mention if relevant):\n${specialInfo}`
      );
    }

    const threshold = chatConfig["agent_chat_escalation_threshold"] || "500";
    parts.push(
      `\nESCALATION: If an item seems worth more than $${threshold}, take their info and flag for manager follow-up.`
    );

    return parts.join("\n");
  } catch (err) {
    console.error("Failed to build browser voice prompt:", err);
    const fallback = getStoreStatusInEastern(STORE_HOURS);
    return `${DEFAULT_CHAT_PROMPT}${BROWSER_VOICE_ADDENDUM}\n\nSTORE HOURS: ${fallback.today_schedule}`;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const context = (await req.json().catch(() => ({}))) as RealtimeSessionRequest;
    const systemPrompt = await buildSystemPrompt(context);

    // Request an ephemeral token from OpenAI for browser WebRTC
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: systemPrompt,
          tools: VOICE_TOOLS,
          tool_choice: "auto",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
          },
          modalities: ["text", "audio"],
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI session creation failed:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to create voice session", detail: errorText },
        { status: response.status }
      );
    }

    const session = await response.json();

    return NextResponse.json({
      client_secret: session.client_secret?.value,
      session_id: session.id,
      expires_at: session.client_secret?.expires_at,
    });
  } catch (err) {
    console.error("Realtime session error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
