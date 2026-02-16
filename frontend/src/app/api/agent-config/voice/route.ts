import { NextResponse } from "next/server";
import { getAgentConfig, getAgentConfigBatch } from "@/lib/agent-config";
import { STORE_HOURS } from "@/lib/constants";
import { getStoreStatusInEastern } from "@/lib/store-status";

/* ──────────────────────────────────────────────────────
   GET /api/agent-config/voice
   
   Returns the fully-assembled voice agent system prompt.
  Called by the deployed voice server on each new call
   (with 5-minute caching).
   
   Logic:
   1. Start with Chat Agent base prompt (shared brain)
   2. Layer on voice-specific overrides from DynamoDB
   3. Append chat's tone/rules/special-info if they exist
   
   This means adjusting Chat Agent settings on the dashboard
   automatically flows into the voice agent's instructions.
   ────────────────────────────────────────────────────── */

const DEFAULT_CHAT_PROMPT = `You are the AI assistant for USA Pawn Holdings in Jacksonville, FL.

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
- Loan info (25% interest, 30 days, usually 25-33% of resale value)
- Spot prices (gold/silver/platinum)

Rules:
- NEVER invent prices — use spot price API + weight estimate
- Escalate items >$500 to staff
- Be upfront about loan terms`;

const DEFAULT_VOICE_ADDENDUM = `
VOICE CHANNEL INSTRUCTIONS (you are on a phone call, not text chat):
- You are answering the phone. Speak naturally as if having a real conversation.
- Keep responses SHORT — 1-2 sentences max. Long monologues are painful on the phone.
- Do NOT reference web links, URLs, or "/appraise" pages — the caller can't click.
- Instead, say "text a photo of the item to this number" for appraisals.
- If someone wants to schedule a visit, take their name and preferred day/time.
- If asked about something you can't help with, offer to take a message (name + number).

GREETING (first thing you say):
"Thanks for calling USA Pawn Holdings! I'm the AI assistant and I'd be happy to help. What can I do for you?"

CLOSING:
When wrapping up, say: "Thanks for calling! Remember, you can text a photo of any item to this number for an instant estimate. Have a great night!"`;

export async function GET() {
  try {
    const storeStatus = getStoreStatusInEastern(STORE_HOURS);
    const statusContext = [
      "REAL-TIME STORE STATUS (authoritative):",
      `- Time zone: ${storeStatus.timezone}`,
      `- Current local time: ${storeStatus.now_label}`,
      `- Today's schedule: ${storeStatus.today_schedule}`,
      `- Open now: ${storeStatus.open ? "Yes" : "No"}`,
      `- Customer-facing status line: ${storeStatus.message}`,
      "- Never claim the store is closed unless this status block says Open now: No.",
    ].join("\n");

    // Fetch all chat + voice config from DynamoDB in parallel
    const [chatConfig, voiceConfig] = await Promise.all([
      getAgentConfigBatch("agent_chat_"),
      getAgentConfigBatch("agent_voice_"),
    ]);

    // ── 1. Base prompt: custom chat override or default ──
    const basePrompt =
      chatConfig["agent_chat_system_prompt"]?.trim() || DEFAULT_CHAT_PROMPT;

    // ── 2. Voice addendum: custom override or default ──
    const voiceAddendum =
      voiceConfig["agent_voice_addendum"]?.trim() || DEFAULT_VOICE_ADDENDUM;

    // ── 3. Full voice override (skips everything above) ──
    const voiceFullOverride =
      voiceConfig["agent_voice_system_prompt"]?.trim() || "";

    // If there's a full override, use that directly
    if (voiceFullOverride) {
      return NextResponse.json(
        {
          system_prompt: `${voiceFullOverride}\n\n${statusContext}`,
          voice: voiceConfig["agent_voice_voice"] || "alloy",
          temperature: parseFloat(voiceConfig["agent_voice_temperature"] || "0.8"),
          source: "full_override",
        },
        {
          headers: { "Cache-Control": "public, max-age=300" }, // 5-min cache
        }
      );
    }

    // ── 4. Assemble from pieces ──
    const parts = [basePrompt, voiceAddendum, statusContext];

    // Inject chat tone if set
    const tone = chatConfig["agent_chat_tone"];
    if (tone && tone !== "casual") {
      parts.push(`\nTONE: Speak in a ${tone} manner.`);
    }

    // Inject chat rules if set
    const rules = chatConfig["agent_chat_rules"]?.trim();
    if (rules) {
      parts.push(`\nADDITIONAL RULES:\n${rules}`);
    }

    // Inject special info (promotions, closures, etc.)
    const specialInfo = chatConfig["agent_chat_special_info"]?.trim();
    if (specialInfo) {
      parts.push(`\nCURRENT SPECIAL INFO (mention if relevant):\n${specialInfo}`);
    }

    // Inject voice-specific rules if set
    const voiceRules = voiceConfig["agent_voice_rules"]?.trim();
    if (voiceRules) {
      parts.push(`\nVOICE-SPECIFIC RULES:\n${voiceRules}`);
    }

    // Inject escalation threshold
    const threshold = chatConfig["agent_chat_escalation_threshold"] || "500";
    parts.push(`\nESCALATION: If an item seems worth more than $${threshold}, take their info and flag for manager follow-up.`);

    const assembledPrompt = parts.join("\n");

    return NextResponse.json(
      {
        system_prompt: assembledPrompt,
        voice: voiceConfig["agent_voice_voice"] || "alloy",
        temperature: parseFloat(voiceConfig["agent_voice_temperature"] || "0.8"),
        source: "assembled",
      },
      {
        headers: { "Cache-Control": "public, max-age=300" },
      }
    );
  } catch (err) {
    console.error("Failed to build voice prompt:", err);

    const fallbackStatus = getStoreStatusInEastern(STORE_HOURS);
    const fallbackStatusContext = [
      "REAL-TIME STORE STATUS (authoritative):",
      `- Time zone: ${fallbackStatus.timezone}`,
      `- Current local time: ${fallbackStatus.now_label}`,
      `- Today's schedule: ${fallbackStatus.today_schedule}`,
      `- Open now: ${fallbackStatus.open ? "Yes" : "No"}`,
      `- Customer-facing status line: ${fallbackStatus.message}`,
      "- Never claim the store is closed unless this status block says Open now: No.",
    ].join("\n");

    // Fallback: return the hardcoded defaults so calls never fail
    return NextResponse.json(
      {
        system_prompt: `${DEFAULT_CHAT_PROMPT}${DEFAULT_VOICE_ADDENDUM}\n\n${fallbackStatusContext}`,
        voice: "alloy",
        temperature: 0.8,
        source: "fallback",
      },
      { status: 200 }
    );
  }
}
