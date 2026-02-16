import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const {
  OPENAI_API_KEY,
  PORT = "5050",
  VOICE = "alloy",
  FRONTEND_URL = "https://usapawn.vercel.app",
} = process.env;

if (!OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY is required");
  process.exit(1);
}

const OPENAI_REALTIME_URL =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";

const VOICE_TOOLS = [
  {
    type: "function",
    name: "schedule_visit",
    description:
      "Book an in-store appointment. Use only after collecting customer name, phone, preferred time, and item description.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Customer full name" },
        phone: { type: "string", description: "Customer callback phone number" },
        preferred_time: {
          type: "string",
          description:
            "Requested appointment time. Prefer ISO 8601 (example: 2026-02-18T15:00:00-05:00)",
        },
        item_description: {
          type: "string",
          description: "What the customer is bringing for appraisal or pawn",
        },
        estimated_value: {
          type: "number",
          description: "Optional estimated value in USD",
        },
      },
      required: ["customer_name", "phone", "preferred_time", "item_description"],
      additionalProperties: false,
    },
  },
];

// ─────────────────────────────────────────────────────────────
// DYNAMIC PROMPT — fetched from Vercel API, cached 5 minutes
// Falls back to a hardcoded default if API is unreachable.
// ─────────────────────────────────────────────────────────────

const FALLBACK_SYSTEM_MESSAGE = `You are Vault, the AI voice assistant for USA Pawn Holdings in Jacksonville, Florida.
You are warm, friendly, and professional. Keep responses short — this is a phone call.
Store hours (Eastern Time): Mon-Fri 9 AM – 6 PM, Sat 9 AM – 5 PM, Closed Sunday.
Address: 6132 Merrill Rd, Suite 1, Jacksonville, FL 32277.
Phone: (904) 744-5611. Pawn terms: 25% interest, 30-day term.
Tell callers they can text a photo to this number for an instant AI appraisal.
Do not claim the store is closed unless current Eastern Time is outside store hours.
Greet callers warmly. Take messages (name + number) if you can't help directly.`;

let cachedConfig = {
  system_prompt: FALLBACK_SYSTEM_MESSAGE,
  voice: VOICE,
  temperature: 0.8,
  fetched_at: 0,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function parseJsonSafe(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return "";
}

function normalizePreferredTime(raw) {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}

function normalizeEstimatedValue(raw) {
  if (raw == null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

async function logVoiceBookingAudit({
  streamSid,
  callId,
  status,
  payload,
  result,
}) {
  try {
    await fetch(`${FRONTEND_URL}/api/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: `voice_booking_${callId || streamSid || Date.now()}`,
        channel: "voice",
        started_at: new Date().toISOString(),
        customer_id: payload?.phone || undefined,
        metadata: {
          event: "voice_schedule_visit",
          status,
          stream_sid: streamSid ?? null,
          call_id: callId ?? null,
        },
        messages: [
          {
            role: "system",
            content: `Voice schedule_visit ${status}. payload=${JSON.stringify(payload)} result=${JSON.stringify(result)}`,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn("⚠️  Failed to persist voice booking audit log:", err?.message || err);
  }
}

async function scheduleVisitFromVoice(args, context = {}) {
  const normalizedPhone = normalizePhone(args.phone);
  const normalizedPreferredTime = normalizePreferredTime(args.preferred_time);
  const normalizedEstimatedValue = normalizeEstimatedValue(args.estimated_value);

  const payload = {
    source: "voice", // Explicitly set source for dashboard filtering
    customer_name: String(args.customer_name ?? "").trim(),
    phone: normalizedPhone,
    preferred_time: normalizedPreferredTime,
    item_description: String(args.item_description ?? "").trim(),
    ...(normalizedEstimatedValue != null ? { estimated_value: normalizedEstimatedValue } : {}),
  };

  const missing = Object.entries(payload)
    .filter(([key, value]) => key !== "estimated_value" && (!value || String(value).length === 0))
    .map(([key]) => key);

  if (!normalizedPhone) {
    missing.push("phone");
  }
  if (!normalizedPreferredTime) {
    missing.push("preferred_time");
  }

  const uniqueMissing = Array.from(new Set(missing));

  if (uniqueMissing.length > 0) {
    const failure = {
      success: false,
      error: "Missing required appointment fields",
      missing_fields: uniqueMissing,
      validation: {
        phone_hint: "Provide a valid callback number with country/area code.",
        preferred_time_hint: "Provide a real date/time value (prefer ISO 8601).",
      },
    };
    await logVoiceBookingAudit({
      streamSid: context.streamSid,
      callId: context.callId,
      status: "validation_failed",
      payload,
      result: failure,
    });
    return failure;
  }

  const response = await fetch(`${FRONTEND_URL}/api/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const failure = {
      success: false,
      error: result?.error || `Schedule API HTTP ${response.status}`,
      details: result?.details,
      suggest_next: result?.suggest_next,
    };
    await logVoiceBookingAudit({
      streamSid: context.streamSid,
      callId: context.callId,
      status: "schedule_api_failed",
      payload,
      result: failure,
    });
    return failure;
  }

  const success = {
    success: true,
    lead_id: result.lead_id,
    appointment_id: result.appointment_id,
    scheduled_time: result.scheduled_time,
    confirmation_code: result.confirmation_code,
    sms_sent: result.sms_sent,
    status: result.status,
  };
  await logVoiceBookingAudit({
    streamSid: context.streamSid,
    callId: context.callId,
    status: "scheduled",
    payload,
    result: success,
  });
  return success;
}

async function runVoiceTool(name, args, context = {}) {
  switch (name) {
    case "schedule_visit":
      return scheduleVisitFromVoice(args, context);
    default:
      return { success: false, error: `Unsupported voice tool: ${name}` };
  }
}

async function getVoiceConfig() {
  const now = Date.now();
  if (now - cachedConfig.fetched_at < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const res = await fetch(`${FRONTEND_URL}/api/agent-config/voice`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    cachedConfig = {
      system_prompt: data.system_prompt || FALLBACK_SYSTEM_MESSAGE,
      voice: data.voice || VOICE,
      temperature: data.temperature ?? 0.8,
      fetched_at: now,
    };
    console.log(`✅ Voice config refreshed (source: ${data.source})`);
  } catch (err) {
    console.warn("⚠️  Failed to fetch voice config from API, using cached/fallback:", err.message);
    // Keep using whatever we had cached — don't reset fetched_at so we retry next call
  }

  return cachedConfig;
}

// Events we want to log from OpenAI
const LOG_EVENT_TYPES = [
  "response.content.done",
  "rate_limits.updated",
  "response.done",
  "input_audio_buffer.committed",
  "input_audio_buffer.speech_stopped",
  "input_audio_buffer.speech_started",
  "session.created",
  "error",
];

// ─────────────────────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────────────────────
const fastify = Fastify({ logger: true });
await fastify.register(websocketPlugin);

// Health check (Render pings this)
fastify.get("/", async () => ({ status: "ok", service: "usapawn-voice" }));

// Warm-up + status probe endpoint
fastify.get("/health/store-status", async () => {
  const startedAt = Date.now();

  try {
    const response = await fetch(`${FRONTEND_URL}/api/store-status`, {
      signal: AbortSignal.timeout(5000),
    });

    const payload = await response.json().catch(() => ({}));

    return {
      status: response.ok ? "ok" : "degraded",
      service: "usapawn-voice",
      frontend_url: FRONTEND_URL,
      latency_ms: Date.now() - startedAt,
      store_status: payload,
    };
  } catch (error) {
    return {
      status: "error",
      service: "usapawn-voice",
      frontend_url: FRONTEND_URL,
      latency_ms: Date.now() - startedAt,
      message: "Failed to fetch store status from frontend API",
      error: error?.message || String(error),
    };
  }
});

// Twilio calls this to get TwiML that starts the Media Stream
fastify.all("/incoming-call", async (request, reply) => {
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">Please wait while we connect you.</Say>
  <Connect>
    <Stream url="wss://${request.headers.host}/media-stream" />
  </Connect>
</Response>`;

  reply.type("text/xml").send(twimlResponse);
});

// ─────────────────────────────────────────────────────────────
// WEBSOCKET: Twilio Media Stream ↔ OpenAI Realtime
// ─────────────────────────────────────────────────────────────
fastify.register(async (app) => {
  app.get("/media-stream", { websocket: true }, async (socket, req) => {
    console.log("📞 Twilio Media Stream connected");

    // Fetch current voice config from dashboard (cached 5 min)
    const voiceConfig = await getVoiceConfig();
    console.log(`🎙️  Using voice: ${voiceConfig.voice}, temp: ${voiceConfig.temperature}`);

    let streamSid = null;
    let latestMediaTimestamp = 0;
    let lastAssistantItem = null;
    let markQueue = [];
    let responseStartTimestampTwilio = null;
    const handledCallIds = new Set();

    // Open a connection to OpenAI Realtime
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    const processToolCall = async (name, callId, argsJson) => {
      if (!callId || handledCallIds.has(callId)) {
        return;
      }
      handledCallIds.add(callId);

      const args = typeof argsJson === "string" ? parseJsonSafe(argsJson, {}) : argsJson ?? {};
      console.log(`🛠️  Voice tool call: ${name} (${callId})`, args);

      let output;
      try {
        output = await runVoiceTool(name, args, { streamSid, callId });
      } catch (err) {
        output = {
          success: false,
          error: "Tool execution failed",
          details: err?.message || String(err),
        };
      }

      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify(output),
            },
          })
        );
        openaiWs.send(JSON.stringify({ type: "response.create" }));
      }
    };

    // ── Send session config once OpenAI connects ──
    openaiWs.on("open", () => {
      console.log("🤖 Connected to OpenAI Realtime API");

      const sessionUpdate = {
        type: "session.update",
        session: {
          turn_detection: { type: "server_vad" },
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          voice: voiceConfig.voice,
          instructions: `${voiceConfig.system_prompt}\n\nTOOL RULES: When booking an appointment, collect all required fields first, then call schedule_visit. Never claim an appointment is booked unless the tool returns success. If tool returns an error, explain clearly and ask for corrected info or another time.`,
          modalities: ["text", "audio"],
          temperature: voiceConfig.temperature,
          tools: VOICE_TOOLS,
          tool_choice: "auto",
        },
      };

      openaiWs.send(JSON.stringify(sessionUpdate));

      // Send an initial greeting so the AI speaks first
      sendInitialGreeting(openaiWs);
    });

    // ── Handle messages FROM OpenAI → Twilio ──
    openaiWs.on("message", (data) => {
      try {
        const response = JSON.parse(data.toString());

        if (LOG_EVENT_TYPES.includes(response.type)) {
          console.log(`[OpenAI] ${response.type}`, response.type === "error" ? response : "");
        }

        // Stream audio back to Twilio
        if (response.type === "response.audio.delta" && response.delta) {
          if (streamSid) {
            const audioDelta = {
              event: "media",
              streamSid,
              media: { payload: response.delta },
            };
            socket.send(JSON.stringify(audioDelta));

            if (!responseStartTimestampTwilio) {
              responseStartTimestampTwilio = latestMediaTimestamp;
            }
            if (response.item_id) {
              lastAssistantItem = response.item_id;
            }
            sendMark(socket, streamSid);
          }
        }

        // Track when assistant finishes speaking (for interruption support)
        if (response.type === "input_audio_buffer.speech_started") {
          handleSpeechStartedEvent(socket, openaiWs, streamSid, lastAssistantItem, markQueue, responseStartTimestampTwilio, latestMediaTimestamp);
        }

        if (response.type === "response.function_call_arguments.done") {
          void processToolCall(response.name, response.call_id, response.arguments);
        }

        if (response.type === "response.output_item.done" && response.item?.type === "function_call") {
          void processToolCall(response.item.name, response.item.call_id, response.item.arguments);
        }
      } catch (err) {
        console.error("Error parsing OpenAI message:", err);
      }
    });

    openaiWs.on("close", () => {
      console.log("🤖 OpenAI Realtime disconnected");
    });

    openaiWs.on("error", (err) => {
      console.error("🤖 OpenAI Realtime error:", err);
    });

    // ── Handle messages FROM Twilio → OpenAI ──
    socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.event) {
          case "media":
            latestMediaTimestamp = data.media.timestamp;
            if (openaiWs.readyState === WebSocket.OPEN) {
              openaiWs.send(
                JSON.stringify({
                  type: "input_audio_buffer.append",
                  audio: data.media.payload,
                })
              );
            }
            break;

          case "start":
            streamSid = data.start.streamSid;
            console.log(`📞 Stream started: ${streamSid}`);
            latestMediaTimestamp = 0;
            responseStartTimestampTwilio = null;
            break;

          case "mark":
            if (markQueue.length > 0) {
              markQueue.shift();
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error parsing Twilio message:", err);
      }
    });

    // ── Cleanup ──
    socket.on("close", () => {
      console.log("📞 Twilio Media Stream disconnected");
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function sendInitialGreeting(openaiWs) {
  // Prompt the AI to greet the caller immediately
  const initialConversationItem = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Greet the caller warmly and help with their request.",
        },
      ],
    },
  };
  openaiWs.send(JSON.stringify(initialConversationItem));
  openaiWs.send(JSON.stringify({ type: "response.create" }));
}

function sendMark(socket, streamSid) {
  if (streamSid) {
    const markEvent = {
      event: "mark",
      streamSid,
      mark: { name: "responsePart" },
    };
    socket.send(JSON.stringify(markEvent));
  }
}

function handleSpeechStartedEvent(socket, openaiWs, streamSid, lastAssistantItem, markQueue, responseStartTimestampTwilio, latestMediaTimestamp) {
  // User interrupted the AI — clear Twilio's audio buffer
  if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
    const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
    
    if (lastAssistantItem) {
      const truncateEvent = {
        type: "conversation.item.truncate",
        item_id: lastAssistantItem,
        content_index: 0,
        audio_end_ms: elapsedTime,
      };
      openaiWs.send(JSON.stringify(truncateEvent));
    }

    // Tell Twilio to clear its audio buffer
    socket.send(
      JSON.stringify({
        event: "clear",
        streamSid,
      })
    );

    markQueue.length = 0;
    responseStartTimestampTwilio = null;
  }
}

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port: parseInt(PORT), host: "0.0.0.0" });
    console.log(`\n🎙️  USA Pawn Voice Server running on port ${PORT}`);
    console.log(`   Health: http://0.0.0.0:${PORT}/`);
    console.log(`   TwiML:  http://0.0.0.0:${PORT}/incoming-call`);
    console.log(`   WS:     ws://0.0.0.0:${PORT}/media-stream\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
