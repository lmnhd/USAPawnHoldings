import { NextResponse } from "next/server";

/**
 * Twilio Voice Webhook — returns TwiML that connects the caller
 * to the OpenAI Realtime API via the Render-hosted WebSocket server.
 *
 * The voice server URL is configured via VOICE_SERVER_URL env var.
 * This should point to your Render deployment, e.g.:
 *   https://usapawn-voice.onrender.com
 *
 * Twilio calls this endpoint when someone dials the Twilio number.
 * The TwiML <Connect><Stream> starts a bidirectional Media Stream
 * between Twilio and our voice server's /media-stream WebSocket.
 */

const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL;

export async function POST() {
  if (!VOICE_SERVER_URL) {
    // Fallback: just say a message if the voice server isn't configured
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">
    Thanks for calling USA Pawn Holdings. Our AI phone assistant is temporarily unavailable.
    Our store hours are Monday through Friday, 9 AM to 6 PM, and Saturday 9 AM to 5 PM Eastern Time.
    You can also text us a photo of any item for an instant AI appraisal.
    Have a great day!
  </Say>
</Response>`;
    return new NextResponse(fallback, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Convert https:// to wss:// for the WebSocket stream URL
  const wsUrl = VOICE_SERVER_URL
    .replace("https://", "wss://")
    .replace("http://", "ws://");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/media-stream" />
  </Connect>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
