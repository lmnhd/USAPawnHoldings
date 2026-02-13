# Copilot Instructions — USA Pawn Holdings PoC

## Project Identity
- **Client**: USA Pawn Holdings
- **Owner**: Desiree Corley Jones
- **Location**: 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
- **Blueprint**: `targets/BLUEPRINT-USAPawnHoldings.md` (SOURCE OF TRUTH)

## ⚠️ CRITICAL RULES

### 1. Blueprint Is Law
Every feature, page, AI function, database schema, and design decision is defined in `BLUEPRINT-USAPawnHoldings.md`. When in doubt, **read the blueprint**. Do not invent features that aren't specified. Do not omit features that are.

### 2. NO MOCK FUNCTIONALITY
The system must be **fully functional** — real AI responses, real Vision API appraisals, real DynamoDB reads/writes, real Twilio messaging. The ONLY mock data is the **inventory seed** (scraped from the existing website). If a user uploads a photo, GPT-4o Vision processes it. If someone sends an SMS, the AI responds. No stubs. No fake returns. No placeholder logic.

### 3. Use the `frontend-design` Skill
**ALL frontend pages and components** must be designed using the `frontend-design` skill from `.github/skills/frontend-design/SKILL.md`. This means:
- Bold, intentional aesthetic direction — NOT generic AI slop
- Dark luxury theme (black + gold + red accents)
- Distinctive typography (NOT Inter, Roboto, Arial, or system fonts)
- Motion and micro-interactions on key moments
- Production-grade code, not prototypes

### 4. Use the USA Pawn Brand Guidelines
**IGNORE the Anthropic brand colors** in the default `brand-guidelines` skill. This project uses the **USA Pawn Holdings** brand palette defined below and in the customized `brand-guidelines/SKILL.md`.

### 5. Never Stop or Start the Dev Server
**AGENTS MUST NEVER stop or start the development server** (`npm run dev`, `npm start`, `yarn dev`, `npx next dev`, etc.). Only the user controls dev server lifecycle. Agents may suggest starting/stopping the server, but must never execute these commands. If build validation is needed, use `npx next build` instead.

## Brand Identity — USA Pawn Holdings

### Colors (CSS Variables)
```css
:root {
  /* Primary — Patriotic Blue */
  --vault-gold: #4A90D9;
  --vault-gold-light: #5BA0E8;
  --vault-gold-gradient: linear-gradient(135deg, #4A90D9, #5BA0E8);
  
  /* Secondary — Dark Navy */
  --vault-black: #111D33;
  --vault-black-deep: #0B1426;
  --vault-surface: #142238;
  --vault-surface-elevated: #1C2D47;
  
  /* Accent — USA Red */
  --vault-red: #CC0000;
  --vault-red-hover: #E60000;
  
  /* Text */
  --vault-text-light: #FFFFFF;
  --vault-text-on-gold: #FFFFFF;
  --vault-text-muted: #8B9DB7;
  
  /* Semantic */
  --vault-success: #2ECC71;
  --vault-warning: #F39C12;
  --vault-danger: #CC0000;
  --vault-info: #4A90D9;
}
```

### Typography
- **Display/Headings**: A bold, distinctive display font — think Playfair Display, Cinzel, or similar serif with gravitas. Premium and authoritative.
- **Body**: A clean, readable sans-serif — Outfit, DM Sans, or similar. Warm but professional.
- **Monospace** (code/prices): JetBrains Mono or Fira Code.
- **NEVER**: Inter, Roboto, Arial, system-ui, or any generic sans-serif.

### Design Direction
- **Theme**: Red, White & Blue — dark navy backgrounds, blue accents, red for action/urgency
- **Feel**: "Modern American pawn shop meets fintech app" — trustworthy, patriotic, authoritative
- **Mobile-first**: Thumb-zone optimized, touch targets 44px minimum
- **Logo**: Reuse existing "USA Pawn Holdings" wordmark + red pawnbroker globe icon (vector trace if needed)

## Tech Stack

| Layer | Technology | Notes |
|:---|:---|:---|
| Frontend | **Next.js 15** (App Router) | Vercel Hobby Tier (free) |
| AI (Chat/Logic) | **GPT-5-mini** | System prompt: USA Pawn identity |
| AI (Vision) | **GPT-4o** | Photo appraisals only |
| Database | **AWS DynamoDB** | On-Demand, Free Tier |
| Compute | **AWS Lambda** (Python) | Free Tier |
| SMS/Voice | **Twilio** | Programmable SMS + Voice |
| Hosting | **Vercel** | Auto-deploy from repo |

## Page Map

| Route | Purpose | Auth |
|:---|:---|:---|
| `/` | Hero landing — store showcase, gold ticker, chat widget | Public |
| `/appraise` | **FLAGSHIP** — AI photo appraisal portal | Public |
| `/inventory` | Browse inventory (seeded from scrape) | Public |
| `/info` | "How Pawning Works" — educational content | Public |
| `/login` | Auth gate (demo password: `12345`) | Public |
| `/dashboard` | Owner Command Center | Auth (`owner`) |
| `/staff` | Staff Portal — clock-in, item entry, queue | Auth (`staff`) |
| `/staff/clockin` | QR clock-in endpoint (accepts `?token=`) | Public (token-gated) |

## AI Function Tools
- `appraise_item(photo_url, description, category)` — Vision + spot prices → estimate
- `schedule_visit(customer_name, phone, preferred_time, item_description)` — Books appointment, sends SMS
- `check_inventory(category, keyword)` — Searches DynamoDB inventory
- `get_gold_spot_price()` — Current gold/silver/platinum per ounce
- `log_lead(source, customer_info, item_interest, estimated_value)` — Logs to dashboard
- `check_store_status()` — Open/closed + next opening
- `escalate_to_staff(reason)` — Flags high-value items (>$500)

## DynamoDB Tables
- `USA_Pawn_Leads` — Customer interactions, photos, estimates, status
- `USA_Pawn_Inventory` — Seeded from website scrape
- `USA_Pawn_Staff_Log` — Clock-in/out, compliance flags, shift notes
- `USA_Pawn_Appraisals` — Photo submissions, AI estimates, accuracy tracking
- `USA_Pawn_Conversations` — Full chat/SMS transcript archive
- `USA_Pawn_Store_Config` — Hours, contact info, specials, staff PINs, daily QR tokens

## Lambda Functions (Python)
- `dispatcher.py` — Routes Twilio webhooks to AI handlers
- `appraisal_engine.py` — Photo → Vision API → spot price → estimate
- `scheduler.py` — Appointment logic, conflict detection, SMS confirmation
- `staff_monitor.py` — Clock-in compliance, anomaly detection, cron alerts
- `lead_scorer.py` — Scores leads by value/urgency, pushes high-value to owner

## Key Features to Remember
1. **Persistent Chat Widget** on every page (bottom-right, same AI brain)
2. **QR Clock-In System** with rotating daily tokens (physical presence proof)
3. **Live Gold Price Ticker** in header bar
4. **Channel Hierarchy**: Web Chat → /appraise → SMS → Voice
5. **Auth**: Demo password `12345`, session cookie `vault_auth`, 24hr TTL
6. **SEO**: Neighborhood landing pages (`/arlington`, `/southside`, `/beaches`)
7. **Video**: Embed existing YouTube TV ads from gallery page
8. **Scraped Data**: All 5 pages of usapawnfl.com seeded into DynamoDB

## Agent Workflow
This project uses the **Plan Delegator** orchestration system:
- `Plan Delegator` reads `master-plan.md`, writes phases to `current-phase.md`
- `Execute Phase` reads `current-phase.md`, executes, writes `phase-result.md`
- `Verify Phase` checks work, writes `verification-result.md`
- All files live in `.plan-delegator/` with **exact naming** (no variations)

---
*Last Updated: 2026-02-14*
*Architecture Version: 1.0 — USA Pawn Holdings*
