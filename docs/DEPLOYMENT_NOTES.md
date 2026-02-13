# Deployment Notes — USA Pawn Holdings PoC

## Pre-Deployment Checklist

### Environment Variables (Vercel Dashboard)
- [ ] `OPENAI_API_KEY` — GPT-4o + GPT-5-mini access
- [ ] `AWS_ACCESS_KEY_ID` — DynamoDB read/write
- [ ] `AWS_SECRET_ACCESS_KEY` — DynamoDB credentials
- [ ] `AWS_REGION` — Set to `us-east-1`
- [ ] `TWILIO_ACCOUNT_SID` — SMS/Voice webhook auth
- [ ] `TWILIO_AUTH_TOKEN` — Twilio secret
- [ ] `TWILIO_PHONE_NUMBER` — +1904-XXX-XXXX
- [ ] `DEMO_AUTH_PASSWORD` — Set to `12345` for demo
- [ ] `NEXT_PUBLIC_SITE_URL` — Production URL
- [ ] `DAILY_QR_TOKEN_SECRET` — Random 32-char string

### DynamoDB Tables (AWS Console)
Verify all 6 tables exist in `us-east-1`:
- [ ] `USA_Pawn_Leads`
- [ ] `USA_Pawn_Inventory`
- [ ] `USA_Pawn_Staff_Log`
- [ ] `USA_Pawn_Appraisals`
- [ ] `USA_Pawn_Conversations`
- [ ] `USA_Pawn_Store_Config`

Run `backend/scripts/create_tables.py` if missing.

### Seeded Data
- [ ] Inventory seeded (7 categories, 42 images)
- [ ] Store config seeded (hours, contact, initial QR token)
- [ ] Staff PINs configured (or ready for first-time setup)

### Code Quality
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
- [ ] No console errors on homepage
- [ ] All pages load without 500 errors
- [ ] ChatWidget appears on all pages
- [ ] GoldTicker shows in header

---

## Vercel Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Final PoC build - all 12 phases complete"
git push origin main
```

### 2. Connect Repository to Vercel
1. Go to https://vercel.com/new
2. Import Git Repository → Select your GitHub repo
3. Framework Preset: **Next.js**
4. Root Directory: `frontend` (IMPORTANT)
5. Build Command: Default (`next build`)
6. Output Directory: Default (`.next`)

### 3. Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables:
- Add ALL variables from `.env.example`
- Set scope: **Production**, **Preview**, **Development**

### 4. Deploy
Click **Deploy** — first build takes ~3-5 minutes

### 5. Verify Deployment
Once live, test:
- [ ] Homepage loads (`/`)
- [ ] Appraisal page functional (`/appraise`)
- [ ] Chat widget works (send message)
- [ ] Login works (password: `12345`)
- [ ] Dashboard loads after login (`/dashboard`)
- [ ] Staff portal redirects to login (`/staff`)
- [ ] Inventory page shows seeded items (`/inventory`)
- [ ] SEO pages exist (`/arlington`, `/southside`, `/beaches`)

---

## Post-Deployment Configuration

### Twilio Webhook Setup
Once deployed, configure Twilio webhooks:
1. Go to Twilio Console → Phone Numbers
2. Select USA Pawn phone number
3. Set **Messaging Webhook**:
   - URL: `https://usapawn.vercel.app/api/twilio/incoming-sms`
   - Method: POST
4. Set **Voice Webhook**:
   - URL: `https://usapawn.vercel.app/api/twilio/incoming-call`
   - Method: POST
5. Save configuration

### QR Code Generation
Generate daily QR codes for staff clock-in:
1. Base URL: `https://usapawn.vercel.app/staff/clockin?token={TODAY_TOKEN}`
2. Token generation logic in `lib/auth.ts` → `generateDailyQRToken()`
3. Generate fresh QR each day, print for physical placement

### Custom Domain (Optional)
1. Add domain in Vercel dashboard
2. Update DNS settings per Vercel instructions
3. Update `NEXT_PUBLIC_SITE_URL` environment variable
4. Redeploy

---

## Demo Walkthrough (All 3 Scenes)

### Scene 1: Customer Appraisal Journey
1. Visit `/appraise`
2. Upload photo of jewelry (e.g., gold necklace)
3. Wait for Vision API processing
4. Verify estimate appears with:
   - Item identification
   - Metal type/karat
   - Estimated weight
   - Current spot price rate
   - Value range
5. Click "Book In-Store Appraisal"
6. Enter name + phone
7. Verify SMS confirmation sent (Twilio)
8. Check `/dashboard` → lead should appear in feed

### Scene 2: Staff Accountability
1. Staff scans daily QR code → redirects to `/staff/clockin?token=...`
2. Enter 4-digit PIN
3. Clock in → timestamp recorded
4. Navigate to `/dashboard` (as owner)
5. Verify staff log shows:
   - Clock-in time
   - Active shift duration
   - Compliance status (green)

### Scene 3: Door Walk-Up Rescue
1. Customer scans door QR → `/` with `?source=door` param
2. Chat widget auto-opens with door greeting:
   - "Welcome! Scan the door QR? Let's get you an instant appraisal..."
3. Customer uploads photo in chat
4. AI processes → calls `appraise_item()` function
5. Estimate returned in chat
6. Customer says "I want to come in"
7. AI calls `schedule_visit()` → SMS sent
8. Lead logged to dashboard

---

## Known Limitations (PoC Scope)

### Mock/Demo Elements
- Auth password is hardcoded (`12345`)
- Staff PINs stored in plain text (demo only)
- Daily QR tokens must be manually regenerated
- No user account system (single-role auth)

### Production TODO
- [ ] Implement bcrypt PIN hashing
- [ ] Add OAuth2 login (Google, Facebook)
- [ ] Automate daily QR token rotation (cron job)
- [ ] Add email notifications (currently SMS-only)
- [ ] Implement proper session management (JWT)
- [ ] Add rate limiting on API routes
- [ ] Set up CloudWatch alarms for Lambda errors
- [ ] Add Sentry error tracking
- [ ] Optimize images with next/image
- [ ] Add sitemap.xml generation
- [ ] Replace favicon with proper USA Pawn logo (see TODO below)
- [ ] Replace OG image with professional design (see TODO below)

### No Backend Lambda Yet
All AI/API logic is in Next.js API routes (`/api/*`). For production:
- Move heavy logic to AWS Lambda functions
- Keep Next.js API routes as thin proxies
- See `backend/lambda/` for Python function stubs

---

## Asset TODOs

### Favicon (`public/favicon.ico`)
- **Current**: SVG placeholder with gold "UP" monogram on black
- **Needed**: Proper multi-size .ico with the red pawnbroker globe from USA Pawn logo
- **Sizes**: 16x16, 32x32, 48x48
- **Tool**: Use https://favicon.io or Figma export

### OG Image (`public/og-image.png`)
- **Current**: SVG placeholder with brand text (1200×630)
- **Needed**: Professional design with USA Pawn wordmark
- **Specs**: 1200×630px PNG, black background, gold accents
- **Text**: "USA Pawn Holdings" + "Where We Take Anything of Value"
- **Tool**: Figma, Canva, or designer

---

## Rollback Plan

If deployment fails or critical bug found:
1. Revert last commit: `git revert HEAD`
2. Push: `git push origin main`
3. Vercel auto-deploys previous working version
4. Or: Use Vercel dashboard → Deployments → click previous build → "Promote to Production"

---

## Support Contacts

- **Owner**: Desiree Corley Jones
- **Store Phone**: (904) 744-1776
- **Store Address**: 6132 Merrill Rd Ste 1, Jacksonville, FL 32277

---

*Last Updated*: 2026-02-13
*Deployment Version*: 1.0 (24-Hour PoC)
