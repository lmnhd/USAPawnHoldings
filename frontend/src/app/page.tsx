'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { motion } from 'motion/react';
import { HeroParallax } from '@/components/ui/hero-parallax';
import {
  IconDiamond,
  IconDeviceMobile,
  IconTool,
  IconTargetArrow,
  IconMusic,
  IconPalette,
  IconSparkles,
  IconCamera,
  IconCoin,
  IconUsers,
  IconHeartHandshake,
} from '@tabler/icons-react';

/* ── Client-safe constants (avoids importing fs-dependent constants.ts) ── */

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
];

const STORE_HOURS: Record<string, string> = {
  Monday: '9:00 AM – 6:00 PM',
  Tuesday: '9:00 AM – 6:00 PM',
  Wednesday: '9:00 AM – 6:00 PM',
  Thursday: '9:00 AM – 6:00 PM',
  Friday: '9:00 AM – 6:00 PM',
  Saturday: '9:00 AM – 5:00 PM',
  Sunday: 'Closed',
};

const STEPS = [
  { num: '1', title: 'Bring Your Item', desc: 'Visit our store or upload a photo online for an instant AI estimate.' },
  { num: '2', title: 'Get Appraised', desc: 'AI-powered valuations using real-time market data and spot prices.' },
  { num: '3', title: 'Walk Out with Cash', desc: 'Same-day pawn loans or outright purchases. No waiting, no hassle.' },
];

const BENTO_CATEGORY_IMAGE_FILES = {
  goldAndJewelry: 'Gold & Jewelry.PNG',
  electronics: 'Electronics.PNG',
  toolsAndEquipment: 'Tools & Equipment.PNG',
  firearms: 'Firearms.PNG',
  musicalInstruments: 'Musical Instruments.PNG',
  collectibles: 'Collectibles.PNG',
  andMore: 'And More….PNG',
} as const;

const BENTO_FEATURE_IMAGE_FILES = {
  aiAppraisals: 'AI-Powered Appraisals.PNG',
  fairPrices: 'Fair Prices.PNG',
} as const;

function BentoImageHeader({ fileName, alt }: { fileName: string; alt: string }) {
  return (
    <div className="relative flex-1 w-full h-full min-h-[6rem] overflow-hidden border rounded-xl border-vault-border/40 bg-vault-black-deep">
      <Image
        src={`/NanoB/Bento/${encodeURIComponent(fileName)}`}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover/bento:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-vault-black/45 via-transparent to-vault-black/15" />
    </div>
  );
}

/* ═══════════════ BENTO SKELETON ANIMATIONS ═══════════════ */

const SkeletonGoldPulse = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.goldAndJewelry}
    alt="Gold and jewelry inventory showcase"
  />
);

const SkeletonElectronics = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.electronics}
    alt="Electronics inventory showcase"
  />
);

const SkeletonTools = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.toolsAndEquipment}
    alt="Tools and equipment inventory showcase"
  />
);

const SkeletonFirearms = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.firearms}
    alt="Firearms inventory showcase"
  />
);

const SkeletonMusic = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.musicalInstruments}
    alt="Musical instruments inventory showcase"
  />
);

const SkeletonCollectibles = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.collectibles}
    alt="Collectibles inventory showcase"
  />
);

const SkeletonMore = () => (
  <BentoImageHeader
    fileName={BENTO_CATEGORY_IMAGE_FILES.andMore}
    alt="Mixed inventory showcase"
  />
);

/* ═══════════════ BENTO ITEMS: CATEGORIES ═══════════════ */

const categoryItems = [
  {
    title: 'Gold & Jewelry',
    description: 'Rings, chains, watches, diamonds — top dollar for precious metals at live spot prices.',
    header: <SkeletonGoldPulse />,
    className: 'md:col-span-1',
    icon: <IconDiamond className="w-4 h-4 text-vault-gold" />,
  },
  {
    title: 'Electronics',
    description: 'Laptops, phones, gaming consoles, TVs — we buy and loan on the latest tech.',
    header: <SkeletonElectronics />,
    className: 'md:col-span-1',
    icon: <IconDeviceMobile className="w-4 h-4 text-vault-gold" />,
  },
  {
    title: 'Tools & Equipment',
    description: 'Power tools, hand tools, generators — working condition gets the best offers.',
    header: <SkeletonTools />,
    className: 'md:col-span-1',
    icon: <IconTool className="w-4 h-4 text-vault-gold" />,
  },
  {
    title: 'Firearms',
    description: 'Handguns, rifles, shotguns — licensed FFL dealer. Legal transfers only.',
    header: <SkeletonFirearms />,
    className: 'md:col-span-2',
    icon: <IconTargetArrow className="w-4 h-4 text-vault-gold" />,
  },
  {
    title: 'Musical Instruments',
    description: 'Guitars, amps, keyboards, drums — bring your gear and get cash today.',
    header: <SkeletonMusic />,
    className: 'md:col-span-1',
    icon: <IconMusic className="w-4 h-4 text-vault-gold" />,
  },
  {
    title: 'Collectibles',
    description: 'Coins, sports memorabilia, antiques — rare finds are our specialty.',
    header: <SkeletonCollectibles />,
    className: 'md:col-span-1',
    icon: <IconPalette className="w-4 h-4 text-vault-gold" />,
  },
  {
    title: 'And More...',
    description: "Sporting goods, designer bags, anything of value. If it's worth something, we want to see it.",
    header: <SkeletonMore />,
    className: 'md:col-span-2',
    icon: <IconSparkles className="w-4 h-4 text-vault-gold" />,
  },
];

/* ═══════════════ BENTO SKELETON ANIMATIONS: FEATURES ═══════════════ */

const SkeletonAI = () => (
  <BentoImageHeader
    fileName={BENTO_FEATURE_IMAGE_FILES.aiAppraisals}
    alt="AI-powered appraisal experience"
  />
);

const SkeletonFairPrice = () => (
  <BentoImageHeader
    fileName={BENTO_FEATURE_IMAGE_FILES.fairPrices}
    alt="Fair pricing and valuation display"
  />
);

const SkeletonFamily = () => {
  const first = { initial: { x: 20, rotate: -5 }, hover: { x: 0, rotate: 0 } };
  const second = { initial: { x: -20, rotate: 5 }, hover: { x: 0, rotate: 0 } };
  return (
    <motion.div initial="initial" whileHover="hover" className="flex flex-1 w-full h-full min-h-[6rem] flex-row space-x-2 p-2">
      <motion.div variants={first} className="flex flex-col items-center justify-center w-1/3 h-full p-2 border rounded-2xl bg-vault-surface border-vault-gold/10">
        <span className="text-2xl">🏪</span>
        <p className="text-[9px] text-vault-text-muted mt-1 text-center">Since 2004</p>
      </motion.div>
      <motion.div className="relative z-20 flex flex-col items-center justify-center w-1/3 h-full p-2 border rounded-2xl bg-vault-surface border-vault-red/20">
        <span className="text-2xl">❤️</span>
        <p className="text-[9px] text-vault-gold mt-1 text-center">Family Run</p>
      </motion.div>
      <motion.div variants={second} className="flex flex-col items-center justify-center w-1/3 h-full p-2 border rounded-2xl bg-vault-surface border-vault-gold/10">
        <span className="text-2xl">📍</span>
        <p className="text-[9px] text-vault-text-muted mt-1 text-center">Jax, FL</p>
      </motion.div>
    </motion.div>
  );
};

const SkeletonTrust = () => {
  const v1 = { initial: { x: 0 }, animate: { x: 10, rotate: 5, transition: { duration: 0.2 } } };
  const v2 = { initial: { x: 0 }, animate: { x: -10, rotate: -5, transition: { duration: 0.2 } } };
  return (
    <motion.div initial="initial" whileHover="animate" className="flex flex-1 w-full h-full min-h-[6rem] flex-col space-y-2 p-2">
      <motion.div variants={v1} className="flex flex-row items-start p-2 space-x-2 border rounded-2xl border-vault-gold/20 bg-vault-surface">
        <span className="text-lg">⭐</span>
        <p className="text-xs text-vault-text-muted">&quot;Best pawn shop in Jacksonville! Fair prices and they treat you right.&quot;</p>
      </motion.div>
      <motion.div variants={v2} className="flex flex-row items-center justify-end w-3/4 p-2 ml-auto space-x-2 border rounded-full border-vault-gold/20 bg-vault-surface">
        <p className="text-xs font-semibold text-vault-gold">★★★★★</p>
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-vault-gold to-vault-red shrink-0" />
      </motion.div>
    </motion.div>
  );
};

const featureItems = [
  {
    title: 'AI-Powered Appraisals',
    description: 'Instant, accurate valuations powered by GPT-4o Vision and live market data.',
    header: <SkeletonAI />,
    className: 'md:col-span-1',
    icon: <IconCamera className="w-4 h-4 text-vault-red" />,
  },
  {
    title: 'Fair Prices',
    description: 'Competitive rates on loans and purchases. We check spot prices in real time.',
    header: <SkeletonFairPrice />,
    className: 'md:col-span-1',
    icon: <IconCoin className="w-4 h-4 text-vault-red" />,
  },
  {
    title: 'Family Owned',
    description: 'Trusted in Jacksonville for over 20 years. Your neighbors, your pawn shop.',
    header: <SkeletonFamily />,
    className: 'md:col-span-1',
    icon: <IconUsers className="w-4 h-4 text-vault-red" />,
  },
  {
    title: 'No Judgment',
    description: 'Everyone needs a hand sometimes. We treat every customer like family.',
    header: <SkeletonTrust />,
    className: 'md:col-span-3',
    icon: <IconHeartHandshake className="w-4 h-4 text-vault-red" />,
  },
];

/* ── Door QR Detector (wrapped in Suspense) ── */

function DoorSourceDetector() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const source = searchParams.get('source');
    if (source === 'door') {
      // Dispatch custom event for the chat widget to auto-open with greeting
      window.dispatchEvent(new CustomEvent('vault:open-chat', { detail: { source: 'door' } }));
    }
  }, [searchParams]);

  return null;
}

/* ── Page ── */

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <DoorSourceDetector />
      </Suspense>

      {/* ═══════════════ HERO PARALLAX ═══════════════ */}
      <HeroParallax 
        products={galleryImages}
        title="USA Pawn Holdings"
        description="Where We Take Anything of Value and Treat You Like Family"
      />

      {/* Info Section After Hero */}
      <section className="relative py-8 bg-vault-black-deep -mt-14">
        <div className="max-w-5xl px-4 mx-auto text-center ">
          <div className="mb-6">
            <Badge variant="outline" className="px-4 py-1.5 text-xs font-mono font-semibold tracking-[0.2em] text-black dark:text-white bg-red-800 border-vault-red/40 rounded-md uppercase bg-vault-red/10">
              Jacksonville&apos;s Premier Pawn Shop
            </Badge>
          </div>

          <p className="mt-3 font-mono text-sm text-vault-text-muted">
            📍 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 mt-8 sm:flex-row">
            <Button asChild className="group relative inline-flex items-center gap-2 px-8 py-4 h-auto rounded-lg font-semibold text-white red-gradient border border-vault-red-hover/60 shadow-lg shadow-vault-red/20 hover:shadow-vault-red/40 transition-all duration-300 hover:-translate-y-0.5">
              <Link href="/appraise">
                <span className="text-lg">📸</span>
                Get AI Appraisal
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            </Button>
            <Button asChild variant="outline" className="inline-flex items-center h-auto gap-2 px-8 py-4 font-semibold transition-all duration-300 border-2 rounded-lg text-vault-text-light border-vault-border bg-vault-surface/40 hover:border-vault-red hover:bg-vault-surface-elevated/50">
              <Link href="/inventory">
                Browse Inventory
              </Link>
            </Button>
          </div>

          {/* Phone */}
          <a
            href="tel:+19046417296"
            className="inline-flex items-center gap-2 mt-6 font-mono text-sm transition-colors text-vault-text-muted hover:text-white"
          >
            📞 (904) 641-7296
          </a>
        </div>
      </section>

      <Separator className="bg-vault-border-accent" />

      {/* ═══════════════ QUICK STATS ═══════════════ */}
      <section className="relative py-12">
        <div className="max-w-5xl px-4 mx-auto">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            {[
              { value: '20+', label: 'Years In Business' },
              { value: '50,000+', label: 'Items Pawned' },
              { value: '$5M+', label: 'Loans Issued' },
            ].map((stat) => (
              <Card key={stat.label} className="bg-transparent border-none shadow-none group">
                <CardContent className="p-0 text-center">
                  <div className="text-3xl font-bold transition-transform sm:text-4xl font-display text-vault-text-light group-hover:scale-105">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm tracking-wider uppercase text-vault-text-muted font-body">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-vault-border-accent" />

      {/* ═══════════════ CATEGORY BENTO GRID ═══════════════ */}
      <section className="py-20 sm:py-24">
        <div className="px-4 mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold font-display sm:text-4xl text-vault-text-light">
              What We <span className="text-vault-red">Buy &amp; Loan On</span>
            </h2>
            <p className="max-w-xl mx-auto mt-3 text-vault-text-muted">
              From gold chains to power tools — if it has value, we want to see it.
            </p>
          </div>

          <BentoGrid className="md:auto-rows-[20rem]">
            {categoryItems.map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                header={item.header}
                className={cn("[&>p:text-lg]", item.className)}
                icon={item.icon}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="py-20 sm:py-24 bg-vault-surface/50">
        <div className="max-w-4xl px-4 mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold font-display sm:text-4xl text-vault-text-light">
              Simple <span className="text-vault-red">3-Step</span> Process
            </h2>
          </div>

          <div className="relative">
            {/* Gold connector line (desktop) */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-vault-red/20 via-vault-red/60 to-vault-red/20" />

            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((step) => (
                <div key={step.num} className="relative text-center">
                  <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 mb-4 text-2xl font-bold border-2 rounded-full bg-vault-black border-vault-red text-vault-text-light font-display">
                    {step.num}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold font-display text-vault-text-light">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-vault-text-muted">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES BENTO GRID ═══════════════ */}
      <section className="py-20 sm:py-24">
        <div className="px-4 mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold font-display sm:text-4xl text-vault-text-light">
              Why Choose <span className="text-vault-red">USA Pawn Holdings</span>?
            </h2>
          </div>

          <BentoGrid className="md:auto-rows-[20rem]">
            {featureItems.map((item, i) => (
              <BentoGridItem
                key={i}
                title={item.title}
                description={item.description}
                header={item.header}
                className={cn("[&>p:text-lg]", item.className)}
                icon={item.icon}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* ═══════════════ MAP ═══════════════ */}
      <section className="py-16 sm:py-20 bg-vault-surface/50">
        <div className="max-w-5xl px-4 mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl text-vault-text-light">
              Find <span className="text-vault-red">Us</span>
            </h2>
            <p className="mt-2 text-vault-text-muted">
              6132 Merrill Rd Ste 1, Jacksonville, FL 32277
            </p>
          </div>

          <div className="overflow-hidden border shadow-xl rounded-2xl border-vault-red/20">
            <iframe
              title="USA Pawn Holdings Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3444.1!2d-81.5565!3d30.3355!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e5b7a2e73d6d39%3A0x4aec903b326e0c0!2s6132+Merrill+Rd+Ste+1%2C+Jacksonville%2C+FL+32277!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
              width="100%"
              height="400"
              style={{ border: 0, filter: 'var(--vault-map-filter)' as string }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-[300px] sm:h-[400px]"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ STORE HOURS & CONTACT ═══════════════ */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl px-4 mx-auto">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Hours */}
            <div>
              <h2 className="mb-6 text-2xl font-bold font-display sm:text-3xl text-vault-text-light">
                Store <span className="text-vault-red">Hours</span>
              </h2>
              <div className="space-y-3">
                {Object.entries(STORE_HOURS).map(([day, hours]) => {
                  const isClosed = hours === 'Closed';
                  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                  return (
                    <div
                      key={day}
                      className={`flex justify-between items-center py-2 px-3 rounded-lg ${isToday ? 'bg-vault-red/10 border border-vault-red/20' : ''}`}
                    >
                      <span className={`font-body text-sm ${isToday ? 'text-vault-text-light font-semibold' : 'text-vault-text-light'}`}>
                        {day} {isToday && <span className="ml-1 text-xs">(Today)</span>}
                      </span>
                      <span className={`font-mono text-sm ${isClosed ? 'text-vault-red' : 'text-vault-text-muted'}`}>
                        {hours}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="mb-6 text-2xl font-bold font-display sm:text-3xl text-vault-text-light">
                Get In <span className="text-vault-red">Touch</span>
              </h2>

              <div className="space-y-4">
                <a href="tel:+19046417296" className="flex items-center gap-3 transition-colors text-vault-text-light hover:text-vault-red group">
                  <span className="flex items-center justify-center flex-shrink-0 w-10 h-10 transition-colors border rounded-lg bg-vault-surface-elevated border-vault-border group-hover:border-vault-red/40">📞</span>
                  <div>
                    <div className="text-sm font-semibold">(904) 641-7296</div>
                    <div className="text-xs text-vault-text-muted">Call us anytime during business hours</div>
                  </div>
                </a>

                <a href="mailto:info@usapawnfl.com" className="flex items-center gap-3 transition-colors text-vault-text-light hover:text-vault-red group">
                  <span className="flex items-center justify-center flex-shrink-0 w-10 h-10 transition-colors border rounded-lg bg-vault-surface-elevated border-vault-border group-hover:border-vault-red/40">📧</span>
                  <div>
                    <div className="text-sm font-semibold">info@usapawnfl.com</div>
                    <div className="text-xs text-vault-text-muted">Email us for inquiries</div>
                  </div>
                </a>

                <div className="flex items-center gap-3 text-vault-text-light group">
                  <span className="flex items-center justify-center flex-shrink-0 w-10 h-10 border rounded-lg bg-vault-surface-elevated border-vault-border">📍</span>
                  <div>
                    <div className="text-sm font-semibold">6132 Merrill Rd Ste 1</div>
                    <div className="text-xs text-vault-text-muted">Jacksonville, FL 32277</div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-3 mt-8">
                {['Facebook', 'Instagram', 'YouTube'].map((platform) => (
                  <Button asChild key={platform} variant="outline" className="h-auto px-4 py-2 text-xs font-semibold transition-all rounded-lg text-vault-text-muted border-vault-border hover:border-vault-red/40 hover:text-vault-red">
                    <a href="#">
                      {platform}
                    </a>
                  </Button>
                ))}
              </div>

              {/* Visit CTA */}
              <Button asChild className="inline-flex items-center h-auto gap-2 px-6 py-3 mt-8 font-semibold text-white transition-all rounded-xl red-gradient hover:shadow-lg hover:shadow-vault-red/20">
                <Link
                  href="https://maps.google.com/?q=6132+Merrill+Rd+Ste+1+Jacksonville+FL+32277"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit Us Today
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
