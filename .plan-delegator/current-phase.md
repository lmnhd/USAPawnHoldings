# Phase 12 of 12: SEO Pages, Polish & Deployment

## Objective
Add neighborhood SEO landing pages, JSON-LD structured data for local search, final production polish (error boundaries, loading states, 404 page), and Vercel deployment readiness.

---

## Files to Create

1. **Create** `frontend/src/app/[neighborhood]/page.tsx` — Dynamic SEO landing pages for Jacksonville neighborhoods
2. **Create** `frontend/src/app/not-found.tsx` — 404 error page with Vault branding
3. **Create** `frontend/public/favicon.ico` — Vault-themed favicon (gold/black)
4. **Create** `frontend/public/og-image.png` — OG social share image (1200x630)
5. **Create** `docs/DEPLOYMENT_NOTES.md` — Deployment checklist and walkthrough

---

## Files to Modify

1. **Modify** `frontend/src/app/layout.tsx` — Add JSON-LD structured data
2. **Modify** `frontend/vercel.json` — Route configuration and redirects
3. **Modify** `frontend/.env.example` — Document all environment variables

---

## Exact Changes Required

### 1. Create `frontend/src/app/[neighborhood]/page.tsx`

**Purpose**: Dynamic SEO landing pages for 3 Jacksonville neighborhoods

#### Supported Neighborhoods
- `arlington` → Arlington / Jacksonville East
- `southside` → Southside / San Jose
- `beaches` → Beaches / Atlantic Beach / Neptune Beach

#### Metadata (per neighborhood)
```typescript
export async function generateMetadata({ params }: { params: { neighborhood: string } }): Promise<Metadata> {
  const neighborhoods = {
    arlington: {
      title: "Pawn Shop Near Arlington, Jacksonville | USA Pawn Holdings",
      description: "Arlington's trusted pawn shop — fast cash loans, jewelry buying, gold appraisals. Open 6 days/week at 6132 Merrill Rd. Free estimates!",
      keywords: "pawn shop Arlington, Arlington pawn, Jacksonville pawn shop east side, gold buyer Arlington"
    },
    southside: { /* similar */ },
    beaches: { /* similar */ }
  };
  
  const data = neighborhoods[params.neighborhood as keyof typeof neighborhoods];
  
  return {
    title: data?.title || "USA Pawn Holdings",
    description: data?.description,
    keywords: data?.keywords,
    openGraph: {
      title: data?.title,
      description: data?.description,
      url: `https://usapawn.vercel.app/${params.neighborhood}`,
      images: ['/og-image.png']
    }
  };
}
```

#### Page Content Structure
```tsx
<div className="min-h-screen bg-vault-black-deep">
  {/* Hero Section */}
  <section className="py-16 bg-vault-gold-gradient">
    <h1>Pawn Shop Near {neighborhoodName}</h1>
    <p>Your trusted local pawn shop in Jacksonville's {neighborhoodName} area</p>
    <button>Get Free Appraisal</button>
  </section>

  {/* Directions Section */}
  <section>
    <h2>Directions from {neighborhoodName}</h2>
    <p>{drivingDirections}</p>
    <iframe src="Google Maps embed" />
  </section>

  {/* Services Grid */}
  <section>
    <div className="grid">
      {/* Same services as homepage */}
    </div>
  </section>

  {/* Current Specials */}
  <section>
    <h2>Current Specials for {neighborhoodName} Residents</h2>
    {/* Video Games, Gold Buying, etc. */}
  </section>

  {/* CTA */}
  <section>
    <button>Visit Us Today</button>
    <p>6132 Merrill Rd Ste 1, Jacksonville, FL 32277</p>
  </section>
</div>
```

#### Neighborhood-Specific Data
```typescript
const neighborhoodData = {
  arlington: {
    name: "Arlington",
    directions: "From Arlington Expressway, take Merrill Rd exit south. We're 2 miles on the right, just past Regency Square Blvd.",
    landmarks: ["Arlington Town Center", "Regency Square Mall", "UF Health North"],
    driveTime: "~10 minutes from Arlington Town Center"
  },
  southside: {
    name: "Southside",
    directions: "Head north on Southside Blvd, turn right on Merrill Rd. We're 3 miles ahead on the left.",
    landmarks: ["Town Center", "St. Johns Town Center", "Deerwood"],
    driveTime: "~15 minutes from Town Center"
  },
  beaches: {
    name: "Jacksonville Beaches",
    directions: "Take Beach Blvd west to Merrill Rd, turn right. Store is 1 mile north on the right.",
    landmarks: ["Atlantic Beach", "Neptune Beach", "Jacksonville Beach"],
    driveTime: "~20 minutes from Beach Blvd"
  }
};
```

#### Static Paths Generation
```typescript
export function generateStaticParams() {
  return [
    { neighborhood: 'arlington' },
    { neighborhood: 'southside' },
    { neighborhood: 'beaches' }
  ];
}
```

---

### 2. Create `frontend/src/app/not-found.tsx`

**Purpose**: Branded 404 error page

#### Design
- Full-screen centered message
- Gold USA Pawn Holdings logo
- "Page Not Found" heading (Playfair Display)
- Helpful subtext: "Looks like this treasure is lost in the vault..."
- Three CTA buttons:
  - "Go Home" → `/`
  - "Get Appraisal" → `/appraise`
  - "Browse Inventory" → `/inventory`
- Dark Vault theme background with subtle gold gradient
- Responsive layout

#### Code Structure
```tsx
export default function NotFound() {
  return (
    <div className="min-h-screen bg-vault-black-deep flex items-center justify-center">
      <div className="text-center px-4">
        <div className="mb-8">
          {/* USA Pawn logo */}
        </div>
        <h1 className="text-6xl font-display text-vault-text-light mb-4">404</h1>
        <p className="text-2xl text-vault-gold mb-2">Page Not Found</p>
        <p className="text-vault-text-muted mb-8">
          Looks like this treasure is lost in the vault...
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">Go Home</Link>
          <Link href="/appraise">Get Appraisal</Link>
          <Link href="/inventory">Browse Inventory</Link>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Create Favicon & OG Image

#### Favicon (`frontend/public/favicon.ico`)
- **Design**: Gold pawnbroker globe icon (from USA Pawn logo) on black background
- **Size**: 32x32, 16x16 (multi-res .ico)
- **Format**: ICO file
- **Placement**: `public/favicon.ico` (auto-detected by Next.js)

If you can't generate the image:
- Create placeholder: Black background, gold "UP" monogram
- Document in DEPLOYMENT_NOTES.md: "TODO: Replace favicon with proper USA Pawn logo"

#### OG Image (`frontend/public/og-image.png`)
- **Design**: 
  - Black background (`#0D0D0D`)
  - Gold gradient bar across top (`#C9A84C` → `#D4A843`)
  - "USA Pawn Holdings" wordmark (Playfair Display, white, large)
  - Tagline below: "Where We Take Anything of Value" (Outfit, gold)
  - Bottom: "Jacksonville's Trusted Pawn Shop Since [Year]"
- **Size**: 1200x630px (standard OG image)
- **Format**: PNG
- **Text**: High-contrast, readable at small sizes

If you can't generate the image:
- Create simple text-based version with proper dimensions
- Document in DEPLOYMENT_NOTES.md: "TODO: Replace with professional OG image"

---

### 4. Modify `frontend/src/app/layout.tsx` — Add JSON-LD Structured Data

**Add** after opening `<body>` tag:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "PawnShop",
          "name": "USA Pawn Holdings",
          "description": "Jacksonville's trusted pawn shop — fast cash loans, jewelry buying, gold & silver appraisals. Family-owned since [year].",
          "url": "https://usapawn.vercel.app",
          "telephone": "+1-904-744-1776",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "6132 Merrill Rd Ste 1",
            "addressLocality": "Jacksonville",
            "addressRegion": "FL",
            "postalCode": "32277",
            "addressCountry": "US"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "30.2672",
            "longitude": "-81.6558"
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              "opens": "10:00",
              "closes": "18:00"
            },
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": "Saturday",
              "opens": "10:00",
              "closes": "17:00"
            }
          ],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "reviewCount": "51"
          },
          "priceRange": "$$",
          "image": "https://usapawn.vercel.app/og-image.png",
          "sameAs": [
            "https://www.facebook.com/usapawnholdings",
            "https://www.instagram.com/usapawnholdings"
          ]
        },
        {
          "@type": "Product",
          "name": "Gold Jewelry Pawn Loans",
          "description": "Fast cash loans on gold jewelry — rings, necklaces, bracelets. Get up to 33% of value instantly.",
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "USD",
            "lowPrice": "50",
            "highPrice": "10000"
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is a pawn loan?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "A pawn loan is a collateral-based loan where you leave an item of value with us and receive cash instantly. Loans are 30 days with 25% interest. You can reclaim your item anytime by repaying the loan plus interest."
              }
            },
            {
              "@type": "Question",
              "name": "What can I pawn?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "We accept jewelry, gold, silver, electronics, tools, musical instruments, video games, designer bags, watches, and more. If it has value, we take it!"
              }
            },
            {
              "@type": "Question",
              "name": "Do I need ID to pawn items?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, valid government-issued photo ID is required for all pawn transactions in Florida."
              }
            }
          ]
        }
      ]
    })
  }}
/>
```

**Location**: Insert after `<body>` and before `{children}` in layout.tsx

---

### 5. Modify `frontend/vercel.json` — Route Configuration

**Add/Update** route config:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    },
    {
      "source": "/products",
      "destination": "/inventory",
      "permanent": false
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

### 6. Update `frontend/.env.example` — Document All Variables

**Replace** with complete list:

```env
# OpenAI API
OPENAI_API_KEY=sk-proj-...

# AWS DynamoDB
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Twilio SMS/Voice
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1904...

# Authentication
DEMO_AUTH_PASSWORD=12345

# App Configuration
NEXT_PUBLIC_SITE_URL=https://usapawn.vercel.app

# QR Clock-In System
DAILY_QR_TOKEN_SECRET=your-secret-key-here

# Optional: Metals API (for live gold prices)
METALS_API_KEY=... 

# Optional: Google Maps Embed API
GOOGLE_MAPS_API_KEY=...
```

---

### 7. Create `docs/DEPLOYMENT_NOTES.md` — Deployment Checklist

**Create** comprehensive deployment guide:

````markdown
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
4. See `docs/QR_CODES.md` for placement guide

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

### No Backend Lambda Yet
All AI/API logic is in Next.js API routes (`/api/*`). For production:
- Move heavy logic to AWS Lambda functions
- Keep Next.js API routes as thin proxies
- See `backend/lambda/` for Python function stubs

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
- **Developer**: [Your name/contact]

---

*Last Updated*: 2026-02-13  
*Deployment Version*: 1.0 (24-Hour PoC)
````

---

## Commands to Execute

### Step 1: Create all new files
(Use file creation tools for each file above)

### Step 2: Verify TypeScript compilation
```powershell
cd frontend
npx tsc --noEmit
```

### Step 3: Test dev server startup
```powershell
npm run dev
```
Check that server starts without errors and homepage loads.

### Step 4: Return to project root
```powershell
cd ..
```

---

## Verification Criteria

### Neighborhood Pages
- [ ] Pages generated for all 3 neighborhoods: `/arlington`, `/southside`, `/beaches`
- [ ] Each page has unique meta title, description, keywords
- [ ] Driving directions specific to each neighborhood
- [ ] Google Maps embed shows store location
- [ ] All pages responsive at mobile/tablet/desktop
- [ ] OG meta tags present for social sharing

### 404 Page
- [ ] `/nonexistent-route` shows branded 404 page
- [ ] USA Pawn logo displayed
- [ ] Three CTA buttons functional (Home, Appraise, Inventory)
- [ ] Dark Vault theme with gold accents
- [ ] Mobile-responsive layout

### Favicon & OG Image
- [ ] Favicon visible in browser tab
- [ ] OG image dimensions: 1200x630px
- [ ] OG image displays when URL shared on social media
- [ ] Both use gold/black Vault color palette

### JSON-LD Structured Data
- [ ] JSON-LD script present in `<body>` of layout.tsx
- [ ] PawnShop schema includes: name, address, phone, hours, rating
- [ ] Product schema includes price ranges
- [ ] FAQPage schema includes 3+ questions
- [ ] Valid schema (test at https://validator.schema.org/)

### Vercel Configuration
- [ ] `vercel.json` present with headers, redirects, rewrites
- [ ] Security headers configured (X-Frame-Options, etc.)
- [ ] Redirect from `/home` to `/` works
- [ ] API routes not blocked by config

### Environment Variables
- [ ] `.env.example` lists ALL required variables (10+)
- [ ] Each variable has descriptive comment
- [ ] Sensitive values use placeholder format (e.g., `sk-proj-...`)

### Deployment Docs
- [ ] `docs/DEPLOYMENT_NOTES.md` exists
- [ ] Pre-deployment checklist complete (DynamoDB tables, env vars)
- [ ] Vercel deployment steps clear and sequential
- [ ] All 3 demo scenes documented with step-by-step instructions
- [ ] Known limitations section present
- [ ] Rollback plan documented

### Code Quality
- [ ] TypeScript compiles without NEW errors (`npx tsc --noEmit`)
- [ ] `npm run dev` starts without errors
- [ ] All pages load at `localhost:3000`
- [ ] No console errors on any page
- [ ] Mobile-responsive at 375px, 768px, 1024px, 1440px breakpoints

### Final Polish
- [ ] All pages use Vault CSS variables consistently
- [ ] Loading states on all async operations
- [ ] Error boundaries catch React errors gracefully
- [ ] Images use `next/image` for optimization (where applicable)
- [ ] No layout shift (CLS) on page load
- [ ] Chat widget loads on all pages
- [ ] Gold ticker displays at top of all pages
- [ ] Navigation works on all pages (NavBar links functional)

---

## Design Notes
- **Neighborhood Pages**: Practical SEO, not flashy — focus on local keywords, clear directions, trust signals
- **404 Page**: Brand-consistent but lighthearted — "lost treasure" messaging softens the error
- **JSON-LD**: Comprehensive but accurate — don't inflate rating or fake review count
- **Deployment Docs**: Written for owner handoff — assumes zero technical background for Vercel dashboard steps
- **Polish**: Production-grade, not prototype quality — every page should feel finished

---

## Expected Duration
⏱️ **90-120 minutes**

Seven files (3-4 new pages, 3 modifications, 1 doc), plus testing and deployment verification.

---

## Result File Location
**YOU MUST WRITE YOUR RESULTS TO:** `.plan-delegator/phase-result.md`

---

## STOP CONDITIONS
⛔ DO NOT proceed to any post-deployment steps (Twilio webhook config, QR generation)
⛔ DO NOT deploy to Vercel yourself — document deployment steps only
⛔ If image generation (favicon/OG) fails, document placeholder approach and mark TODO
⛔ If any file is unclear, write "BLOCKED: [reason]" to phase-result.md and STOP
