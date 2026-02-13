import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HeroParallax } from '@/components/ui/hero-parallax'

/* ────────────────────────────────────────────────────────── */
/*  Gallery Images for Parallax                              */
/* ────────────────────────────────────────────────────────── */

const galleryImages = [
  {
    title: 'USA Pawn Store Front',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic2.jpg',
  },
  {
    title: 'Jewelry Collection',
    link: '/appraise',
    thumbnail: '/orignal/gallery/pic3.jpg',
  },
  {
    title: 'Gold & Precious Metals',
    link: '/appraise',
    thumbnail: '/orignal/gallery/pic4.jpg',
  },
  {
    title: 'Electronics & Tools',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic5.jpg',
  },
  {
    title: 'Quality Merchandise',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic6.jpg',
  },
  {
    title: 'Expert Appraisals',
    link: '/appraise',
    thumbnail: '/orignal/gallery/pic7.jpg',
  },
  {
    title: 'Visit Our Store',
    link: '/info',
    thumbnail: '/orignal/gallery/pic2.jpg',
  },
  {
    title: 'Trusted Service',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic3.jpg',
  },
  {
    title: 'Fair Prices',
    link: '/appraise',
    thumbnail: '/orignal/gallery/pic4.jpg',
  },
  {
    title: 'Fast Cash',
    link: '/appraise',
    thumbnail: '/orignal/gallery/pic5.jpg',
  },
  {
    title: 'No Hassle',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic6.jpg',
  },
  {
    title: 'Jacksonville Trusted',
    link: '/info',
    thumbnail: '/orignal/gallery/pic7.jpg',
  },
  {
    title: 'Premium Items',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic2.jpg',
  },
  {
    title: 'Best Deals',
    link: '/inventory',
    thumbnail: '/orignal/gallery/pic3.jpg',
  },
  {
    title: 'Quality Guaranteed',
    link: '/appraise',
    thumbnail: '/orignal/gallery/pic4.jpg',
  },
]

/* ────────────────────────────────────────────────────────── */
/*  Neighborhood Data                                        */
/* ────────────────────────────────────────────────────────── */

const neighborhoodData: Record<string, {
  name: string
  title: string
  description: string
  keywords: string
  directions: string
  landmarks: string[]
  driveTime: string
  mapQuery: string
}> = {
  arlington: {
    name: 'Arlington',
    title: 'Pawn Shop Near Arlington, Jacksonville | USA Pawn Holdings',
    description:
      "Arlington's trusted pawn shop — fast cash loans, jewelry buying, gold appraisals. Open 6 days/week at 6132 Merrill Rd. Free estimates!",
    keywords:
      'pawn shop Arlington, Arlington pawn, Jacksonville pawn shop east side, gold buyer Arlington, pawn loans Arlington Jacksonville',
    directions:
      'From Arlington Expressway, take Merrill Rd exit south. We\'re 2 miles on the right, just past Regency Square Blvd. Look for the red USA Pawn globe sign.',
    landmarks: ['Arlington Town Center', 'Regency Square Mall', 'UF Health North'],
    driveTime: '~10 minutes from Arlington Town Center',
    mapQuery: 'USA+Pawn+Holdings+6132+Merrill+Rd+Jacksonville+FL+32277',
  },
  southside: {
    name: 'Southside',
    title: 'Pawn Shop Near Southside, Jacksonville | USA Pawn Holdings',
    description:
      "Southside Jacksonville's go-to pawn shop — instant cash, gold buying, electronics, tools. Conveniently located on Merrill Rd. Open Mon–Sat.",
    keywords:
      'pawn shop Southside Jacksonville, San Jose pawn, Town Center pawn shop, gold buyer Southside, Deerwood pawn loans',
    directions:
      'Head north on Southside Blvd, turn right on Merrill Rd. We\'re 3 miles ahead on the left. Free parking in front of the store.',
    landmarks: ['Town Center', 'St. Johns Town Center', 'Deerwood'],
    driveTime: '~15 minutes from Town Center',
    mapQuery: 'USA+Pawn+Holdings+6132+Merrill+Rd+Jacksonville+FL+32277',
  },
  beaches: {
    name: 'Jacksonville Beaches',
    title: 'Pawn Shop Near Jacksonville Beaches | USA Pawn Holdings',
    description:
      "The Beaches' closest pawn shop — instant cash for gold, electronics, jewelry. Quick drive from Atlantic Beach, Neptune Beach & Jax Beach. Free appraisals!",
    keywords:
      'pawn shop Jacksonville Beach, Atlantic Beach pawn, Neptune Beach pawn shop, gold buyer beaches Jacksonville, pawn loans Jax Beach',
    directions:
      'Take Beach Blvd (US-90) west to Merrill Rd, turn right. Store is 1 mile north on the right. Easy straight shot from the beach.',
    landmarks: ['Atlantic Beach', 'Neptune Beach', 'Jacksonville Beach'],
    driveTime: '~20 minutes from Beach Blvd',
    mapQuery: 'USA+Pawn+Holdings+6132+Merrill+Rd+Jacksonville+FL+32277',
  },
}

const services = [
  {
    icon: '💰',
    title: 'Pawn Loans',
    desc: 'Instant cash loans on your valuables. 30-day terms, fair rates. Get your items back anytime.',
  },
  {
    icon: '🪙',
    title: 'Gold & Silver Buying',
    desc: 'Top dollar for gold, silver, and platinum. We test, weigh, and pay on the spot.',
  },
  {
    icon: '💎',
    title: 'Jewelry & Watches',
    desc: 'Diamonds, designer watches, estate jewelry — we buy and loan on all fine pieces.',
  },
  {
    icon: '🎮',
    title: 'Electronics & Games',
    desc: 'Consoles, laptops, smartphones, tablets — fast cash for your tech and gaming gear.',
  },
  {
    icon: '🔧',
    title: 'Tools & Equipment',
    desc: 'Power tools, hand tools, construction equipment — working condition preferred.',
  },
  {
    icon: '🤖',
    title: 'AI Appraisals',
    desc: 'Get an instant AI-powered estimate online — just snap a photo. Free and private.',
  },
]

/* ────────────────────────────────────────────────────────── */
/*  Static Params (SSG)                                      */
/* ────────────────────────────────────────────────────────── */

export function generateStaticParams() {
  return [
    { neighborhood: 'arlington' },
    { neighborhood: 'southside' },
    { neighborhood: 'beaches' },
  ]
}

/* ────────────────────────────────────────────────────────── */
/*  Dynamic Metadata                                         */
/* ────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ neighborhood: string }>
}): Promise<Metadata> {
  const { neighborhood } = await params
  const data = neighborhoodData[neighborhood]
  if (!data) {
    return { title: 'USA Pawn Holdings' }
  }

  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    openGraph: {
      title: data.title,
      description: data.description,
      url: `https://usapawn.vercel.app/${neighborhood}`,
      images: ['/og-image.png'],
      type: 'website',
    },
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Page Component                                           */
/* ────────────────────────────────────────────────────────── */

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ neighborhood: string }>
}) {
  const { neighborhood } = await params
  const data = neighborhoodData[neighborhood]
  if (!data) return notFound()

  return (
    <div className="min-h-screen bg-vault-black-deep">
      {/* ── Hero Parallax ────────────────────────────── */}
      <HeroParallax 
        products={galleryImages}
        title={`Pawn Shop Near ${data.name}`}
        description={data.description}
      />

      {/* ── Neighborhood Info ────────────────────────── */}
      <section className="relative z-10 py-16 bg-vault-black-deep">
        <div className="max-w-5xl px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold font-display text-vault-gold md:text-4xl">
            Serving {data.name}
          </h2>
          <p className="max-w-2xl mx-auto mt-4 text-lg text-vault-text-muted">
            Your trusted local pawn shop in Jacksonville&rsquo;s {data.name} area.
            Instant cash, fair prices, no hassle.
          </p>
          <div className="flex flex-col items-center gap-4 mt-8 sm:flex-row sm:justify-center">
            <Link
              href="/appraise"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold transition-transform rounded-lg shadow-xl bg-vault-gold text-vault-text-on-gold hover:scale-105"
            >
              📸 Get Free AI Appraisal
            </Link>
            <a
              href="tel:+19047441776"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold transition-colors border-2 rounded-lg border-vault-gold text-vault-text-light hover:bg-vault-gold/10"
            >
              📞 (904) 744-1776
            </a>
          </div>
        </div>
      </section>

      {/* ── Directions ───────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-5xl px-6 mx-auto">
          <h2 className="text-3xl font-bold font-display text-vault-gold md:text-4xl">
            Directions from {data.name}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-vault-text-muted">
            {data.directions}
          </p>
          <p className="mt-2 font-mono text-sm text-vault-gold/80">
            🚗 Drive time: {data.driveTime}
          </p>

          {/* Nearby Landmarks */}
          <div className="flex flex-wrap gap-3 mt-6">
            {data.landmarks.map((landmark) => (
              <span
                key={landmark}
                className="px-4 py-2 text-sm border rounded-full border-vault-gold/30 bg-vault-surface-elevated text-vault-text-light"
              >
                📍 {landmark}
              </span>
            ))}
          </div>

          {/* Google Maps Embed */}
          <div className="mt-8 overflow-hidden border shadow-2xl rounded-xl border-vault-surface-elevated">
            <iframe
              title={`Directions to USA Pawn Holdings from ${data.name}`}
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${data.mapQuery}&zoom=13`}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Services Grid ────────────────────────────── */}
      <section className="py-16 bg-vault-surface">
        <div className="max-w-5xl px-6 mx-auto">
          <h2 className="text-3xl font-bold text-center font-display text-vault-text-light md:text-4xl">
            Our Services
          </h2>
          <p className="max-w-xl mx-auto mt-3 text-center text-vault-text-muted">
            Everything you need — all under one roof at 6132 Merrill Rd.
          </p>

          <div className="grid gap-6 mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.title}
                className="p-6 transition-all border group rounded-xl border-vault-surface-elevated bg-vault-black-deep hover:border-vault-gold/40 hover:shadow-lg hover:shadow-vault-gold/5"
              >
                <span className="text-3xl">{s.icon}</span>
                <h3 className="mt-3 text-xl font-bold font-display text-vault-text-light">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-vault-text-muted">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Current Specials ─────────────────────────── */}
      <section className="py-16">
        <div className="max-w-5xl px-6 mx-auto">
          <h2 className="text-3xl font-bold font-display text-vault-gold md:text-4xl">
            Current Specials for {data.name} Residents
          </h2>

          <div className="grid gap-6 mt-8 md:grid-cols-2">
            {/* Special 1 */}
            <div className="p-6 border rounded-xl border-vault-gold/20 bg-vault-surface-elevated">
              <div className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-wider text-white uppercase rounded-full bg-vault-red">
                Limited Time
              </div>
              <h3 className="text-xl font-bold font-display text-vault-text-light">
                🎮 Top Dollar on Video Games
              </h3>
              <p className="mt-2 text-vault-text-muted">
                Bring in your retro and modern consoles — we pay premium prices for
                PlayStation, Xbox, Nintendo, and game collections.
              </p>
            </div>

            {/* Special 2 */}
            <div className="p-6 border rounded-xl border-vault-gold/20 bg-vault-surface-elevated">
              <div className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-wider uppercase rounded-full bg-vault-gold text-vault-text-on-gold">
                Gold Rush
              </div>
              <h3 className="text-xl font-bold font-display text-vault-text-light">
                🪙 Gold Prices at All-Time Highs
              </h3>
              <p className="mt-2 text-vault-text-muted">
                Now is the best time to sell your gold and silver. We pay based on
                live spot prices — get your free appraisal today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Signals ────────────────────────────── */}
      <section className="py-16 bg-vault-surface">
        <div className="max-w-5xl px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold font-display text-vault-text-light md:text-4xl">
            Why {data.name} Trusts USA Pawn
          </h2>
          <div className="grid gap-8 mt-10 sm:grid-cols-3">
            <div>
              <p className="text-4xl font-black font-display text-vault-gold">4.5★</p>
              <p className="mt-2 text-vault-text-muted">Average Rating</p>
            </div>
            <div>
              <p className="text-4xl font-black font-display text-vault-gold">1000+</p>
              <p className="mt-2 text-vault-text-muted">Happy Customers</p>
            </div>
            <div>
              <p className="text-4xl font-black font-display text-vault-gold">6 Days</p>
              <p className="mt-2 text-vault-text-muted">Open Mon–Sat</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold font-display text-vault-text-light md:text-4xl">
            Visit Us Today
          </h2>
          <p className="mt-4 text-lg text-vault-text-muted">
            6132 Merrill Rd Ste 1, Jacksonville, FL 32277
          </p>
          <p className="mt-1 text-vault-text-muted">
            Mon–Fri 10 AM – 6 PM &nbsp;|&nbsp; Sat 10 AM – 5 PM &nbsp;|&nbsp; Sun Closed
          </p>

          <div className="flex flex-col items-center gap-4 mt-8 sm:flex-row sm:justify-center">
            <Link
              href="/appraise"
              className="px-8 py-4 text-lg font-bold transition-transform rounded-lg shadow-xl bg-vault-gold text-vault-text-on-gold hover:scale-105"
            >
              Get Free Appraisal
            </Link>
            <Link
              href="/inventory"
              className="px-8 py-4 text-lg font-bold transition-colors border-2 rounded-lg border-vault-gold text-vault-gold hover:bg-vault-gold hover:text-vault-text-on-gold"
            >
              Browse Inventory
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
