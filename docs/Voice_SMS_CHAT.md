# Voice / SMS / Chat — Complete Build Guide & Agent Skill

> **Purpose**: Reusable skill document for building AI-powered Voice, SMS, and Web Chat
> systems using Twilio + OpenAI + Next.js. Covers architecture, exact build steps,
> every pitfall encountered, and production hosting decisions.
>
> **Origin**: USA Pawn Holdings PoC (Feb 2026)
> **Author**: Auto-generated from lived debugging session
> **Status**: Production-verified — all three channels operational

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Channel Overview](#3-channel-overview)
4. [Prerequisites & Accounts](#4-prerequisites--accounts)
5. [Step-by-Step Build Guide](#5-step-by-step-build-guide)
   - [5.1 Project Structure](#51-project-structure)
   - [5.2 Web Chat (Channel 1)](#52-web-chat-channel-1)
   - [5.3 SMS/MMS (Channel 2)](#53-smsmms-channel-2)
   - [5.4 Voice (Channel 3)](#54-voice-channel-3)
6. [Hosting & Deployment](#6-hosting--deployment)
7. [Issues Encountered & Solutions](#7-issues-encountered--solutions)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Twilio Configuration Checklist](#9-twilio-configuration-checklist)
10. [Testing Procedures](#10-testing-procedures)
11. [Cost Breakdown](#11-cost-breakdown)
12. [Reuse Template](#12-reuse-template)
13. [**MANDATORY: Decomposed Prompt Architecture & Agent Control Dashboard**](#13-mandatory-decomposed-prompt-architecture--agent-control-dashboard)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER TOUCHPOINTS                        │
├──────────────┬──────────────────┬──────────────────────────────────┤
│  Web Chat    │   SMS / MMS      │   Phone Call (Voice)             │
│  (browser)   │   (text/photo)   │   (dial Twilio number)          │
└──────┬───────┴────────┬─────────┴────────────┬────────────────────┘
       │                │                      │
       ▼                ▼                      ▼
┌──────────────────────────────────────┐  ┌─────────────────────────┐
│        VERCEL (Next.js App)          │  │   TWILIO PLATFORM       │
│                                      │  │                         │
│  /api/chat      → GPT-5-mini        │  │  Phone # → Webhook      │
│  /api/twilio/message → GPT-4o/mini  │◄─┤  SMS # → Webhook        │
│  /api/twilio/voice   → TwiML        │  │  Media Streams          │
│                                      │  └────────────┬────────────┘
└──────────────────────────────────────┘               │
                                                       │ WebSocket
                                                       ▼
                                          ┌─────────────────────────┐
                                          │  RENDER.COM             │
                                          │  (Voice Relay Server)   │
                                          │                         │
                                          │  Twilio ←→ WebSocket    │
                                          │  ←→ OpenAI Realtime API │
                                          └─────────────────────────┘
```

### Data Flow Per Channel

| Channel | Trigger | Handler | AI Model | Response Format |
|:--------|:--------|:--------|:---------|:----------------|
| **Web Chat** | User types in chat widget | `POST /api/chat` on Vercel | GPT-5-mini (with function tools) | Streamed text |
| **SMS** | Customer texts Twilio number | `POST /api/twilio/message` on Vercel | GPT-4o-mini | TwiML `<Message>` |
| **MMS** | Customer texts photo to Twilio number | `POST /api/twilio/message` on Vercel | GPT-4o (Vision) | TwiML `<Message>` |
| **Voice** | Customer calls Twilio number | `POST /api/twilio/voice` → TwiML → WebSocket relay → OpenAI Realtime | GPT-4o Realtime | Bidirectional audio stream |

---

## 2. Technology Stack

| Component | Technology | Role |
|:----------|:-----------|:-----|
| **Frontend** | Next.js 15 (App Router) | Web UI + API routes for chat/SMS/voice webhooks |
| **Frontend Hosting** | Vercel | Serves web app + all API routes |
| **Voice Relay Server** | Fastify + @fastify/websocket + ws | Bridges Twilio Media Streams ↔ OpenAI Realtime API |
| **Voice Hosting** | Render.com (free tier) | WebSocket-capable hosting for voice relay |
| **AI (Chat/SMS)** | OpenAI GPT-5-mini | Text conversations with function calling |
| **AI (Vision)** | OpenAI GPT-4o | Photo appraisals via MMS |
| **AI (Voice)** | OpenAI Realtime API (gpt-4o-realtime-preview) | Real-time bidirectional voice |
| **Telephony** | Twilio (Programmable Voice + Messaging) | Phone number, SMS, MMS, voice, media streams |
| **Database** | AWS DynamoDB | Conversations, leads, inventory |
| **SMS Library** | twilio (Node SDK) | Outbound SMS from API routes |

---

## 3. Channel Overview

### Channel 1: Web Chat
- Persistent widget on every page (bottom-right corner)
- Uses OpenAI function calling for tool use (inventory search, scheduling, appraisals)
- Supports single photo upload for quick appraisals
- Conversations logged to DynamoDB
- Dynamic system prompt loaded from database (owner-configurable)

### Channel 2: SMS / MMS
- Twilio webhook receives inbound messages at `/api/twilio/message`
- **Text-only SMS** → GPT-4o-mini for conversational responses
- **MMS with photo** → GPT-4o Vision for item appraisal
- Responses sent back via TwiML `<Message>` (synchronous reply)
- All exchanges logged as leads + conversations in DynamoDB

### Channel 3: Voice (Real-time AI)
- Customer calls Twilio phone number
- Twilio hits voice webhook at `/api/twilio/voice`
- Webhook returns TwiML with `<Connect><Stream>` pointing to voice relay server
- Voice relay server (Render.com) bridges:
  - **Twilio Media Stream** (g711_ulaw audio) ↔ **OpenAI Realtime API** (bidirectional)
- AI speaks first with a greeting
- Supports barge-in (caller can interrupt AI mid-speech)
- Dynamic voice/prompt config fetched from frontend API (cached 5 min)

---

## 4. Prerequisites & Accounts

### Required Accounts
1. **OpenAI** — API key with access to GPT-5-mini, GPT-4o, and Realtime API
2. **Twilio** — Account with a phone number that has Voice + SMS capabilities
3. **Vercel** — For Next.js hosting (free Hobby tier works)
4. **Render.com** — For voice relay WebSocket server (free tier works)
5. **AWS** — For DynamoDB (free tier, optional if using a different DB)
6. **GitHub** — Repository for auto-deploy from Vercel and Render

### Required Software (Local Development)
- Node.js >= 20
- npm
- Git
- Docker (optional, for ECR image builds)
- AWS CLI v2 (optional, for DynamoDB management)

---

## 5. Step-by-Step Build Guide

### 5.1 Project Structure

```
project-root/
├── frontend/                    # Next.js app (Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── chat/
│   │   │   │   │   └── route.ts           # Web chat endpoint
│   │   │   │   └── twilio/
│   │   │   │       ├── message/
│   │   │   │       │   └── route.ts       # SMS/MMS webhook
│   │   │   │       └── voice/
│   │   │   │           └── route.ts       # Voice webhook (returns TwiML)
│   │   │   └── ... (pages)
│   │   ├── components/
│   │   │   └── ChatWidget.tsx             # Persistent chat widget
│   │   └── lib/
│   │       ├── openai.ts                  # OpenAI client + helpers
│   │       ├── twilio.ts                  # Twilio SMS client + helpers
│   │       ├── dynamodb.ts                # DynamoDB client
│   │       └── constants.ts               # System prompts, tools, config
│   ├── package.json
│   └── .env.local                         # Environment variables
│
├── backend/
│   ├── realtime_voice/          # Voice relay server (Render.com)
│   │   ├── server.js                      # Fastify + WebSocket relay
│   │   ├── package.json                   # ⚠️ MUST have "type": "module"
│   │   ├── Dockerfile                     # Optional (for container deploys)
│   │   └── .env                           # OPENAI_API_KEY, PORT, FRONTEND_URL
│   └── schemas/
│       └── functions.json                 # AI function tool definitions
│
└── docs/
    └── Voice_SMS_CHAT.md                  # This document
```

### 5.2 Web Chat (Channel 1)

#### 5.2.1 Create the Chat API Route

**File**: `frontend/src/app/api/chat/route.ts`

This is a standard Next.js API route that:
1. Receives user messages (array of `{role, content}`)
2. Prepends a system prompt (configurable from DB or hardcoded fallback)
3. Calls OpenAI Chat Completions with function tools enabled
4. If the model requests tool calls, executes them and makes a second LLM call
5. Returns the final text response
6. Logs the conversation to DynamoDB

**Key design decisions:**
- Use `tool_choice: "auto"` so the model decides when to use tools
- Two-pass pattern: first call may return tool_calls, second call incorporates tool results
- Stream text response for perceived speed (even though it's a single chunk)

#### 5.2.2 Define Function Tools

**File**: `frontend/src/lib/constants.ts` or `backend/schemas/functions.json`

Define tools the AI can call during chat:
```typescript
const FUNCTION_TOOLS = [
  {
    name: "appraise_item",
    description: "Analyze an uploaded item image to estimate pawn value.",
    parameters: { /* ... */ }
  },
  {
    name: "schedule_visit",
    description: "Book an in-store appointment and send SMS confirmation.",
    parameters: { /* customer_name, phone, preferred_time */ }
  },
  {
    name: "check_inventory",
    description: "Search inventory by category and keyword.",
    parameters: { /* category, keyword */ }
  },
  {
    name: "get_gold_spot_price",
    description: "Fetch current precious metals spot prices.",
    parameters: { /* metals[] */ }
  },
  {
    name: "log_lead",
    description: "Log a customer lead for follow-up.",
    parameters: { /* source, customer_info, item_interest */ }
  },
  {
    name: "check_store_status",
    description: "Check if the store is currently open.",
    parameters: {}
  },
  {
    name: "escalate_to_staff",
    description: "Flag high-value items for staff review.",
    parameters: { /* reason, estimated_value */ }
  }
];
```

#### 5.2.3 Create the Chat Widget Component

**File**: `frontend/src/components/ChatWidget.tsx`

- Floating button (bottom-right) that expands into a chat panel
- Maintains conversation state (messages array) in React state
- Sends POST to `/api/chat` with full message history
- Supports single image upload (base64 or URL)
- Renders markdown in AI responses
- Persists across page navigation (mount in root layout)

### 5.3 SMS/MMS (Channel 2)

#### 5.3.1 Create the Twilio SMS Webhook

**File**: `frontend/src/app/api/twilio/message/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const From = formData.get("From") as string;      // Caller phone
  const Body = (formData.get("Body") as string) || "";
  const NumMedia = parseInt(formData.get("NumMedia") as string || "0");

  let responseText = "";

  if (NumMedia > 0) {
    // MMS: Photo appraisal via GPT-4o Vision
    const MediaUrl0 = formData.get("MediaUrl0") as string;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: APPRAISAL_PROMPT },
        { role: "user", content: [
          { type: "text", text: Body || "Photo for appraisal" },
          { type: "image_url", image_url: { url: MediaUrl0 } }
        ]}
      ],
      max_tokens: 300,
    });
    responseText = completion.choices[0].message.content;
  } else {
    // SMS: Text chat via GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SMS_CHAT_PROMPT },
        { role: "user", content: Body }
      ],
      max_tokens: 200,
    });
    responseText = completion.choices[0].message.content;
  }

  // Reply via TwiML
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(responseText);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" }
  });
}
```

**Key points:**
- Twilio sends webhooks as `application/x-www-form-urlencoded` — use `req.formData()`
- `NumMedia > 0` indicates MMS with attached images
- `MediaUrl0` is the first image URL (Twilio-hosted, publicly accessible to OpenAI)
- Response MUST be TwiML XML with `<Message>` — Twilio parses this to send the reply
- Keep responses short (SMS has 160 char segments, MMS is more lenient but still mobile)

#### 5.3.2 Create the Twilio SMS Helper

**File**: `frontend/src/lib/twilio.ts`

```typescript
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    to: formatPhoneNumber(to),
    from: process.env.TWILIO_PHONE_NUMBER,
    body,
  });
}
```

This is for **outbound** SMS (e.g., appointment confirmations). Inbound SMS
is handled by the webhook above.

#### 5.3.3 Configure Twilio Phone Number

In Twilio Console:
1. Go to **Phone Numbers > Manage > Active Numbers**
2. Select your number
3. Under **Messaging**:
   - **When a message comes in**: Webhook
   - **URL**: `https://your-vercel-app.vercel.app/api/twilio/message`
   - **Method**: POST

### 5.4 Voice (Channel 3)

This is the most complex channel. It requires a **separate WebSocket relay server**
because Twilio Media Streams use WebSocket and OpenAI Realtime API uses WebSocket,
and you need a server that bridges them in real time.

#### 5.4.1 Voice Webhook (Vercel)

**File**: `frontend/src/app/api/twilio/voice/route.ts`

This is simple — it just returns TwiML that tells Twilio to start a Media Stream
to your voice relay server:

```typescript
export async function POST(req: NextRequest) {
  const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL;

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
    headers: { "Content-Type": "text/xml" }
  });
}
```

**Key points:**
- `VOICE_SERVER_URL` is the HTTPS URL of your voice relay server (Render.com)
- Convert `https://` → `wss://` for WebSocket
- The `<Stream>` element tells Twilio to open a bidirectional WebSocket
- The path `/media-stream` matches the route on your relay server

#### 5.4.2 Voice Relay Server (Render.com)

**File**: `backend/realtime_voice/server.js`

This is a Fastify server with three routes:

1. `GET /` — Health check (returns `{ status: "ok" }`)
2. `ALL /incoming-call` — Backup TwiML endpoint (optional)
3. `GET /media-stream` (WebSocket) — The actual Twilio ↔ OpenAI bridge

**The WebSocket bridge logic:**

```
Twilio Media Stream (g711_ulaw audio)
    │
    │  WebSocket connection opened
    ▼
┌───────────────────────────────────────┐
│         Voice Relay Server            │
│                                       │
│  1. On Twilio connect:                │
│     → Open WebSocket to OpenAI        │
│       Realtime API                    │
│     → Send session.update with        │
│       voice config + system prompt    │
│     → Send initial greeting prompt    │
│                                       │
│  2. Twilio → OpenAI:                  │
│     → Forward audio chunks as         │
│       input_audio_buffer.append       │
│                                       │
│  3. OpenAI → Twilio:                  │
│     → Forward response.audio.delta    │
│       as Twilio media events          │
│                                       │
│  4. Barge-in support:                 │
│     → On speech_started, truncate     │
│       AI response + clear Twilio      │
│       audio buffer                    │
└───────────────────────────────────────┘
```

**Critical configuration for OpenAI Realtime session:**
```javascript
const sessionUpdate = {
  type: "session.update",
  session: {
    turn_detection: { type: "server_vad" },  // Server-side voice activity detection
    input_audio_format: "g711_ulaw",          // Twilio's audio format
    output_audio_format: "g711_ulaw",         // Must match Twilio's expected format
    voice: "alloy",                           // OpenAI voice (alloy, echo, shimmer, etc.)
    instructions: systemPrompt,               // Your AI personality/rules
    modalities: ["text", "audio"],            // Enable both
    temperature: 0.8,
  },
};
```

#### 5.4.3 Package.json for Voice Server

**CRITICAL** — Must include `"type": "module"` for ES module imports:

```json
{
  "name": "your-voice-server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "fastify": "^5.2.1",
    "@fastify/websocket": "^11.0.2",
    "ws": "^8.18.0",
    "dotenv": "^16.4.7"
  },
  "engines": {
    "node": ">=20"
  }
}
```

#### 5.4.4 Dynamic Voice Config (Optional, Recommended)

The voice server fetches its system prompt and voice settings from the frontend API:

```javascript
const res = await fetch(`${FRONTEND_URL}/api/agent-config/voice`);
const data = await res.json();
// { system_prompt, voice, temperature }
```

This allows the business owner to change the AI's voice personality from a dashboard
without redeploying the voice server. Config is cached for 5 minutes to avoid
hitting the API on every call.

#### 5.4.5 Configure Twilio Phone Number for Voice

In Twilio Console:
1. Go to **Phone Numbers > Manage > Active Numbers**
2. Select your number
3. Under **Voice & Fax**:
   - **When a call comes in**: Webhook
   - **URL**: `https://your-vercel-app.vercel.app/api/twilio/voice`
   - **Method**: POST

---

## 6. Hosting & Deployment

### Frontend: Vercel

Standard Next.js deployment:
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Add all environment variables (see Section 8)
4. Deploy

### Voice Relay: Render.com

This is the critical piece. The voice relay server **requires WebSocket support**.

#### Why Render.com (Not AWS App Runner)

| Requirement | AWS App Runner | Render.com |
|:------------|:---------------|:-----------|
| HTTP | ✅ Works | ✅ Works |
| WebSocket | ❌ **403 Forbidden** (Envoy proxy blocks `Upgrade` headers) | ✅ Native support |
| Cost | ~$5-15/month | **$0** (free tier) |
| Deploy from GitHub | ✅ | ✅ |

**⚠️ AWS App Runner DOES NOT support WebSocket** despite documentation claims. This was
verified exhaustively — see Section 7 for full details.

#### Render.com Deployment Steps

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New +** > **Web Service**
3. Connect your repository
4. Configure:

| Setting | Value |
|:--------|:------|
| **Name** | `your-voice-server` |
| **Root Directory** | `backend/realtime_voice` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |
| **Region** | US East (Virginia) |

5. Add environment variables:
   - `OPENAI_API_KEY` = your key
   - `PORT` = `5050`
   - `FRONTEND_URL` = `https://your-vercel-app.vercel.app`
   - `VOICE` = `alloy` (optional)

6. Click **Deploy**

**⚠️ Common mistakes:**
- Do NOT use `yarn` commands unless your project has a `yarn.lock` file
- Build command is `npm install`, NOT `npm run build` (there is no build step)
- Start command is `node server.js`, NOT `npm start` (though both work if package.json is correct)

#### Free Tier Caveat

Render free instances spin down after 15 minutes of inactivity. First call after idle
will have ~50 second cold start. For production use, upgrade to Starter ($7/month)
for zero downtime.

**Workaround for free tier**: Set up a cron/uptime monitor to ping the health endpoint
every 14 minutes to prevent spin-down.

---

## 7. Issues Encountered & Solutions

### Issue 1: Missing `"type": "module"` in package.json

**Symptom**: Voice server container starts but immediately crashes with:
```
SyntaxError: Cannot use import statement in a module
```

**Root Cause**: `server.js` uses ES module syntax (`import Fastify from "fastify"`,
top-level `await`) but `package.json` didn't declare `"type": "module"`.

**Solution**: Add `"type": "module"` to `package.json`.

**Why this was hard to catch**: On platforms doing source-based builds (App Runner),
the build succeeds (npm install is fine) but the runtime crashes. Health checks using
TCP (port open) may still pass briefly before the process exits. The platform reports
"healthy" while the app is actually dead.

---

### Issue 2: AWS App Runner Blocks WebSocket Upgrades (403 from Envoy)

**Symptom**: All WebSocket connection attempts to App Runner return:
```
HTTP 403 Forbidden
server: envoy
content-length: 0
(no x-envoy-upstream-service-time header)
```

**Root Cause**: App Runner's managed Envoy reverse proxy rejects any HTTP request
carrying `Connection: Upgrade` and `Upgrade: websocket` headers. This is a platform
limitation, not a misconfiguration.

**Diagnostic methodology** (reproduce this for future debugging):

```javascript
// Test 1: Plain HTTP — reaches your app
// GET / → 200, has x-envoy-upstream-service-time
Invoke-WebRequest -Uri "https://your-service.awsapprunner.com/"

// Test 2: WebSocket upgrade — blocked by Envoy
// wss://your-service.awsapprunner.com/ → 403, server: envoy, NO upstream-time
const ws = new WebSocket('wss://your-service.awsapprunner.com/media-stream');

// Test 3: Manual HTTP with Upgrade header — blocked
// Proves it's the Upgrade header specifically, not the path
const options = {
  headers: {
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    'Sec-WebSocket-Version': '13',
    'Sec-WebSocket-Key': randomKey,
  }
};
```

**Key diagnostic indicator**: When Envoy blocks at the proxy level, the response
has `server: envoy` but NO `x-envoy-upstream-service-time` header. When the request
reaches your app, both headers are present.

**What was tried and failed**:
1. ❌ Source-based App Runner deployment — same 403
2. ❌ Image-based App Runner deployment (ECR) — same 403
3. ❌ Different WebSocket paths (/media-stream, /ws-test, /) — all 403
4. ❌ Various Origin/User-Agent headers — no effect
5. ❌ Twilio-specific headers — no effect

**Solution**: Use Render.com, Railway, or Fly.io instead — all support WebSocket natively.

**Cost comparison**:

| Platform | WebSocket Support | Monthly Cost |
|:---------|:------------------|:-------------|
| Render.com (free) | ✅ | $0 |
| Render.com (starter) | ✅ | $7 |
| Railway | ✅ | $5+ (usage-based) |
| Fly.io | ✅ | $0-5 |
| AWS App Runner | ❌ BLOCKED | $5-15 |
| AWS ECS Fargate + ALB | ✅ | $25-35 (ALB minimum $16) |

---

### Issue 3: AWS IAM Permission Denials

**Symptom**: CLI commands for ECR, App Runner, IAM all return `AccessDeniedException`.

**Root Cause**: The AWS CLI was configured with a narrow-scoped IAM user (`keyvex-app-user`)
that only had DynamoDB permissions.

**Solution**: Created a new IAM user (`cclem-dev-26`) with `AdministratorAccess` +
`PowerUserAccess` managed policies, then ran:

```powershell
aws configure set aws_access_key_id YOUR_NEW_KEY
aws configure set aws_secret_access_key YOUR_NEW_SECRET
aws configure set region us-east-1
aws configure set output json
```

**Lesson**: When setting up a dev machine, always verify `aws sts get-caller-identity`
shows the right user, and that user has sufficient permissions for the services you'll use.

**Recommended IAM setup for developer workstations**:
- One IAM user per developer
- `PowerUserAccess` managed policy (full access to everything except IAM user management)
- If you also need to create IAM roles (e.g., for App Runner ECR access), add `AdministratorAccess`
- Credentials stored in `~/.aws/credentials` via `aws configure`

---

### Issue 4: PowerShell JSON Escaping with AWS CLI

**Symptom**: `aws iam create-role --assume-role-policy-document '{...}'` silently
fails or produces malformed JSON in PowerShell.

**Root Cause**: PowerShell handles JSON string escaping differently than bash. Inline
JSON with curly braces gets mangled.

**Solution**: Write JSON to a temp file and use `file://` prefix:

```powershell
Set-Content -Path "$env:TEMP\policy.json" -Value '{"Version":"2012-10-17",...}'
aws iam create-role --assume-role-policy-document file://C:\Users\you\AppData\Local\Temp\policy.json
```

---

### Issue 5: Docker "Cannot connect" Error on Windows

**Symptom**: `docker build` fails with:
```
error during connect: Head "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/_ping": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Root Cause**: Docker Desktop is not running.

**Solution**: Start Docker Desktop before running Docker commands. On Windows, the
Docker daemon runs as a service under Docker Desktop — it's not a background daemon
like Linux.

---

### Issue 6: Render.com Default Build Commands

**Symptom**: Render auto-detects Yarn and uses `yarn` / `yarn start` as default
build and start commands.

**Root Cause**: Render tries to be smart about detecting the package manager, but
if there's no `yarn.lock`, Yarn may produce different dependency trees or fail.

**Solution**: Always explicitly set:
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

---

## 8. Environment Variables Reference

### Frontend (Vercel) — `.env.local`

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# AWS DynamoDB
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Voice relay server URL (Render.com)
VOICE_SERVER_URL=https://your-voice-server.onrender.com

# Auth
DEMO_AUTH_PASSWORD=12345

# App URL
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Voice Server (Render.com) — Environment Variables

```bash
OPENAI_API_KEY=sk-proj-...
PORT=5050
VOICE=alloy
FRONTEND_URL=https://your-app.vercel.app
```

### AWS CLI — `~/.aws/credentials`

```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

### AWS CLI — `~/.aws/config`

```ini
[default]
region = us-east-1
output = json
```

---

## 9. Twilio Configuration Checklist

### Phone Number Setup

Go to **Twilio Console > Phone Numbers > Manage > Active Numbers > [Your Number]**

| Section | Setting | Value |
|:--------|:--------|:------|
| **Voice** | "A call comes in" | Webhook |
| | URL | `https://your-app.vercel.app/api/twilio/voice` |
| | Method | POST |
| **Messaging** | "A message comes in" | Webhook |
| | URL | `https://your-app.vercel.app/api/twilio/message` |
| | Method | POST |

### Phone Number Requirements

- Must have **Voice** capability (for calls)
- Must have **SMS** capability (for text)
- Must have **MMS** capability (for photo appraisals) — most US numbers support this
- Recommend a **local** number in the business's area code for caller trust

### Webhook Security (Optional but Recommended)

Twilio signs every webhook request. Validate signatures in production:

```typescript
import twilio from "twilio";

const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  req.headers.get("x-twilio-signature"),
  webhookUrl,
  formData
);
```

---

## 10. Testing Procedures

### Test Web Chat
1. Open your deployed site
2. Click the chat widget
3. Type a message — should get AI response
4. Try asking about inventory, store hours, scheduling
5. Check DynamoDB `Conversations` table for logged data

### Test SMS
```bash
# Send a test text to your Twilio number from your phone
# Check Twilio Console > Monitor > Messaging for delivery status
# Check DynamoDB for logged conversation
```

### Test MMS (Photo Appraisal)
1. Text a photo to your Twilio number
2. Should receive an AI appraisal response within 5-10 seconds
3. Check DynamoDB for logged lead + conversation

### Test Voice — WebSocket Handshake
```javascript
// Run from a machine with the ws package installed
const WebSocket = require('ws');
const ws = new WebSocket('wss://your-voice-server.onrender.com/media-stream');
ws.on('open', () => { console.log('OPEN - WebSocket works!'); ws.close(); });
ws.on('unexpected-response', (req, res) => { console.log('FAIL:', res.statusCode); });
ws.on('error', (e) => console.log('ERROR:', e.message));
setTimeout(() => process.exit(0), 10000);
```

Expected output: `OPEN - WebSocket works!`

If you get `UNEXPECTED 403` — the hosting platform doesn't support WebSocket.

### Test Voice — Live Call
1. Call your Twilio number from any phone
2. Should hear AI greeting within 2-3 seconds
3. Have a conversation — test barge-in (interrupt the AI)
4. Hang up and check Render.com logs for connection/disconnection events

### Test Voice — Health Check
```bash
curl https://your-voice-server.onrender.com/
# Expected: {"status":"ok","service":"your-voice-server"}
```

---

## 11. Cost Breakdown

### Monthly Costs (Typical Small Business)

| Service | Tier | Cost | Notes |
|:--------|:-----|:-----|:------|
| Vercel | Hobby | $0 | 100GB bandwidth, serverless functions |
| Render.com | Free | $0 | 750 hrs/month, 50s cold start |
| Render.com | Starter | $7 | No cold start, always on |
| OpenAI (Chat) | Pay-per-use | ~$5-15 | GPT-5-mini, ~1000 conversations |
| OpenAI (Vision) | Pay-per-use | ~$2-5 | GPT-4o, ~100 photo appraisals |
| OpenAI (Voice) | Pay-per-use | ~$10-30 | Realtime API, ~100 calls |
| Twilio Phone | Monthly | $1.15 | One US local number |
| Twilio SMS | Per-message | ~$3-10 | $0.0079/msg, ~500 messages |
| Twilio Voice | Per-minute | ~$5-15 | $0.014/min, ~500 minutes |
| AWS DynamoDB | Free tier | $0 | 25 WCU/RCU, 25GB storage |
| **TOTAL** | | **~$26-83/mo** | Scales with usage |

### What NOT to Use

| Service | Why Not | Cost If You Did |
|:--------|:--------|:----------------|
| AWS App Runner | WebSocket blocked by Envoy proxy | $5-15/mo wasted |
| AWS ECS Fargate + ALB | ALB has $16/mo minimum just for the load balancer | $25-35/mo |
| AWS API Gateway (WebSocket) | Doesn't fit Twilio Media Stream protocol | $3-10/mo |

---

## 12. Reuse Template

### To build a new Voice/SMS/Chat system for a different client:

#### Step 1: Clone the Structure
Copy the project structure from Section 5.1. The architecture is client-agnostic.

#### Step 2: Customize System Prompts
Update these files with the new business identity:
- `frontend/src/lib/constants.ts` → `VAULT_SYSTEM_PROMPT` (web chat)
- `frontend/src/app/api/twilio/message/route.ts` → `SMS_CHAT_PROMPT` + `SMS_APPRAISAL_PROMPT`
- `backend/realtime_voice/server.js` → `FALLBACK_SYSTEM_MESSAGE` (voice)

Replace all instances of:
- Business name, address, phone, hours
- Pawn terms / pricing / policies (or whatever the business does)
- AI personality name (e.g., "Vault" → something else)

#### Step 3: Set Up Accounts
1. **Twilio**: Buy a phone number in the client's area code
2. **OpenAI**: Use your existing API key (or create a project-specific one)
3. **Vercel**: Connect the new repo
4. **Render.com**: Create a new web service pointing to `backend/realtime_voice`
5. **AWS DynamoDB**: Create tables (or use a different DB)

#### Step 4: Configure Twilio Webhooks
- Voice: `POST https://new-app.vercel.app/api/twilio/voice`
- Messaging: `POST https://new-app.vercel.app/api/twilio/message`

#### Step 5: Set Environment Variables
- Vercel: All frontend vars (OpenAI, Twilio, AWS, VOICE_SERVER_URL)
- Render.com: OPENAI_API_KEY, PORT, FRONTEND_URL

#### Step 6: Deploy & Test
1. Push to GitHub → Vercel auto-deploys
2. Render.com auto-deploys (or manual deploy)
3. Run the WebSocket handshake test
4. Send a test SMS
5. Place a test call

#### Step 7: Customize Function Tools (Optional)
Modify `functions.json` / `constants.ts` to add business-specific tools:
- Different inventory categories
- Business-specific scheduling logic
- Custom lead scoring
- Industry-specific appraisal prompts

---

## 13. MANDATORY: Decomposed Prompt Architecture & Agent Control Dashboard

> **⚠️ NON-NEGOTIABLE REQUIREMENT**: Every system built with this skill **MUST** decompose
> AI system prompts into independently configurable fragments stored in a database, exposed
> through an owner-facing dashboard, and dynamically assembled at runtime. The business owner
> must be able to tune all AI behavior **without code changes or redeployments**.

### 13.1 The Core Problem

A monolithic system prompt is a liability:
- **Untunable** — changing one sentence requires a developer and a redeploy
- **Opaque** — the owner can't see or understand what the AI is told to do
- **Rigid** — seasonal changes, promotions, rule additions all require code edits
- **Fragile** — one bad edit to a 2000-char prompt can break the entire agent

The solution is **prompt decomposition**: break every system prompt into named, typed fragments
that are stored in a key-value database, edited through a UI, and assembled at request time.

### 13.2 Prompt Fragment Taxonomy

Every AI agent's final prompt is assembled from these fragment categories. Not every project
needs all of them, but the **pattern** must be followed for each agent in the system.

| Fragment Type | Behavior | Dashboard Control | Example |
|:---|:---|:---|:---|
| **Base Prompt** | Hardcoded default with full override | Read-only viewer + expert override textarea | The core identity, rules, and capabilities |
| **Tone Directive** | Enum selector → injected as instruction | Card grid (casual / professional / friendly / firm) | `"Speak in a {tone} manner."` |
| **Response Length** | Enum → sets verbosity instruction | Card grid (short / medium / detailed) | `"Keep responses to 1-2 sentences."` |
| **Custom Greeting** | String → replaces default opening | Text input | First message the AI sends |
| **Additional Rules** | String → **appended** to base rules | Monospace textarea | Business-specific constraints |
| **Contextual Info** | String → **appended** as context | Monospace textarea | Promotions, hours changes, seasonal notes |
| **Escalation Threshold** | Number → injected as rule | Number input | Dollar/severity amount that triggers handoff |
| **Channel Addendum** | String → layered for channel-specific behavior | Textarea | Phone-specific, SMS-specific instructions |
| **Channel-Specific Rules** | String → appended after addendum | Monospace textarea | Rules that only apply to one channel |
| **Model Parameters** | Float/enum → passed to API call, not prompt | Slider / selector | Temperature, voice selection, max tokens |
| **Full Override** | String → **replaces entire assembled prompt** | ⚠️ Expert textarea with warning | Emergency escape hatch |

### 13.3 Assembly Rules (Critical)

The fragments are not just concatenated. They follow strict assembly rules:

#### Rule 1: Append, Don't Replace (by default)
Custom rules and contextual info are **appended** to the base prompt. This prevents the owner
from accidentally deleting core instructions. Only the explicit "Full Override" replaces.

#### Rule 2: Inheritance Between Agents
When multiple agents share a brain (e.g., voice inherits from chat), changing shared fragments
(tone, rules, contextual info) must flow to all inheriting agents automatically. Only a
per-agent "Full Override" should break this chain — and the UI must **warn explicitly** when
this happens.

```
Assembly order for an inheriting agent (e.g. voice inherits from chat):

1. Primary agent's base prompt (chat custom override OR hardcoded default)
2. Inheriting agent's channel addendum (voice addendum OR default)
3. Primary agent's tone directive (if non-default)
4. Primary agent's additional rules (if set)
5. Primary agent's contextual info (if set)
6. Inheriting agent's channel-specific rules (if set)
7. Primary agent's escalation threshold

If inheriting agent's full_override is set → skip ALL above, use only that.
```

#### Rule 3: Model Parameters Are Separate from Prompt
Temperature, voice selection, max tokens — these are NOT injected into the prompt text. They're
returned alongside the assembled prompt as separate fields and passed to the AI API call directly.

```typescript
// API response shape for any config endpoint:
{
  system_prompt: string,       // The assembled text
  temperature: number,         // Model parameter
  voice?: string,              // Model parameter (voice agents)
  max_tokens?: number,         // Model parameter
  source: "assembled" | "full_override" | "fallback"
}
```

#### Rule 4: Graceful Fallback
If the database is unreachable, every route MUST fall back to hardcoded defaults. The system
**never fails silently** — it degrades to safe, pre-tested defaults. The `source` field in
the response tells the consumer what happened.

### 13.4 Database Pattern

Use a key-value table with a **prefix convention** per agent:

```
Table: {Project}_Store_Config
Partition key: config_key (string)

Key naming: agent_{agentName}_{fragmentType}

Examples:
  agent_chat_tone             → "casual"
  agent_chat_rules            → "- Never discuss competitors\n- Always mention free estimates"
  agent_chat_system_prompt    → ""  (empty = use default)
  agent_vision_conservatism   → "moderate"
  agent_voice_voice           → "alloy"
  agent_voice_temperature     → "0.8"
```

Each record also stores:
- `value` (string) — the fragment content
- `updated_at` (ISO timestamp) — when it was last changed
- `updated_by` (string, optional) — who changed it

The API route defines a `KNOWN_KEYS` constant with all valid keys and their defaults.
PUT requests are validated against this list — unknown keys are silently dropped.
GET requests merge DB values with defaults so every known key is always present in the response.

### 13.5 API Route Pattern

Three routes per system:

#### GET /api/agent-config
Returns all config entries merged with defaults. Every known key is always present.

```typescript
const KNOWN_KEYS = {
  agent_chat_system_prompt: "",
  agent_chat_tone: "casual",
  agent_chat_rules: "",
  // ... all keys with defaults
};

// On GET: scan DB for prefix "agent_", merge with KNOWN_KEYS
// On PUT: validate keys against KNOWN_KEYS, write each to DB with timestamp
```

#### PUT /api/agent-config
Batch-updates config entries. Body: `{ updates: { [key]: value } }`. Only known keys accepted.

#### GET /api/agent-config/{channel}
Assembles the final prompt for a specific channel using the inheritance + assembly rules above.
Returns `{ system_prompt, temperature, voice?, source }`.

**This is the critical route** — it's where the decomposed fragments become one prompt.

### 13.6 Prompt Assembly Implementation

```typescript
// Pseudocode — adapt per project

async function assemblePrompt(primaryPrefix: string, channelPrefix?: string) {
  const primary = await getConfigBatch(primaryPrefix);      // e.g. "agent_chat_"
  const channel = channelPrefix 
    ? await getConfigBatch(channelPrefix)                    // e.g. "agent_voice_"
    : {};

  // Full override escape hatch
  const fullOverride = channel[`${channelPrefix}system_prompt`]?.trim();
  if (fullOverride) return { prompt: fullOverride, source: "full_override" };

  // Assemble from fragments
  const parts: string[] = [];

  // 1. Base prompt
  parts.push(primary[`${primaryPrefix}system_prompt`]?.trim() || HARDCODED_DEFAULT);

  // 2. Channel addendum (if inheriting agent)
  if (channelPrefix) {
    parts.push(channel[`${channelPrefix}addendum`]?.trim() || DEFAULT_ADDENDUM);
  }

  // 3. Tone directive
  const tone = primary[`${primaryPrefix}tone`];
  if (tone && tone !== DEFAULT_TONE) {
    parts.push(`\nTONE: Speak in a ${tone} manner.`);
  }

  // 4. Additional rules (APPEND, don't replace)
  const rules = primary[`${primaryPrefix}rules`]?.trim();
  if (rules) parts.push(`\nADDITIONAL RULES:\n${rules}`);

  // 5. Contextual info (APPEND)
  const info = primary[`${primaryPrefix}special_info`]?.trim();
  if (info) parts.push(`\nCURRENT INFO:\n${info}`);

  // 6. Channel-specific rules (APPEND)
  if (channelPrefix) {
    const chRules = channel[`${channelPrefix}rules`]?.trim();
    if (chRules) parts.push(`\nCHANNEL RULES:\n${chRules}`);
  }

  // 7. Escalation threshold
  const threshold = primary[`${primaryPrefix}escalation_threshold`] || "500";
  parts.push(`\nESCALATION: Flag items/issues over $${threshold} for human review.`);

  return { prompt: parts.join("\n"), source: "assembled" };
}
```

### 13.7 Dashboard UI Pattern

The dashboard component follows this structure for **each agent**:

```
┌─────────────────────────────────────────────────────────┐
│  [Tab: Agent 1]  [Tab: Agent 2]  [Tab: Agent 3]  ...   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌ Info Banner ────────────────────────────────────┐    │
│  │ Explains what this agent does and how config    │    │
│  │ affects its behavior.                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Default Prompt Viewer (collapsible, read-only) ─┐    │
│  │ Shows the hardcoded default prompt so the owner │    │
│  │ understands the baseline. Badge: "Overridden"   │    │
│  │ if custom override is set.                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: Tone & Behavior ──────────────────────────┐    │
│  │  Tone:    [Casual] [Professional] [Friendly]    │    │
│  │  Length:  [Short]  [Medium]  [Detailed]          │    │
│  │  Greeting: [________________________]            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: Rules & Restrictions ─────────────────────┐    │
│  │  Additional rules: [monospace textarea]          │    │
│  │  Escalation threshold: [$________]               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: Contextual Info / Announcements ──────────┐    │
│  │  [monospace textarea — promotions, hours, etc]   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌ Card: ⚠️ Full Prompt Override (red border) ─────┐    │
│  │  WARNING: This replaces the entire base prompt.  │    │
│  │  [monospace textarea — expert only]              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Sticky Save Bar — appears when unsaved changes]       │
│  Unsaved changes (3 fields)  [Discard] [Save All]       │
└─────────────────────────────────────────────────────────┘
```

#### Required UI Behaviors
- **Sticky save bar** — only visible when edits exist; shows count of changed fields
- **Discard / Save All** — discard resets local state; save does batch PUT
- **Success/error feedback** — animated toast with timestamp on save
- **Character count** per textarea
- **"Overridden" badge** on the default prompt viewer when a custom override is set
- **Enum selectors as card grids** — not dropdowns; each option shows label + short description
- **Model parameter controls** — sliders for temperature, card grids for voice/model selection
- **Channel inheritance explanation** — for agents that inherit, show the assembly order clearly

### 13.8 How Channels Consume Config at Runtime

| Channel | When Config is Read | Latency of Changes |
|:---|:---|:---|
| Web Chat API | Every message (inline DB read) | **Instant** |
| Vision/Appraisal API | Every submission (inline DB read) | **Instant** |
| SMS Webhook | Every inbound message (inline DB read) | **Instant** |
| Voice Relay Server | HTTP fetch to `/api/agent-config/{channel}` with TTL cache | **Up to cache TTL** (recommend 5 min) |

Voice servers are typically separate processes — they can't read the DB directly. Instead,
they fetch the assembled prompt from the frontend API with a time-based cache. This means
voice config changes are slightly delayed but require **zero redeployment**.

### 13.9 Implementation Checklist

For every project built with this skill:

- [ ] **Define all agents** the system has (chat, voice, vision, SMS, etc.)
- [ ] **Identify shared vs. channel-specific fragments** — which agents inherit from which
- [ ] **Create the KNOWN_KEYS constant** with every config key and its default value
- [ ] **Database table** with `config_key` as partition key (DynamoDB, Postgres, etc.)
- [ ] **GET /api/agent-config** — returns all keys merged with defaults
- [ ] **PUT /api/agent-config** — batch update with known-key validation
- [ ] **GET /api/agent-config/{channel}** — per-channel prompt assembly endpoint
- [ ] **Prompt assembly function** — implements the fragment ordering + inheritance rules
- [ ] **Every API route reads config dynamically** — no hardcoded prompts in route handlers
- [ ] **Dashboard component** — tabbed UI with one tab per agent
- [ ] **Default prompt viewers** — collapsible read-only view with "Overridden" badge
- [ ] **Full Override with warning** — red-bordered expert card that explains the consequences
- [ ] **Auth gate** — dashboard behind authentication (owner/admin role only)
- [ ] **Fallback to defaults** — if DB read fails, use hardcoded defaults (never crash)

### 13.10 Design Principles

1. **Append, don't replace** — Custom rules and contextual info are layered ON TOP of defaults.
   Only the explicit Full Override replaces. This prevents owners from accidentally gutting
   critical base instructions.

2. **Inheritance flows down** — Secondary agents inherit primary agent config automatically.
   Changing tone on the primary agent changes it everywhere. Full Override on a secondary
   agent intentionally breaks this chain — and the UI must warn about it.

3. **Fragments are typed** — Enums get card grids, strings get textareas, numbers get inputs
   or sliders. Never give a freeform textarea for something that should be a constrained choice.

4. **Known-key validation** — The API only accepts predefined config keys. This prevents
   injection of arbitrary data and keeps frontend/backend in sync. Unknown keys are silently
   dropped, not errored — forward compatibility.

5. **Zero-config works** — The system must function perfectly with an empty database. Every
   key has a hardcoded default. The dashboard is for refinement, not bootstrapping.

6. **Source transparency** — Every prompt assembly response includes a `source` field
   (`assembled`, `full_override`, `fallback`) so consumers know what happened. This is
   invaluable for debugging.

---

## Appendix A: OpenAI Realtime API Audio Formats

| Format | Use Case |
|:-------|:---------|
| `g711_ulaw` | Twilio Media Streams (US telephony standard) |
| `g711_alaw` | European telephony |
| `pcm16` | Raw audio (browser-based WebRTC) |

Always match `input_audio_format` and `output_audio_format` to what your telephony
provider sends/expects. Twilio uses `g711_ulaw`.

## Appendix B: Fastify WebSocket Plugin Registration Pattern

The `@fastify/websocket` plugin requires WebSocket routes to be registered
inside an `async` plugin function:

```javascript
// ✅ CORRECT — register inside async plugin
fastify.register(async (app) => {
  app.get("/ws-path", { websocket: true }, async (socket, req) => {
    // handle WebSocket
  });
});

// ❌ WRONG — directly on fastify instance
fastify.get("/ws-path", { websocket: true }, handler);
```

## Appendix C: Twilio Media Stream Event Types

| Event | Direction | Meaning |
|:------|:----------|:--------|
| `start` | Twilio → Server | Stream started, contains `streamSid` |
| `media` | Twilio → Server | Audio chunk (base64 encoded g711_ulaw) |
| `mark` | Twilio → Server | Acknowledgement of a mark event you sent |
| `stop` | Twilio → Server | Stream ended (call hung up) |
| `media` | Server → Twilio | Audio to play to caller |
| `mark` | Server → Twilio | Insert a mark in the audio queue |
| `clear` | Server → Twilio | Clear queued audio (for barge-in) |

## Appendix D: Barge-In (Interruption) Logic

When the caller speaks while the AI is talking:

1. OpenAI sends `input_audio_buffer.speech_started`
2. Calculate elapsed audio time: `latestMediaTimestamp - responseStartTimestampTwilio`
3. Send `conversation.item.truncate` to OpenAI (stop generating audio)
4. Send `clear` event to Twilio (stop playing queued audio)
5. Reset mark queue and timestamp trackers

Without this, the AI will keep talking over the caller.

## Appendix E: Quick Diagnostic Commands

```powershell
# Check AWS identity
aws sts get-caller-identity

# Check Render health
Invoke-WebRequest -Uri "https://your-voice.onrender.com/" -UseBasicParsing

# Test WebSocket (from a folder with ws installed)
node -e "const W=require('ws');const w=new W('wss://your-voice.onrender.com/media-stream');w.on('open',()=>{console.log('OK');w.close()});w.on('unexpected-response',(r,s)=>console.log('FAIL',s.statusCode));w.on('error',e=>console.log('ERR',e.message));setTimeout(()=>process.exit(),8000)"

# Check Twilio webhook config (manual — go to Twilio Console)
# Phone Numbers > Active Numbers > [number] > Voice/Messaging sections

# Tail Render.com logs
# Dashboard > your service > Logs tab (or use Render CLI)
```

---

*Document generated: February 16, 2026*
*Verified against production deployment: USA Pawn Holdings*
*Architecture version: 1.0*
