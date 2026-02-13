# Master Plan — USA Pawn Holdings PoC ("The Vault")
> **Source**: IMPLEMENTATION_PLAN.md  
> **Date**: 2026-02-12  
> **Total Phases**: 12  
> **Estimated Time**: 24-hour PoC (Fully Functional Demo)

---

## Phase Breakdown

### PHASE 1: Project Scaffold & Configuration
**Goal**: Initialize Next.js 14, install all dependencies, configure Tailwind with Vault theme, set up environment variables.

**Files**:
- `frontend/package.json`
- `frontend/next.config.js`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/tsconfig.json`
- `frontend/src/app/globals.css`
- `frontend/.env.example`
- `frontend/vercel.json`

**Deliverables**:
- Next.js 14 App Router project initialized
- Tailwind CSS configured with Vault color palette (`--vault-*` CSS variables)
- Google Fonts loaded (Playfair Display, Outfit, JetBrains Mono)
- Environment variable template (`.env.example`) with all required keys
- `vercel.json` with route config
- `npm run dev` starts clean with no errors

---

### PHASE 2: Website Scraper & Data Seeding
**Goal**: Build the Python scraper that extracts all content from `usapawnfl.com` (5 pages), downloads images, and outputs structured JSON for DynamoDB seeding.

**Files**:
- `backend/scripts/scrape_website.py`
- `backend/scripts/seed_database.py`
- `backend/scripts/create_tables.py`
- `backend/requirements.txt`
- `backend/schemas/functions.json`

**Deliverables**:
- Python script scrapes all 5 pages
- Downloads all images
- Extracts structured data
- `create_tables.py` creates all 6 DynamoDB tables
- `seed_database.py` loads data
- `functions.json` defines 7 OpenAI function tools

---

### PHASE 3: Core Libraries & Middleware
**Goal**: Build the shared TypeScript libraries and auth middleware.

**Files**:
- `frontend/src/lib/dynamodb.ts`
- `frontend/src/lib/openai.ts`
- `frontend/src/lib/twilio.ts`
- `frontend/src/lib/auth.ts`
- `frontend/src/lib/constants.ts`
- `frontend/src/middleware.ts`

**Deliverables**:
- DynamoDB client with typed helpers for all 6 tables
- OpenAI client (GPT-5-mini + GPT-4o)
- Vault system prompt constant
- Twilio client for SMS
- Auth middleware + utilities
- Store config and function tool definitions

---

### PHASE 4: API Routes — Chat, Appraise, Gold Price
**Goal**: Build the three core customer-facing API routes.

**Files**:
- `frontend/src/app/api/chat/route.ts`
- `frontend/src/app/api/appraise/route.ts`
- `frontend/src/app/api/gold-price/route.ts`

**Deliverables**:
- `/api/chat` — Streaming chat with GPT-5-mini + function calling
- `/api/appraise` — Vision API appraisal + spot price estimation
- `/api/gold-price` — Live gold/silver/platinum spot prices

---

### PHASE 5: API Routes — Leads, Staff, Auth, Schedule, Inventory
**Goal**: Build remaining API routes for dashboard, staff, and operational features.

**Files**:
- `frontend/src/app/api/leads/route.ts`
- `frontend/src/app/api/staff-log/route.ts`
- `frontend/src/app/api/auth/route.ts`
- `frontend/src/app/api/schedule/route.ts`
- `frontend/src/app/api/inventory/route.ts`

**Deliverables**:
- Lead CRUD operations
- Staff clock-in/out with QR token + PIN validation
- Auth with cookie management
- Appointment scheduling with SMS
- Inventory query API

---

### PHASE 6: Root Layout, NavBar & Chat Widget
**Goal**: Build the persistent UI shell — root layout with gold ticker bar, navigation, and floating chat widget.

**Files**:
- `frontend/src/app/layout.tsx`
- `frontend/src/components/NavBar.tsx`
- `frontend/src/components/GoldTicker.tsx`
- `frontend/src/components/ChatWidget.tsx`

**Deliverables**:
- Root layout with dark background, font imports, metadata
- Gold price ticker bar (auto-refresh)
- Navigation with Vault branding
- Floating chat widget (bottom-right, expandable, image upload, quick-replies)

---

### PHASE 7: Hero Landing Page (`/`) & Login Page (`/login`)
**Goal**: Build the stunning hero landing page and the simple auth gate.

**Files**:
- `frontend/src/app/page.tsx`
- `frontend/src/app/login/page.tsx`

**Deliverables**:
- Hero page with store photos, CTAs, category cards, YouTube embeds, maps
- `?source=door` detection for auto-chat greeting
- Login page with password-only auth (demo: 12345)

---

### PHASE 8: Appraisal Page (`/appraise`) — THE FLAGSHIP
**Goal**: Build the crown jewel — the AI photo appraisal portal.

**Files**:
- `frontend/src/app/appraise/page.tsx`
- `frontend/src/components/AppraisalCard.tsx`

**Deliverables**:
- Photo upload/camera capture interface
- AI processing animation
- Appraisal results with value estimation
- Booking flow with SMS confirmation
- Premium fintech design

---

### PHASE 9: Inventory & Info Pages
**Goal**: Build the product browsing and educational content pages.

**Files**:
- `frontend/src/app/inventory/page.tsx`
- `frontend/src/app/info/page.tsx`
- `frontend/src/components/InventoryGrid.tsx`

**Deliverables**:
- Filterable inventory grid (7 categories)
- Educational "How Pawning Works" content
- Interactive loan calculator
- FAQ accordions

---

### PHASE 10: Owner Dashboard (`/dashboard`)
**Goal**: Build the Owner Command Center.

**Files**:
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/components/DashboardLeadFeed.tsx`
- `frontend/src/components/DashboardStaffLog.tsx`
- `frontend/src/components/ComplianceAlerts.tsx`

**Deliverables**:
- Auth-gated owner dashboard
- Real-time lead feed
- Staff tracking with compliance alerts
- Revenue analytics
- Auto-refresh every 30s

---

### PHASE 11: Staff Portal (`/staff`) & QR Clock-In
**Goal**: Build the staff-facing portal with QR-based clock-in.

**Files**:
- `frontend/src/app/staff/page.tsx`
- `frontend/src/app/staff/clockin/page.tsx`
- `frontend/src/components/StaffShiftView.tsx`
- `frontend/src/components/ClockInButton.tsx`
- `frontend/src/components/QueueManager.tsx`

**Deliverables**:
- QR clock-in with token + PIN validation
- Active shift view with running timer
- Quick item entry and price lookup
- Queue manager for appointments
- Clock-out with shift notes

---

### PHASE 12: SEO Pages, Polish & Deployment
**Goal**: Add neighborhood SEO pages, structured data, final polish, and Vercel deployment config.

**Files**:
- `frontend/src/app/[neighborhood]/page.tsx`
- `frontend/src/app/layout.tsx` (JSON-LD updates)
- `frontend/vercel.json`
- Various polish tweaks

**Deliverables**:
- Dynamic neighborhood SEO pages
- JSON-LD structured data (local business, products, FAQ, ratings)
- Responsive polish at all breakpoints
- Loading states and error boundaries
- 404 page with branding
- Production deployment config
- End-to-end demo verification

---

## Success Criteria
1. **Scene 1**: Customer photo appraisal → real estimate → booking → SMS → dashboard lead
2. **Scene 2**: Staff clock-in tracked with compliance on dashboard
3. **Scene 3**: Walk-up QR scan → chat greeting → photo upload → estimate → booking
4. All 7 AI function tools operational
5. Chat widget on every page
6. Gold ticker with real prices
7. QR clock-in with rotating tokens
8. Mobile-first responsive design
9. Clean dev build and Vercel deployment

---

**Plan Status**: READY FOR EXECUTION  
**Architecture Version**: 1.0 — "The Vault"
