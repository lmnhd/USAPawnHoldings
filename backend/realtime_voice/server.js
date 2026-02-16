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

// ─────────────────────────────────────────────────────────────
// DYNAMIC PROMPT — fetched from Vercel API, cached 5 minutes
// Falls back to a hardcoded default if API is unreachable.
// ─────────────────────────────────────────────────────────────

const FALLBACK_SYSTEM_MESSAGE = `You are Vault, the after-hours AI voice assistant for USA Pawn Holdings in Jacksonville, Florida.
You are warm, friendly, and professional. Keep responses short — this is a phone call.
Store hours: Mon-Fri 9 AM – 6 PM, Sat 9 AM – 5 PM, Closed Sunday.
Address: 6132 Merrill Rd, Suite 1, Jacksonville, FL 32277.
Phone: (904) 744-5611. Pawn terms: 25% interest, 30-day term.
Tell callers they can text a photo to this number for an instant AI appraisal.
Greet callers warmly. Take messages (name + number) if you can't help directly.`;

let cachedConfig = {
  system_prompt: FALLBACK_SYSTEM_MESSAGE,
  voice: VOICE,
  temperature: 0.8,
  fetched_at: 0,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

// Health check (App Runner pings this)
fastify.get("/", async () => ({ status: "ok", service: "usapawn-voice" }));

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

    // Open a connection to OpenAI Realtime
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

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
          instructions: voiceConfig.system_prompt,
          modalities: ["text", "audio"],
          temperature: voiceConfig.temperature,
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
          text: "Greet the caller warmly. You are answering the phone after hours.",
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
