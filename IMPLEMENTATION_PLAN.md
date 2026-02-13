# Implementation Plan — USA Pawn Holdings PoC ("The Vault")
> **Blueprint Source**: `targets/BLUEPRINT-USAPawnHoldings.md`
> **Date**: 2026-02-12
> **Codename**: The Vault
> **Target Delivery**: 24-Hour PoC (Fully Functional Demo)

---

## Architecture Overview

```
USAPawnHoldings/
├── frontend/                          # Next.js 14 (App Router)
│   ├── public/
│   │   └── images/                    # Scraped store photos, logo, QR assets
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css            # Vault CSS variables, fonts, base styles
│   │   │   ├── layout.tsx             # Root layout (gold ticker bar, font imports)
│   │   │   ├── page.tsx               # "/" — Hero landing page
│   │   │   ├── login/
│   │   │   │   └── page.tsx           # Auth gate (demo password: 12345)
│   │   │   ├── appraise/
│   │   │   │   └── page.tsx           # FLAGSHIP — AI photo appraisal portal
│   │   │   ├── inventory/
│   │   │   │   └── page.tsx           # Browse inventory grid
│   │   │   ├── info/
│   │   │   │   └── page.tsx           # "How Pawning Works" educational
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           # Owner Command Center (auth-gated)
│   │   │   ├── staff/
│   │   │   │   ├── page.tsx           # Staff Portal (PIN-gated)
│   │   │   │   └── clockin/
│   │   │   │       └── page.tsx       # QR clock-in endpoint (?token=)
│   │   │   └── api/
│   │   │       ├── chat/
│   │   │       │   └── route.ts       # Chat endpoint (GPT-5-mini)
│   │   │       ├── appraise/
│   │   │       │   └── route.ts       # Vision appraisal (GPT-4o)
│   │   │       ├── gold-price/
│   │   │       │   └── route.ts       # Live gold/silver spot price
│   │   │       ├── leads/
│   │   │       │   └── route.ts       # Lead CRUD for dashboard
│   │   │       ├── staff-log/
│   │   │       │   └── route.ts       # Staff clock-in/out API
│   │   │       ├── inventory/
│   │   │       │   └── route.ts       # Inventory query API
│   │   │       ├── auth/
│   │   │       │   └── route.ts       # Login handler + cookie set
│   │   │       └── schedule/
│   │   │           └── route.ts       # Appointment booking API
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx          # Persistent floating chat (every page)
│   │   │   ├── GoldTicker.tsx          # Live gold price header bar
│   │   │   ├── AppraisalCard.tsx       # Estimate result card
│   │   │   ├── InventoryGrid.tsx       # Filterable product grid
│   │   │   ├── StaffShiftView.tsx      # Active shift display
│   │   │   ├── DashboardLeadFeed.tsx   # Owner lead feed
│   │   │   ├── DashboardStaffLog.tsx   # Owner staff tracking section
│   │   │   ├── ComplianceAlerts.tsx    # Color-coded staff alerts
│   │   │   ├── ClockInButton.tsx       # Large clock-in/out UI
│   │   │   ├── QueueManager.tsx        # Upcoming appointments
│   │   │   └── NavBar.tsx              # Gold/black navigation
│   │   ├── lib/
│   │   │   ├── dynamodb.ts            # DynamoDB client + helpers
│   │   │   ├── openai.ts             # OpenAI client (GPT-5-mini + GPT-4o)
│   │   │   ├── twilio.ts             # Twilio client helpers
│   │   │   ├── auth.ts               # Auth utilities (cookie check, role)
│   │   │   └── constants.ts          # Store config, system prompt, brand vars
│   │   └── middleware.ts               # Auth middleware (cookie check)
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── lambda/
│   │   ├── dispatcher.py              # Twilio webhook router
│   │   ├── appraisal_engine.py        # Photo → Vision → spot price → estimate
│   │   ├── scheduler.py               # Appointment logic + SMS confirmation
│   │   ├── staff_monitor.py           # Clock-in compliance + cron alerts
│   │   └── lead_scorer.py             # Lead scoring + high-value push
│   ├── schemas/
│   │   └── functions.json             # OpenAI function calling definitions
│   ├── scripts/
│   │   ├── scrape_website.py          # Scrape all 5 pages of usapawnfl.com
│   │   ├── seed_database.py           # Load scraped data into DynamoDB
│   │   └── create_tables.py           # DynamoDB table creation script
│   └── requirements.txt
├── docs/
│   ├── DEPLOYMENT_NOTES.md
│   ├── QR_CODES.md                    # QR code URLs and placement guide
│   └── PITCH_PACKET.md               # Print-ready pitch materials spec
├── .plan-delegator/                    # Plan Delegator orchestration files
│   ├── master-plan.md
│   ├── progress.md
│   ├── current-phase.md
│   ├── phase-result.md
│   └── verification-result.md
├── .github/                            # Agents & skills (copied from Project_POC)
│   ├── copilot-instructions.md         # USA Pawn-specific instructions
│   ├── agents/
│   └── skills/
├── IMPLEMENTATION_PLAN.md              # This file
├── vercel.json
└── .env.example
```

---

## Phase Breakdown (12 Phases)

### PHASE 1: Project Scaffold & Configuration
**Goal**: Initialize Next.js 14, install all dependencies, configure Tailwind with Vault theme, set up environment variables.
**Files**: `package.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `globals.css`, `.env.example`, `vercel.json`
**Deliverables**:
- Next.js 14 App Router project initialized
- Tailwind CSS configured with Vault color palette (`--vault-*` CSS variables)
- Google Fonts loaded (Playfair Display, Outfit, JetBrains Mono)
- Environment variable template (`.env.example`) with all required keys
- `vercel.json` with route config
- `npm run dev` starts clean with no errors

### PHASE 2: Website Scraper & Data Seeding
**Goal**: Build the Python scraper that extracts all content from `usapawnfl.com` (5 pages), downloads images, and outputs structured JSON for DynamoDB seeding.
**Files**: `backend/scripts/scrape_website.py`, `backend/scripts/seed_database.py`, `backend/scripts/create_tables.py`, `backend/requirements.txt`, `backend/schemas/functions.json`
**Deliverables**:
- Python script scrapes all 5 pages (Home, Products, Info, Gallery, Gold/Contact)
- Downloads all images (store photos `pic1-7.jpg`, product images, logo)
- Extracts: product categories, brand names, store hours, contact info, loan terms, specials, YouTube embed URLs
- Outputs structured JSON matching DynamoDB seed schema
- `create_tables.py` creates all 6 DynamoDB tables
- `seed_database.py` loads scraped data into DynamoDB
- `functions.json` defines all 7 OpenAI function calling tools

### PHASE 3: Core Libraries & Middleware
**Goal**: Build the shared TypeScript libraries and auth middleware.
**Files**: `lib/dynamodb.ts`, `lib/openai.ts`, `lib/twilio.ts`, `lib/auth.ts`, `lib/constants.ts`, `middleware.ts`
**Deliverables**:
- DynamoDB client with typed helpers (getItem, putItem, query, scan) for all 6 tables
- OpenAI client with GPT-5-mini (chat) and GPT-4o (vision) configurations
- Vault system prompt as a constant (full identity from blueprint)
- Twilio client for SMS send/receive
- Auth middleware: checks `vault_auth` cookie on `/dashboard` and `/staff` routes, redirects to `/login`
- Auth utilities: `setAuthCookie(role)`, `getAuthRole()`, `isAuthenticated()`
- `constants.ts`: store config, hours, contact, Vault identity, all 7 function tool definitions

### PHASE 4: API Routes — Chat, Appraise, Gold Price
**Goal**: Build the three core customer-facing API routes.
**Files**: `api/chat/route.ts`, `api/appraise/route.ts`, `api/gold-price/route.ts`
**Deliverables**:
- `/api/chat` — Streaming chat endpoint using GPT-5-mini with function calling (all 7 tools). Accepts message history, returns SSE stream. Logs every conversation to `USA_Pawn_Conversations`.
- `/api/appraise` — Accepts image (base64 or URL) + optional description. Sends to GPT-4o Vision. Cross-references with live gold spot price. Returns structured estimate (item ID, metal type, weight estimate, current rate, value range). Logs to `USA_Pawn_Appraisals` and `USA_Pawn_Leads`.
- `/api/gold-price` — Fetches current gold/silver/platinum spot prices from a free metals API (or cached value). Returns JSON with per-ounce prices and timestamp.

### PHASE 5: API Routes — Leads, Staff, Auth, Schedule, Inventory
**Goal**: Build remaining API routes for dashboard, staff, and operational features.
**Files**: `api/leads/route.ts`, `api/staff-log/route.ts`, `api/auth/route.ts`, `api/schedule/route.ts`, `api/inventory/route.ts`
**Deliverables**:
- `/api/leads` — GET (list leads with filters: date, status, value range), POST (create lead from any channel), PATCH (update status)
- `/api/staff-log` — POST clock-in (validates daily QR token + PIN), POST clock-out, GET today's log, GET weekly summary
- `/api/auth` — POST login (validates password against `DEMO_AUTH_PASSWORD` env var, sets `vault_auth` cookie with role and 24hr TTL)
- `/api/schedule` — POST booking (creates appointment, sends Twilio SMS confirmation), GET upcoming appointments
- `/api/inventory` — GET (query by category, keyword search), seeded from scraper output

### PHASE 6: Root Layout, NavBar & Chat Widget
**Goal**: Build the persistent UI shell — root layout with gold ticker bar, navigation, and floating chat widget that appears on every page.
**Files**: `layout.tsx`, `components/NavBar.tsx`, `components/GoldTicker.tsx`, `components/ChatWidget.tsx`
**Deliverables**:
- **Root Layout**: Dark background (`#0D0D0D`), font imports, metadata (title: "USA Pawn Holdings | Jacksonville's Trusted Pawn Shop")
- **GoldTicker**: Fixed top bar with gold gradient background, shows live gold/silver spot prices, auto-refreshes every 5 min
- **NavBar**: Black with gold accents, USA Pawn Holdings logo, links to all public pages, mobile hamburger menu
- **ChatWidget**: Floating bubble (bottom-right), expandable chat window with message history, image upload button, quick-reply buttons ("Get Appraisal", "Store Hours", "Book Visit"), uses `/api/chat` endpoint, supports inline images in responses, detects `?source=door` param for door-specific greeting
- All components use Vault CSS variables and `frontend-design` skill aesthetics
- Mobile-first, responsive at all breakpoints

### PHASE 7: Hero Landing Page (`/`) & Login Page (`/login`)
**Goal**: Build the stunning hero landing page and the simple auth gate.
**Files**: `app/page.tsx`, `app/login/page.tsx`
**Deliverables**:
- **Hero Page** (`/`):
  - Full-width hero section with store photo background, gold overlay, USA Pawn Holdings logo, tagline: "Where We Take Anything of Value and Treat You Like Family"
  - Primary CTA: "Get an Instant Appraisal" → links to `/appraise`
  - Product category cards (7 categories from scrape) with hover effects
  - YouTube TV ad embed section
  - Store hours, contact info, Google Maps embed
  - "Why USA Pawn?" trust section with review highlights
  - Footer: address, phone, hours, social links
  - `?source=door` detection: auto-opens chat widget with door greeting
- **Login Page** (`/login`):
  - Clean dark page, center card with gold border
  - Password-only field (no username for demo)
  - Submits to `/api/auth`, redirects to `/dashboard` on success
  - Error state for wrong password

### PHASE 8: Appraisal Page (`/appraise`) — THE FLAGSHIP
**Goal**: Build the crown jewel — the AI photo appraisal portal.
**Files**: `app/appraise/page.tsx`, `components/AppraisalCard.tsx`
**Deliverables**:
- **Appraise Page**:
  - Header with today's gold spot price (from GoldTicker data)
  - Large drag-and-drop upload zone OR camera capture button ("Drop a photo or tap to use your camera")
  - Processing animation: gold shimmer loading state ("Vault is analyzing your item...")
  - **AppraisalCard**: Displays results — item identification, metal type/karat, estimated weight, current buy rate, **estimated value range** (bold, gold, large), "Book In-Store Appraisal" CTA button
  - FAQ accordion below: "How accurate are these estimates?", "What happens next?", "What do I need to bring?"
  - Recent gold/silver prices sidebar
  - Booking flow: name + phone → `/api/schedule` → SMS confirmation
  - `?source=print` detection for clean direct-link experience
  - Premium fintech feel — this is the showcase feature

### PHASE 9: Inventory & Info Pages
**Goal**: Build the product browsing and educational content pages.
**Files**: `app/inventory/page.tsx`, `app/info/page.tsx`, `components/InventoryGrid.tsx`
**Deliverables**:
- **Inventory Page** (`/inventory`):
  - Filterable grid of 7 product categories (seeded from scrape)
  - Each card: category image, name, brands listed, savings percentage, estimated value range
  - "Interested? Chat with us" CTA on every card (opens chat widget with context)
  - Search bar with real-time filter
- **Info Page** (`/info`):
  - "What is a Pawn?" educational content (from scraped info page), modernized
  - Loan terms: 25% interest, 30-day term, 25-33% loan-to-value
  - Interactive loan calculator widget (enter item value → see pawn loan amount)
  - FAQ accordion with clean typography
  - Current specials section (from scrape: Video Game Bundles, Gold/Silver buying)

### PHASE 10: Owner Dashboard (`/dashboard`)
**Goal**: Build the Owner Command Center — the "you can see everything" page.
**Files**: `app/dashboard/page.tsx`, `components/DashboardLeadFeed.tsx`, `components/DashboardStaffLog.tsx`, `components/ComplianceAlerts.tsx`
**Deliverables**:
- Auth-gated (redirects to `/login` if no `vault_auth` cookie with `owner` role)
- **Today's Summary Bar**: Store opened at [time], leads waiting, AI handled overnight, estimated pipeline value
- **Lead Feed**: Real-time list of customer interactions — source (Web/SMS/QR), timestamp, item photos, AI estimate, status (New/Contacted/Closed/Lost), customer info. Clickable to expand conversation replay.
- **Staff Tracking Section**: Today's shift log (clock-in time, compliance status, break durations, shift timer, customers logged). Color-coded compliance alerts (green/yellow/red/black).
- **Weekly Summary**: Hours worked per staff, punctuality score, early closure count, customer interactions per shift
- **Revenue Analytics**: Pipeline value, appointments booked, conversion rate
- Auto-refreshes every 30 seconds

### PHASE 11: Staff Portal (`/staff`) & QR Clock-In (`/staff/clockin`)
**Goal**: Build the staff-facing portal with QR-based clock-in and active shift view.
**Files**: `app/staff/page.tsx`, `app/staff/clockin/page.tsx`, `components/StaffShiftView.tsx`, `components/ClockInButton.tsx`, `components/QueueManager.tsx`
**Deliverables**:
- **Clock-In Page** (`/staff/clockin`):
  - Reads `?token=` from URL (scanned from physical QR code)
  - Validates token against today's daily token in `USA_Pawn_Store_Config`
  - 4-digit numeric PIN keypad (touch-optimized, large buttons)
  - On success: clock-in recorded to `USA_Pawn_Staff_Log`, transition to Staff Portal
  - On invalid token: error "Please scan today's QR code at the store"
  - On invalid PIN: error with retry
  - Manual override fallback (no QR): PIN + secondary override code
- **Staff Portal** (`/staff`):
  - If not clocked in: shows clock-in prompt (link to scan QR or manual PIN)
  - **Active Shift View** (after clock-in):
    - Running shift timer ("You've been on shift for 2h 15m")
    - **Quick Item Entry**: Photo + description form → logs new inventory
    - **Price Lookup**: Type item description → AI-assisted price suggestion (wholesale/pawn value)
    - **Queue Manager**: Upcoming booked appraisals with customer name, item type, estimated value, appointment time
    - **Break Toggle**: "On Break" button pauses shift timer, logs break duration
    - **Clock-Out Button**: Red, captures timestamp + optional shift note

### PHASE 12: SEO Pages, Polish & Deployment
**Goal**: Add neighborhood SEO pages, JSON-LD structured data, final polish, and Vercel deployment config.
**Files**: `app/[neighborhood]/page.tsx`, `layout.tsx` (JSON-LD), various polish tweaks, `vercel.json`
**Deliverables**:
- **Dynamic Neighborhood Pages** (`/arlington`, `/southside`, `/beaches`):
  - Template-based: neighborhood name, driving directions, store specials
  - SEO meta tags: "Pawn Shop Near [Neighborhood], Jacksonville — Free Appraisals"
- **JSON-LD Structured Data** (in root layout):
  - `PawnShop` local business: hours, address, phone, coordinates
  - `Product` schema per inventory category with price ranges
  - `FAQ` schema from "What is a Pawn?" content
  - `AggregateRating`: 4.5/5 from 51 reviews
- **Final Polish**:
  - All pages responsive at mobile/tablet/desktop
  - Loading states and error boundaries on every page
  - 404 page with Vault branding
  - Favicon and OG image (gold/black with USA Pawn logo)
  - Performance audit: images optimized, code-split, no layout shift
- **Deployment**:
  - `vercel.json` route config
  - Environment variables documented
  - All API routes functional with real backends
  - Demo walkthrough verified (all 3 blueprint scenes work end-to-end)

---

## Environment Variables Required

```env
# OpenAI
OPENAI_API_KEY=sk-...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Auth
DEMO_AUTH_PASSWORD=12345

# App
NEXT_PUBLIC_SITE_URL=https://usapawn.vercel.app
DAILY_QR_TOKEN_SECRET=... (used to generate rotating daily tokens)

# Optional
METALS_API_KEY=... (for live gold prices, or use free endpoint)
```

---

## Success Criteria
1. **Scene 1** (Appraisal): Customer uploads gold chain photo → gets real estimate with spot price math → books appointment → SMS confirmation sent → lead appears on dashboard
2. **Scene 2** (Staff Accountability): Owner sees clock-in time, compliance flags, shift duration, and customer count on dashboard
3. **Scene 3** (Walk-Up Rescue): Customer scans door QR → chat opens with door greeting → uploads photo in chat → gets estimate → books appointment
4. All 7 AI function tools work in real-time
5. Chat widget functional on every page
6. Gold ticker shows real spot prices
7. Staff QR clock-in validates rotating daily token + PIN
8. Mobile-first, responsive at all breakpoints
9. `npm run dev` runs clean. `vercel deploy` succeeds.

---

*Plan Version: 1.0 | Date: 2026-02-12 | Blueprint: BLUEPRINT-USAPawnHoldings.md*
