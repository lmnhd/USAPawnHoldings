'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Phone,
  Globe,
  QrCode,
  Mic,
  Camera,
  BarChart3,
  MessageCircle,
  LayoutDashboard,
  MessageSquare,
  Users,
  Clipboard,
  Search,
  Sparkles,
  Home,
  ListChecks,
} from 'lucide-react'

type BadgeVariant = 'critical' | 'high' | 'medium' | 'revenue'
type IconName = 'phone' | 'globe' | 'qr' | 'mic' | 'camera' | 'chart' | 'message' | 'dashboard' | 'chat' | 'people' | 'clipboard' | 'search' | 'sparkles' | 'home' | 'list'

interface GapCta {
  label: string
  href: string
  icon: IconName
  external?: boolean
  variant: 'phone' | 'primary' | 'secondary' | 'qr'
}

interface Gap {
  num: string
  badge: BadgeVariant
  badgeLabel: string
  title: string
  problem: string
  solution: string
  ctas: GapCta[]
}

interface Quote {
  stars: number
  text: string
  meta: string
}

interface Capability {
  icon: ReactNode
  title: string
  desc: string
  bg: string
}

interface RoiRow {
  metric: string
  before: string
  after: string
}

const businessName = 'USA Pawn Holdings'
const reportDate = 'February 2026'
const systemName = 'The Vault'
const demoPhoneDisplay = '(904) 871-8226'
const demoPhoneHref = 'tel:+19048718226'

const gaps: Gap[] = [
  {
    num: '01',
    badge: 'critical',
    badgeLabel: '🔴 Critical · Revenue Impact',
    title: 'Phone calls and web inquiries are hitting dead ends near closing time',
    problem:
      'The public signal says one thing, but customer experience can say another in the final hour. In a documented Google review, a customer called first, then arrived before posted close and was still blocked at the door. Missing these calls or web chats loses same-day revenue.',
    solution:
      'Route all near-close and after-hours phone and web demand into an always-on AI chat and phone flow. It captures contact details, answers questions, and secures the lead instantly.',
    ctas: [
      { label: 'Call Live Demo Line', href: demoPhoneHref, icon: 'phone', variant: 'phone' },
      { label: 'Interactive Landing Flow', href: '/', icon: 'globe', variant: 'primary' },
    ],
  },
  {
    num: '02',
    badge: 'high',
    badgeLabel: '🟠 High · End-of-Day Capture',
    title: 'Physical walk-ins after hours hit a locked door instead of a digital storefront',
    problem:
      'Some customers arrive right at close with real intent to do business. When the door is locked, that physical momentum is completely lost. There is no immediate way to transition them from the sidewalk to a digital interaction.',
    solution:
      'Place a smart QR code on the front door that instantly loads the homepage and offers a voice-enabled AI assistant. It greets them, takes their appraisal request, and captures the demand for the next morning.',
    ctas: [
      { label: 'Test Door QR Chat Flow', href: '/?heroMode=general&heroOpen=1', icon: 'qr', variant: 'qr' },
      { label: 'Test Voice Assistant (wait for it...)', href: '/?heroMode=voice&heroOpen=1', icon: 'mic', variant: 'secondary' },
    ],
  },
  {
    num: '03',
    badge: 'critical',
    badgeLabel: '🔴 Critical · Revenue Impact',
    title: 'No instant appraisal channel when customers can’t get in-store access',
    problem:
      'Your online footprint shows no reliable instant valuation path when customers are researching after work hours. The result is drift: people with items ready to pawn or sell move to the next shop that responds first. This is exactly where a fast photo-first intake creates measurable lift.',
    solution:
      'Use the built guided appraisal flow to collect photos and context in minutes, return a ballpark range, and convert that momentum into next-day in-store visits with staff visibility.',
    ctas: [
      { label: 'Start Photo Appraisal', href: '/appraise', icon: 'camera', variant: 'primary' },
      { label: 'View Appraisal in Dashboard Leads', href: '/dashboard?tab=leads', icon: 'chart', variant: 'secondary' },
    ],
  },
  {
    num: '05',
    badge: 'medium',
    badgeLabel: '🔵 Medium · Operational',
    title: 'Owner visibility into frontline consistency is too delayed',
    problem:
      'The discovered pattern suggests operations can drift when leadership is split across responsibilities. Without structured logs and compliance alerts, it is hard to spot timing gaps, clock anomalies, or service inconsistency early enough to correct behavior in real time.',
    solution:
      'Use the owner dashboard as command center for lead flow, conversation history, and staff monitoring so decisions happen from one pane.',
    ctas: [
      { label: 'Open Owner Dashboard', href: '/dashboard', icon: 'dashboard', variant: 'secondary' },
      { label: 'Review Conversation Feed', href: '/dashboard', icon: 'chat', variant: 'secondary' },
    ],
  },
  {
    num: '06',
    badge: 'medium',
    badgeLabel: '🔵 Medium · Ops Copilot',
    title: 'Staff and management need an intelligent operational helper during live shifts',
    problem:
      'Front-counter teams and managers regularly need fast answers on inventory checks, customer handling, scheduling conflicts, and next best actions. Without an ops-focused helper, small delays stack up and shift execution slows down.',
    solution:
      'Use the Operational AI chat helper as an in-shift copilot for staff and management so routine decisions, lookups, and workflow guidance happen immediately in one consistent interface.',
    ctas: [
      { label: 'Open Staff Ops View', href: '/staff?heroMode=ops&heroOpen=1', icon: 'people', variant: 'secondary' },
      { label: 'Open Manager Ops View', href: '/dashboard?heroMode=ops&heroOpen=1', icon: 'dashboard', variant: 'secondary' },
    ],
  },
  {
    num: '07',
    badge: 'medium',
    badgeLabel: '🔵 Medium · Team Operations',
    title: 'Staff workflow tools need faster in-shift execution',
    problem:
      'Without a dedicated staff workflow screen, clock-in, queue handling, and item intake create avoidable drag. This slows front-counter throughput and reduces consistency during peak periods.',
    solution:
      'Use the staff portal and QR clock-in flow to keep shift operations clean, timestamped, and quick for daily execution.',
    ctas: [
      { label: 'View Staff Portal', href: '/staff', icon: 'people', variant: 'secondary' },
      { label: 'Review Staff Logs (Dashboard)', href: '/dashboard', icon: 'clipboard', variant: 'secondary' },
    ],
  },
  {
    num: '08',
    badge: 'revenue',
    badgeLabel: '🟢 Revenue Upside · Inventory Lift',
    title: 'Real-time online inventory can convert discovery into daily upsell',
    problem:
      'Your notes and footprint review both point to missing customer-facing real-time inventory. Buyers who can search category and price before they visit are more likely to arrive with intent and purchase confidence, especially for repeat categories.',
    solution:
      'Leverage the searchable inventory grid with filters, detail dialogs, and chat handoff so item discovery turns into immediate questions and high-intent store visits; keep gold-specific content as supporting material, not the lead experience.',
    ctas: [
      { label: 'Search Jewelry Inventory', href: '/inventory?category=Jewelry', icon: 'search', variant: 'primary' },
      { label: 'View Gold Landing (Secondary)', href: '/gold', icon: 'sparkles', variant: 'secondary' },
    ],
  },
  {
    num: '09',
    badge: 'revenue',
    badgeLabel: '🟢 Revenue Upside · After-Hours Capture',
    title: 'After-hours demand is present but not fully harvested',
    problem:
      'Pawn intent often peaks outside store-ready windows. Without a dedicated after-hours flow, each off-hour inquiry becomes a silent handoff to competitors. Your own notes identify this as a key missed opportunity.',
    solution:
      'Use QR-entry and appraisal-first door journeys to capture off-hour intent, create structured leads, and re-route prospects into next-day appointments instead of drop-off.',
    ctas: [
      { label: 'Launch Door QR Experience', href: '/?source=door', icon: 'qr', variant: 'qr' },
      { label: 'Capture After-Hours Appraisal', href: '/?heroMode=appraisal&heroOpen=1', icon: 'camera', variant: 'primary' },
    ],
  },
]

const quotes: Quote[] = [
  {
    stars: 1,
    text:
      '“Terrible customer service... I called at 445... got to store at 450... looked at me through the locked door and hand signals for me to go away.”',
    meta: 'Google Maps Review — Gap #01',
  },
  {
    stars: 2,
    text: '"late" / "locked early"',
    meta: 'Google Maps Theme Keywords — Gap #01',
  },
]

const roiRows: RoiRow[] = [
  {
    metric: 'Missed lead conversion windows',
    before: 'Untracked, inconsistent follow-up',
    after: 'Structured intake with immediate routing',
  },
  {
    metric: 'After-hours appraisal requests',
    before: 'Mostly lost or deferred',
    after: 'Captured through photo-first flow',
  },
  {
    metric: 'Owner visibility into operations',
    before: 'Delayed and anecdotal',
    after: 'Live logs, alerts, and dashboard view',
  },
]

const capabilities: Capability[] = [
  {
    icon: '📸',
    title: 'AI Photo Appraisals',
    desc: 'Customers submit item photos and get guided ballpark estimates that route directly into your lead and follow-up workflow.',
    bg: 'bg-vault-gold/20',
  },
  {
    icon: '💬',
    title: 'Persistent Live Chat',
    desc: 'A single AI brain follows the customer across pages and captures intent even when staff are unavailable.',
    bg: 'bg-vault-surface-elevated',
  },
  {
    icon: '📦',
    title: 'Searchable Inventory',
    desc: 'Category + keyword filtering turns passive browsing into actionable, high-intent product conversations.',
    bg: 'bg-vault-surface-elevated',
  },
  {
    icon: '📈',
    title: 'Lead Feed + Conversation Archive',
    desc: 'Owner dashboard aggregates leads, appraisals, and customer conversations for fast triage and visibility.',
    bg: 'bg-vault-gold/20',
  },
  {
    icon: '🕒',
    title: 'QR Staff Accountability',
    desc: 'Clock-in and compliance patterns are monitored with timestamped records to reduce operational drift.',
    bg: 'bg-vault-surface-elevated',
  },
  {
    icon: '📱',
    title: 'Multi-Channel Intake',
    desc: 'Web, SMS, and voice channels funnel into one system to reduce missed conversations and protect conversion.',
    bg: 'bg-vault-surface-elevated',
  },
]

const phaseTwoAdditions = [
  'Online ticket creation during appraisals for faster in-store processing',
  'Staff research accelerator for faster merchandising and pricing checks',
  'Unified integrations layer for CRM and social management tools',
  'Auto-posting new inventory to social channels',
  'Marketplace automation workflow for Amazon listings',
  'Auto tracking/archive removal from inventory after sale completion',
  'SEO expansion (neighborhood landing pages, schema markup, local search optimization)',
  'AI visibility optimization (AVO) for Google Search, Generative AI, and AI agent shopping experiences',
]

const badgeClasses: Record<BadgeVariant, string> = {
  critical: 'bg-vault-red/20 text-vault-red border-vault-red/40',
  high: 'bg-vault-warning/20 text-vault-warning border-vault-warning/40',
  medium: 'bg-vault-info/20 text-vault-info border-vault-info/40',
  revenue: 'bg-vault-success/20 text-vault-success border-vault-success/40',
}

const ctaClasses: Record<GapCta['variant'], string> = {
  phone:
    'border border-vault-gold bg-vault-gold text-vault-text-on-gold shadow-[0_0_0_1px_rgba(255,255,255,0.15)_inset] hover:bg-vault-gold-light hover:border-vault-gold-light',
  primary:
    'border border-vault-success/60 bg-vault-success/15 text-vault-text-light hover:bg-vault-success/25',
  secondary:
    'border border-vault-border text-vault-text-light hover:border-vault-gold/60 hover:bg-vault-hover-overlay',
  qr: 'relative overflow-hidden border border-vault-gold/70 bg-vault-black text-vault-gold hover:border-vault-gold hover:bg-vault-surface-elevated',
}

function renderStars(stars: number): string {
  return `${'★'.repeat(Math.max(0, Math.min(5, stars)))}${'☆'.repeat(Math.max(0, 5 - Math.min(5, stars)))}`
}

function getIconComponent(iconName: IconName) {
  const iconMap: Record<IconName, typeof Phone> = {
    phone: Phone,
    globe: Globe,
    qr: QrCode,
    mic: Mic,
    camera: Camera,
    chart: BarChart3,
    message: MessageCircle,
    dashboard: LayoutDashboard,
    chat: MessageSquare,
    people: Users,
    clipboard: Clipboard,
    search: Search,
    sparkles: Sparkles,
    home: Home,
    list: ListChecks,
  }
  return iconMap[iconName]
}

function GapCtaLink({ cta }: { cta: GapCta }) {
  const baseClass = `inline-flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${ctaClasses[cta.variant]}`
  const IconComponent = getIconComponent(cta.icon)
  
  const qrOverlay = cta.variant === 'qr'
    ? (
      <>
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(255,255,255,0.24) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.24) 1px, transparent 1px)',
            backgroundSize: '6px 6px',
          }}
        />
        <span aria-hidden className="pointer-events-none absolute left-1 top-1 h-2.5 w-2.5 border border-vault-gold/90" />
        <span aria-hidden className="pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 border border-vault-gold/90" />
        <span aria-hidden className="pointer-events-none absolute left-1 bottom-1 h-2.5 w-2.5 border border-vault-gold/90" />
      </>
    )
    : null

  const content = (
    <>
      {qrOverlay}
      <IconComponent 
        size={18} 
        strokeWidth={2.5}
        className="relative z-10 flex-shrink-0"
        aria-hidden
      />
      <span className="relative z-10">{cta.label}</span>
    </>
  )

  if (cta.href.startsWith('tel:')) {
    return (
      <a href={cta.href} className={baseClass}>
        {content}
      </a>
    )
  }

  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noreferrer" className={baseClass}>
        {content}
      </a>
    )
  }

  return (
    <Link href={cta.href} className={baseClass}>
      {content}
    </Link>
  )
}

export default function PitchPage() {
  return (
    <main
      className="
        min-h-screen bg-black text-vault-text-light
        [color-scheme:dark]
        [--vault-gold:#8B5CF6] [--vault-gold-light:#A78BFA]
        [--vault-black:#140C1F] [--vault-black-deep:#000000]
        [--vault-surface:#1A1230] [--vault-surface-elevated:#231A3D]
        [--vault-red:#CC0000] [--vault-red-hover:#E60000]
        [--vault-text-light:#D9D2E9] [--vault-text-on-gold:#FFFFFF] [--vault-text-muted:#A79BBF]
        [--vault-success:#2ECC71] [--vault-warning:#F39C12] [--vault-danger:#CC0000] [--vault-info:#8B5CF6]
        [--vault-hover-overlay:rgba(139,92,246,0.08)] [--vault-border:rgba(139,92,246,0.2)]
      "
    >
      <div className="px-5 py-12 mx-auto max-w-7xl sm:px-8 lg:px-10">
        <header className="flex flex-col gap-2 pb-6 mb-10 border-b border-vault-border sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-vault-text-muted">{businessName} · Gaps & Fixes</p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-vault-text-muted">{reportDate}</p>
        </header>

        <section className="mb-12" aria-labelledby="section-01-heading">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-vault-text-muted">Section 01 — The Gaps</p>
          <h1
            id="section-01-heading"
            className="mt-3 text-5xl leading-tight font-display sm:text-6xl lg:text-7xl"
          >
            <span className="text-vault-gold">Hi, I&apos;m Nate!</span>{' '}
            <span className="text-vault-text-light">- Here&apos;s what I found, then built for you.</span>
          </h1>
          <div className="grid mt-10 gap-7">
            {gaps.map((gap) => (
              <article key={gap.num} className="p-6 border rounded-2xl border-vault-border bg-vault-surface/75 sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-base text-vault-gold">{gap.num}</span>
                  <span
                    className={`rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.15em] ${badgeClasses[gap.badge]}`}
                  >
                    {gap.badgeLabel}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-3xl leading-tight sm:text-[2rem]">{gap.title}</h2>
                <p className="mt-4 text-base leading-8 text-vault-text-light/90">{gap.problem}</p>

                <div className="p-5 mt-6 border-l-4 border-vault-gold bg-vault-surface-elevated/75">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-vault-gold">✦ The Fix</p>
                  <p className="mt-3 text-base leading-8 text-vault-text-light/90">{gap.solution}</p>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  {gap.ctas.map((cta) => (
                    <GapCtaLink key={`${gap.num}-${cta.label}`} cta={cta} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="p-6 mb-12 border rounded-2xl border-vault-border bg-vault-surface/55 sm:p-9" aria-labelledby="section-02-heading">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-vault-text-muted">Section 02 — The Evidence</p>
          <h2 id="section-02-heading" className="mt-3 text-4xl font-display sm:text-5xl">
            Real words. Real customers.
          </h2>
          <div className="grid gap-5 mt-8 md:grid-cols-2">
            {quotes.map((quote, index) => (
              <article key={`${quote.meta}-${index}`} className="p-5 border rounded-xl border-vault-border bg-vault-surface-elevated/80">
                <p className="font-mono text-sm uppercase tracking-[0.15em] text-vault-gold">{renderStars(quote.stars)}</p>
                <p className="mt-3 text-base italic leading-8 text-vault-text-light/90">{quote.text}</p>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-vault-text-muted">{quote.meta}</p>
              </article>
            ))}
          </div>
          <blockquote className="pl-5 text-2xl leading-relaxed border-l-4 mt-7 border-vault-gold font-display text-vault-text-light/95">
            Customers can describe the same business as “Great Service” and “Locked Doors” in the same era, which signals that consistency is now the true competitive edge.
          </blockquote>
        </section>

        <section className="mb-12" aria-labelledby="section-03-heading">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-vault-text-muted">Section 03 — The Math</p>
          <h2 id="section-03-heading" className="mt-3 text-4xl font-display sm:text-5xl">
            What the gaps cost annually.
          </h2>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.15em] text-vault-text-muted">All figures below are conservative estimates.</p>

          <div className="grid gap-4 mt-7 md:grid-cols-3">
            <article className="p-5 border rounded-xl border-vault-red/40 bg-vault-red/10">
              <p className="font-mono text-sm uppercase tracking-[0.16em] text-vault-red">Revenue leak</p>
              <h3 className="mt-2 text-3xl font-display sm:text-4xl">$18,720 / year</h3>
              <p className="mt-2 text-base leading-7 text-vault-text-light/90">Formula: 3 missed leads/week × $120 avg ticket profit × 52 weeks.</p>
            </article>
            <article className="p-5 border rounded-xl border-vault-warning/45 bg-vault-warning/10">
              <p className="font-mono text-sm uppercase tracking-[0.16em] text-vault-warning">Admin drag</p>
              <h3 className="mt-2 text-3xl font-display sm:text-4xl">286 hrs / year</h3>
              <p className="mt-2 text-base leading-7 text-vault-text-light/90">Formula: 5.5 preventable hours/week × 52 weeks.</p>
            </article>
            <article className="p-5 border rounded-xl border-vault-info/45 bg-vault-info/10">
              <p className="font-mono text-sm uppercase tracking-[0.16em] text-vault-info">Rating pressure</p>
              <h3 className="mt-2 text-3xl font-display sm:text-4xl">-0.2 to -0.4 risk</h3>
              <p className="mt-2 text-base leading-7 text-vault-text-light/90">Reputation impact from recurring “locked early / rude” patterns if unresolved.</p>
            </article>
          </div>

          <div className="overflow-hidden border mt-7 rounded-xl border-vault-border">
            <table className="w-full text-base text-left border-collapse text-vault-text-light/90">
              <thead className="bg-vault-surface-elevated/80 text-vault-text-muted">
                <tr>
                  <th className="px-4 py-3 font-mono text-sm uppercase tracking-[0.14em]">Metric</th>
                  <th className="px-4 py-3 font-mono text-sm uppercase tracking-[0.14em]">Before</th>
                  <th className="px-4 py-3 font-mono text-sm uppercase tracking-[0.14em] text-vault-success">With {systemName}</th>
                </tr>
              </thead>
              <tbody>
                {roiRows.map((row) => (
                  <tr key={row.metric} className="border-t border-vault-border bg-vault-surface/45">
                    <td className="px-4 py-3.5 leading-7">{row.metric}</td>
                    <td className="px-4 py-3.5 leading-7 text-vault-red/90">{row.before}</td>
                    <td className="px-4 py-3.5 leading-7 text-vault-success/90">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="p-6 mb-12 border rounded-2xl border-vault-border bg-vault-surface/55 sm:p-9" aria-labelledby="section-04-heading">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-vault-text-muted">Section 04 — The System</p>
          <h2 id="section-04-heading" className="mt-3 text-4xl font-display sm:text-5xl">
            What {systemName} actually is.
          </h2>
          <p className="max-w-4xl mt-4 text-base leading-8 text-vault-text-light/90">
            This is not a basic chatbot and not a phone tree. It is an integrated intake and operations layer that captures customer intent,
            routes it to the right channel, and gives management real-time visibility across appraisals, leads, conversations, and staff activity.
          </p>

          <div className="grid gap-4 mt-7 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <article key={capability.title} className="p-5 border rounded-xl border-vault-border bg-vault-surface-elevated/75">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-xl ${capability.bg}`}>{capability.icon}</div>
                <h3 className="mt-3 text-2xl font-display">{capability.title}</h3>
                <p className="mt-2 text-base leading-8 text-vault-text-light/90">{capability.desc}</p>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-7">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-3 text-base font-semibold transition-colors border rounded-xl border-vault-gold bg-vault-gold text-vault-text-on-gold hover:bg-vault-gold-light"
            >
              Explore the dashboard
            </Link>
          </div>
        </section>

        <section className="mb-10" aria-labelledby="section-05-heading">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-vault-text-muted">Section 05 — Next Steps</p>
          <h2 id="section-05-heading" className="mt-3 text-4xl font-display sm:text-5xl">
            The software is built. It&apos;s waiting for you!
          </h2>
          <p className="max-w-4xl mt-4 text-base leading-8 text-vault-text-light/90">
            There&apos;s no setup required on your side to test this. Use the live demo flows, check the dashboard visibility, and decide based on
            real behavior instead of slideware. If it feels right, we can tune it to your exact daily workflow.
          </p>

          <div className="mt-8 overflow-hidden border shadow-2xl rounded-2xl border-vault-border bg-gradient-to-b from-vault-surface to-vault-surface-elevated">
            <div className="px-6 py-5 border-b border-vault-border bg-vault-black-deep/50">
              <h4 className="text-xl font-display text-vault-text-light">Standard Agency Pricing</h4>
              <p className="mt-1 text-xs tracking-wider uppercase text-vault-text-muted">Itemized Tech Stack & Service</p>
            </div>
            <div className="px-6 py-6">
              <ul className="space-y-4 text-sm text-vault-text-light/80">
                <li className="flex items-center justify-between pb-3 border-b border-vault-border/50">
                  <span>Enterprise Setup & Onboarding</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$500.00</span>
                </li>
                <li className="flex items-center justify-between pb-3 border-b border-vault-border/50">
                  <span>Premium AI Service Tier (Monthly)</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$199.00</span>
                </li>
                <li className="flex items-center justify-between pb-3 border-b border-vault-border/50">
                  <span>Dedicated Voice Server (Render)</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$7.00</span>
                </li>
                <li className="flex items-center justify-between pb-3 border-b border-vault-border/50">
                  <span>Telecom Infrastructure (Twilio + A2P)</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$11.15</span>
                </li>
                <li className="flex items-center justify-between pb-3 border-b border-vault-border/50">
                  <span>LLM Compute (OpenAI Voice + Text)</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$19.00</span>
                </li>
                <li className="flex items-center justify-between pb-3 border-b border-vault-border/50">
                  <span>Cloud Hosting & DB (AWS + Vercel)</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$22.00</span>
                </li>
                <li className="flex items-center justify-between pb-1">
                  <span>Estimated Usage (SMS/Minutes)</span>
                  <span className="line-through text-vault-red/80 decoration-vault-red">$20.00</span>
                </li>
              </ul>
              
              <div className="p-6 mt-8 border rounded-xl border-vault-border/50 bg-vault-black-deep">
                <div className="flex items-end justify-between mb-3">
                  <span className="text-sm tracking-wider uppercase text-vault-text-muted">Standard First Month</span>
                  <span className="text-2xl line-through text-vault-text-muted decoration-vault-red decoration-2">$778.15</span>
                </div>
                <div className="flex items-end justify-between mb-6">
                  <span className="text-sm tracking-wider uppercase text-vault-text-muted">Standard Ongoing</span>
                  <span className="text-xl line-through text-vault-text-muted decoration-vault-red decoration-2">$278.15/mo</span>
                </div>
                
                <div className="pt-6 border-t border-vault-border/50">
                  <p className="mb-2 text-xs font-semibold tracking-widest uppercase text-vault-gold">Exclusive Pilot Offer</p>
                  <p className="text-4xl font-display text-vault-text-light drop-shadow-md md:text-5xl">
                    You tell <span className="italic text-vault-gold">me</span> pricing.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-vault-text-muted">
                    I want this in my portfolio. You decide what the value is to your business after you see it work. No contracts, no hidden fees.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href={demoPhoneHref}
              className="inline-flex items-center justify-center px-5 py-3 text-base font-semibold transition-colors border rounded-xl border-vault-gold bg-vault-gold text-vault-text-on-gold hover:bg-vault-gold-light"
            >
              Call demo: {demoPhoneDisplay}
            </a>
            <Link
              href="/?heroOpen=1"
              className="inline-flex items-center justify-center px-5 py-3 text-base font-semibold transition-colors border rounded-xl border-vault-success/60 bg-vault-success/15 text-vault-text-light hover:bg-vault-success/25"
            >
              Open live chat
            </Link>
          </div>

          <div className="p-6 mt-8 border rounded-xl border-vault-border bg-vault-surface/55">
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-vault-text-muted">Phase 2 Additions (from discovery notes)</p>
            <ul className="mt-3 space-y-2.5 text-base leading-7 text-vault-text-light/90">
              {phaseTwoAdditions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="flex flex-col gap-3 text-sm border-t border-vault-border pt-7 text-vault-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono uppercase tracking-[0.12em]">
            {businessName} — Digital Gap Report · {reportDate}
          </p>
          <p className="font-mono uppercase tracking-[0.12em]">
            Built by Nate Orange Jr. · Solutions Architect @ Halimede Solutions LLC ·{' '}
            <a href="tel:+19042520927" className="text-vault-gold hover:text-vault-gold-light">
              (904) 252-0927
            </a>{' '}
            ·{' '}
            <a href="mailto:Halimedetech@gmail.com" className="text-vault-gold hover:text-vault-gold-light">
              Halimedetech@gmail.com
            </a>{' '}
            · <Link href="/">Home</Link> · <Link href="/inventory">Inventory</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
