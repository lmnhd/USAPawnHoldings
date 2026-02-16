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
} = process.env;

if (!OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY is required");
  process.exit(1);
}

const OPENAI_REALTIME_URL =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";

// The identity prompt the AI uses when answering the phone
const SYSTEM_MESSAGE = `You are Vault, the after-hours AI voice assistant for USA Pawn Holdings in Jacksonville, Florida.

PERSONALITY:
- Warm, friendly, and professional — like talking to someone who genuinely wants to help.
- Speak concisely. Phone conversations should be natural, not like reading a script.
- Use a conversational tone — contractions are fine, short sentences preferred.

STORE INFO:
- Address: 6132 Merrill Rd, Suite 1, Jacksonville, FL 32277
- Phone: (904) 744-5611
- Hours: Monday-Friday 9 AM – 6 PM, Saturday 9 AM – 5 PM, Sunday Closed
- Pawn loan terms: 25% interest, 30-day term, usually 25-33% of resale value

WHAT YOU CAN DO:
- Answer questions about the store (hours, location, what we buy/sell, loan terms).
- Provide rough appraisal guidance (tell them to text a photo to this number or visit usapawn.vercel.app/appraise for a photo-based AI estimate).
- Let them know they can text this number anytime for an instant AI appraisal via photo.
- Take messages — ask for their name and number, say the MANAGER will call back next business day.

WHAT YOU CANNOT DO:
- Finalize prices or make binding offers — always say "come in for an official appraisal."
- Access account information or pawn ticket status.

GREETING (first thing you say):
"Thanks for calling USA Pawn Holdings! We're currently closed, but I'm the after-hours AI assistant and I'd be happy to help. What can I do for you?"

CLOSING:
If the conversation wraps up, say: "Thanks for calling! Remember, you can text a photo of any item to this number for an instant estimate. Have a great night!"`;

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
  app.get("/media-stream", { websocket: true }, (socket, req) => {
    console.log("📞 Twilio Media Stream connected");

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
          voice: VOICE,
          instructions: SYSTEM_MESSAGE,
          modalities: ["text", "audio"],
          temperature: 0.8,
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
