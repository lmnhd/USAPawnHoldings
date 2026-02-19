import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import OpenAI from "openai";
import { TABLES, putItem } from "@/lib/dynamodb";
import { createUnifiedConversationRecord } from "@/lib/conversation-model";

// ─────────────────────────────────────────────────────────────
// Twilio Inbound SMS/MMS Webhook
//
//  Twilio Console → Phone Number → Messaging → Webhook URL:
//    POST https://usapawn.vercel.app/api/twilio/message
//
//  Handles 3 cases:
//    1. MMS (photo attached) → GPT-4o Vision appraisal
//    2. SMS text             → GPT-4o-mini chat
//    3. Logs every exchange  → USA_Pawn_Conversations table
// ─────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SMS_APPRAISAL_PROMPT = `You are Vault, an expert pawnbroker AI for USA Pawn Holdings in Jacksonville, FL.
A customer just texted a photo of an item they want appraised.

RULES:
- Give a ballpark LOW – HIGH range based on what you see.
- Reference current market/spot prices if it's gold, silver, or a known brand.
- Be warm, concise, and no-pressure.
- Invite them to visit 6132 Merrill Rd for an official in-person appraisal.
- Keep the reply SMS-friendly: 2-3 sentences max (under 320 chars ideal).
- NEVER guarantee a price — always say "estimate" or "ballpark."`;

const SMS_CHAT_PROMPT = `You are Vault, the AI assistant for USA Pawn Holdings in Jacksonville, FL.
You answer customer texts concisely and helpfully.

STORE INFO:
- Address: 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
- Phone: (904) 744-5611
- Hours: Mon–Fri 9 AM – 6 PM, Sat 9 AM – 5 PM, Sun Closed
- Pawn terms: 25% interest, 30-day term

KEY BEHAVIORS:
- Keep replies SHORT (1-2 sentences). This is SMS, not email.
- If they ask about appraisals, tell them to text a photo to this number.
- If they want to visit, offer to schedule (ask for name + preferred time).
- Be warm and conversational — contractions OK.`;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function logConversation(
  phone: string,
  inbound: string,
  outbound: string,
  channel: "sms" | "mms",
  mediaUrl?: string
) {
  try {
    const now = new Date().toISOString();
    const record = createUnifiedConversationRecord({
      conversation_id: `${channel}_${phone}_${Date.now()}`,
      source: channel,
      channel: "sms",
      phone,
      started_at: now,
      ended_at: now,
      source_metadata: {
        provider: "twilio",
        interaction_type: channel,
      },
      messages: [
        { role: "user", content: inbound, ...(mediaUrl ? { media_url: mediaUrl } : {}) },
        { role: "assistant", content: outbound },
      ],
    });

    await putItem(TABLES.conversations, record);
  } catch (err) {
    console.error("[SMS] Failed to log conversation:", err);
  }
}

async function logLead(
  phone: string,
  channel: "sms" | "mms",
  itemDescription: string,
  estimatedValue?: string,
  mediaUrl?: string
) {
  try {
    const estimatedValueMatch = estimatedValue?.match(/\$?([\d,]+(?:\.\d+)?)/);
    const parsedEstimate = estimatedValueMatch
      ? Number(estimatedValueMatch[1].replace(/,/g, ''))
      : undefined;

    await putItem(TABLES.leads, {
      lead_id: randomUUID(),
      source: channel,
      source_channel: channel,
      contact_method: 'sms',
      phone,
      item_description: itemDescription,
      estimated_value: Number.isFinite(parsedEstimate) ? parsedEstimate : undefined,
      photo_url: mediaUrl ?? null,
      status: "new",
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[SMS] Failed to log lead:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const From = formData.get("From") as string;
    const Body = (formData.get("Body") as string) || "";
    const NumMedia = parseInt((formData.get("NumMedia") as string) || "0");

    let responseText = "";

    // ─── CASE 1: MMS — Photo Appraisal ───────────────────────
    if (NumMedia > 0) {
      const MediaUrl0 = formData.get("MediaUrl0") as string;
      console.log(`[SMS-Appraisal] 📸 Image from ${From}: ${MediaUrl0}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SMS_APPRAISAL_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: Body
                  ? `Customer says: "${Body}"`
                  : "Customer sent a photo for appraisal (no comment).",
              },
              { type: "image_url", image_url: { url: MediaUrl0 } },
            ],
          },
        ],
        max_tokens: 300,
      });

      responseText =
        completion.choices[0].message.content ||
        "Thanks for the pic! I'll need a sec to take a closer look — hang tight.";

      // Log as lead + conversation
      await Promise.all([
        logLead(From, "mms", Body || "Photo appraisal", responseText, MediaUrl0),
        logConversation(From, Body || "[photo]", responseText, "mms", MediaUrl0),
      ]);
    }

    // ─── CASE 2: SMS — Text Chat ─────────────────────────────
    else {
      console.log(`[SMS-Chat] 💬 Text from ${From}: ${Body}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SMS_CHAT_PROMPT },
          { role: "user", content: Body },
        ],
        max_tokens: 200,
      });

      responseText =
        completion.choices[0].message.content ||
        "Thanks for reaching out! Text us a photo of any item for an instant estimate.";

      await logConversation(From, Body, responseText, "sms");
    }

    // ─── Reply via TwiML ─────────────────────────────────────
    console.log(`[SMS-Reply] → ${From}: ${responseText}`);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(responseText);

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[SMS] Error processing Twilio webhook:", error);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(
      "We hit a snag processing your message. Try again in a moment, or call us at (904) 744-5611!"
    );

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
