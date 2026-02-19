'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconCoin,
  IconDiamond,
  IconScale,
  IconCash,
  IconTrophy,
  IconUsers,
  IconPhone,
  IconSparkles,
  IconArrowRight,
  IconStarFilled,
} from '@tabler/icons-react';

/* ── Metal types we buy ── */
const METALS = [
  {
    icon: IconCoin,
    name: 'Gold',
    desc: 'Rings, chains, coins, bars, dental gold — any karat, any condition.',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]',
    borderColor: 'border-amber-500/30',
  },
  {
    icon: IconDiamond,
    name: 'Silver',
    desc: 'Sterling, coins, flatware, tea sets, bars — tarnished or polished.',
    gradient: 'from-slate-300 via-gray-200 to-slate-400',
    glow: 'shadow-[0_0_40px_rgba(148,163,184,0.2)]',
    borderColor: 'border-slate-400/30',
  },
  {
    icon: IconTrophy,
    name: 'Platinum',
    desc: 'Jewelry, coins, bars, industrial scrap — we test and pay premium.',
    gradient: 'from-zinc-300 via-white to-zinc-400',
    glow: 'shadow-[0_0_40px_rgba(228,228,231,0.2)]',
    borderColor: 'border-zinc-300/30',
  },
  {
    icon: IconScale,
    name: 'Flatware & Metals',
    desc: 'Silverware sets, serving pieces, mixed metals — bring it all in.',
    gradient: 'from-orange-300 via-amber-400 to-yellow-600',
    glow: 'shadow-[0_0_40px_rgba(251,191,36,0.2)]',
    borderColor: 'border-amber-400/30',
  },
];

/* ── Why sell to us bullets ── */
const REASONS = [
  { icon: IconCash, text: 'Top Dollar — We Beat Competitors\' Prices' },
  { icon: IconScale, text: 'Precision Weigh-In with Certified Scales' },
  { icon: IconSparkles, text: 'Any Condition — Broken, Tangled, Scratched' },
  { icon: IconStarFilled, text: 'Instant Cash — Walk Out Paid Same Day' },
  { icon: IconUsers, text: 'Gold Parties — We Come to You' },
  { icon: IconPhone, text: 'Call or Visit — No Appointment Needed' },
];

/* ── Deterministic pseudo-random generator for SSR hydration ── */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getParticleStyle = (index: number) => {
  const seed1 = index * 73;
  const seed2 = index * 137;
  const seed3 = index * 211;
  const seed4 = index * 293;
  const seed5 = index * 349;
  const seed6 = index * 401;
  const seed7 = index * 467;
  
  const width = 2 + seededRandom(seed1) * 4;
  const height = 2 + seededRandom(seed2) * 4;
  const left = seededRandom(seed3) * 100;
  const top = 60 + seededRandom(seed4) * 40;
  const opacityBase = 0.5 + seededRandom(seed5) * 0.5;
  const greenVariance = Math.floor(seededRandom(seed6) * 40);
  const delay = seededRandom(seed7) * 6;
  const duration = 4 + seededRandom(index * 523) * 6;
  
  return {
    width: `${width}px`,
    height: `${height}px`,
    left: `${left}%`,
    top: `${top}%`,
    background: `radial-gradient(circle, rgba(245,${158 + greenVariance},11,${opacityBase}), transparent)`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
};

export default function GoldPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroImgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);

  return (
    <main className="relative overflow-hidden bg-vault-black-deep">
      {/* ═══════════════════════════════════════════════
          HERO — Full-bleed vault image with overlay text
          ═══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Parallax background image */}
        <motion.div
          style={{ y: heroImgY }}
          className="absolute inset-0 z-0"
        >
          <Image
            src="/images/GOLD.png"
            alt="Vault filled with gold bars, silver coins, and precious metals"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Dark overlay gradient — bottom-heavy for text readability */}
          <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-[#0a0f1a] dark:via-[#0a0f1a]/70 dark:to-transparent bg-gradient-to-t from-white/80 via-white/60 to-transparent" />
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-[#0a0f1a]/60 dark:via-transparent dark:to-[#0a0f1a]/60 bg-gradient-to-r from-white/70 via-white/50 to-white/70" />
          {/* Gold-tinted vignette */}
          <div className="absolute inset-0 dark:block hidden" style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,15,26,0.85) 100%)',
          }} />
          <div className="absolute inset-0 light:block hidden" style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.5) 100%)',
          }} />
        </motion.div>

        {/* Floating gold particles (CSS-only) */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <span
              key={i}
              className="absolute block rounded-full animate-float-particle"
              style={getParticleStyle(i)}
            />
          ))}
        </div>

        {/* Hero text */}
        <motion.div
          style={{ y: textY, opacity: heroOpacity }}
          className="relative z-10 max-w-5xl px-4 mx-auto text-center"
        >
          {/* Tagline badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 mb-8 text-xs font-semibold tracking-[0.25em] uppercase rounded-full border border-amber-500/30 bg-amber-500/10 dark:text-amber-300 text-amber-700 backdrop-blur-sm">
              <IconCoin className="w-4 h-4" />
              Jacksonville&apos;s Premier Gold Buyer
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tight"
          >
            <span className="block dark:text-white text-slate-900">We Buy</span>
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r dark:from-amber-300 dark:via-yellow-400 dark:to-amber-500 from-amber-700 via-amber-600 to-amber-800" style={{
              textShadow: 'var(--tw-text-shadow, none)',
            }}>
              Gold & Precious Metals
            </span>
          </motion.h1>

          {/* Sub text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="max-w-2xl mx-auto mt-8 text-lg leading-relaxed sm:text-xl dark:text-slate-300/90 text-slate-900"
          >
            Sell your gold, silver, platinum, coins, and flatware for{' '}
            <span className="font-semibold dark:text-amber-400 text-amber-900">fast cash</span> — any condition.
            We pay <span className="font-semibold dark:text-white text-slate-900">top dollar</span> and{' '}
            <span className="underline underline-offset-4 dark:decoration-amber-500/50 decoration-amber-900/70 decoration-2">
              beat any competitor&apos;s price
            </span>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="flex flex-col items-center gap-4 mt-10 sm:flex-row sm:justify-center"
          >
            <Link href="/appraise">
              <Button
                size="lg"
                className="relative px-8 py-6 text-lg font-bold tracking-wide text-black transition-all duration-300 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] rounded-xl group"
              >
                Get a Free Appraisal
                <IconArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="tel:+19047441776">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg font-semibold tracking-wide border-2 rounded-xl dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:border-amber-500/60 border-amber-700/60 text-amber-900 hover:bg-amber-100/20 hover:border-amber-800/60 backdrop-blur-sm"
              >
                <IconPhone className="w-5 h-5 mr-2" />
                (904) 744-1776
              </Button>
            </a>
          </motion.div>

          {/* Scroll indicator — only visible in dark mode */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute -translate-x-1/2 left-1/2 bottom-8 dark:block hidden"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs tracking-[0.2em] uppercase text-amber-400/60">Scroll</span>
              <div className="w-px h-8 bg-gradient-to-b from-amber-400/60 to-transparent animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          WHAT WE BUY — Metal category cards
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32">
        {/* Subtle gold radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-[0.3em] uppercase dark:text-amber-400 text-amber-700 border dark:border-amber-500/20 border-amber-600/30 rounded-full dark:bg-amber-500/5 bg-amber-200/30">
              What We Buy
            </span>
            <h2 className="text-4xl font-bold dark:text-white text-slate-900 font-display sm:text-5xl">
              Gold, Silver, Platinum &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r dark:from-amber-300 dark:to-yellow-500 from-amber-700 to-amber-800">More</span>
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-lg dark:text-vault-text-muted text-slate-700">
              Gold, silver, platinum, flatware, and metals — any condition, any form.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {METALS.map((metal, i) => (
              <motion.div
                key={metal.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Card className={`relative overflow-hidden border ${metal.borderColor} bg-vault-surface/50 backdrop-blur-sm hover:bg-vault-surface-elevated/80 transition-all duration-500 group cursor-default ${metal.glow} hover:scale-[1.02]`}>
                  {/* Top gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${metal.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  <CardContent className="p-6 pt-8">
                    <div className={`mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${metal.gradient} shadow-lg`}>
                      <metal.icon className="w-7 h-7 text-black/80" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold dark:text-white text-slate-900 font-display">{metal.name}</h3>
                    <p className="text-sm leading-relaxed dark:text-vault-text-muted text-slate-700">{metal.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          THE PROMISE — Angled split with image
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden sm:py-32">
        {/* Diagonal slice background */}
        <div className="absolute inset-0 -skew-y-2 bg-gradient-to-br from-amber-950/20 via-vault-surface/40 to-vault-black-deep" />

        <div className="relative z-10 max-w-6xl px-4 mx-auto">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Image side */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.15)] border border-amber-500/20">
                <Image
                  src="/images/GOLD.png"
                  alt="Precious metals vault collection"
                  width={700}
                  height={500}
                  className="object-cover w-full h-auto"
                />
                {/* Overlay sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-amber-500/10" />
              </div>
              {/* Floating accent card */}
              <div className="absolute -bottom-6 -right-4 sm:-right-8 px-6 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl shadow-[0_8px_30px_rgba(245,158,11,0.4)] text-black">
                <p className="text-2xl font-black font-display">Top Dollar</p>
                <p className="text-sm font-semibold opacity-80">Guaranteed</p>
              </div>
            </motion.div>

            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.3em] uppercase dark:text-amber-400 text-amber-700 border dark:border-amber-500/20 border-amber-600/30 rounded-full dark:bg-amber-500/5 bg-amber-200/30">
                Our Promise
              </span>
              <h2 className="mb-6 text-3xl font-bold leading-tight dark:text-white text-slate-900 font-display sm:text-4xl lg:text-5xl">
                Fast Cash,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r dark:from-amber-300 dark:to-yellow-500 from-amber-900 to-orange-900">
                  Fair Prices
                </span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed dark:text-slate-300/90 text-vault-black/80">
                We buy gold, silver, platinum coins, any flatware or metals. Sell your gold and
                precious metals to us for <span className="font-semibold dark:text-amber-400 text-amber-700">fast cash</span> in
                any condition. We pay <span className="font-semibold dark:text-white text-vault-black">top dollar</span> and
                will <span className="underline underline-offset-4 dark:decoration-amber-500/50 decoration-amber-700/40 decoration-2">beat any
                competitors&apos; prices</span>.
              </p>
              <p className="mb-8 text-lg leading-relaxed dark:text-slate-300/90 text-vault-black/80">
                Also, we host <span className="font-semibold dark:text-amber-400 text-amber-700">gold parties</span>.
                Contact us today if you have anything that you are interested in selling.
              </p>

              {/* Why us bullets */}
              <div className="grid gap-3 sm:grid-cols-2">
                {REASONS.map((reason, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                    className="flex items-start gap-3 p-3 transition-colors border rounded-lg dark:bg-vault-surface/30 dark:border-amber-500/10 dark:hover:border-amber-500/25 bg-amber-100/40 border-amber-300/30 hover:border-amber-400/40 group"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <reason.icon className="w-5 h-5 transition-colors dark:text-amber-400 dark:group-hover:text-amber-300 text-amber-700 group-hover:text-amber-600" />
                    </div>
                    <span className="text-sm font-medium dark:text-slate-200 text-vault-black/80">{reason.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          GOLD PARTIES CTA
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden sm:py-32">
        {/* Ambient glow */}
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-amber-500/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden border rounded-3xl dark:border-amber-500/20 border-amber-400/30 dark:bg-gradient-to-br dark:from-vault-surface dark:via-vault-surface-elevated dark:to-vault-surface bg-amber-100/50"
          >
            {/* Inner glow effect */}
            <div className="absolute top-0 w-3/4 h-px -translate-x-1/2 left-1/2 dark:bg-gradient-to-r dark:from-transparent dark:via-amber-400/60 dark:to-transparent bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
            <div className="absolute bottom-0 w-1/2 h-px -translate-x-1/2 left-1/2 dark:bg-gradient-to-r dark:from-transparent dark:via-amber-500/30 dark:to-transparent bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />

            <div className="p-8 text-center sm:p-12 lg:p-16">
              {/* Party icon */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-[0_0_50px_rgba(245,158,11,0.3)] rotate-3"
              >
                <IconUsers className="w-10 h-10 text-black/80" />
              </motion.div>

              <h2 className="mb-4 text-3xl font-bold dark:text-white text-slate-900 font-display sm:text-4xl lg:text-5xl">
                We Host{' '}
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r dark:from-amber-300 dark:via-yellow-400 dark:to-amber-500 from-amber-900 via-amber-800 to-orange-900">
                  Gold Parties
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 dark:bg-gradient-to-r dark:from-amber-400/0 dark:via-amber-400/80 dark:to-amber-400/0 bg-gradient-to-r from-amber-700/0 via-amber-700/60 to-amber-700/0" />
                </span>
              </h2>
              <p className="max-w-2xl mx-auto mb-10 text-lg leading-relaxed dark:text-slate-300/90 text-vault-black/80">
                Gather your friends, bring your gold, and turn an evening into easy money.
                We come to you with our certified scales and pay everyone on the spot.
                It&apos;s the most profitable party you&apos;ll ever throw.
              </p>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a href="tel:+19047441776">
                  <Button
                    size="lg"
                    className="px-8 py-6 text-lg font-bold tracking-wide text-black dark:bg-gradient-to-r dark:from-amber-400 dark:via-yellow-400 dark:to-amber-500 dark:hover:from-amber-300 dark:hover:via-yellow-300 dark:hover:to-amber-400 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:via-amber-600 hover:to-amber-700 dark:shadow-[0_0_25px_rgba(245,158,11,0.35)] rounded-xl group transition-all duraiton-300"
                  >
                    <IconPhone className="w-5 h-5 mr-2" />
                    Book a Gold Party
                    <IconArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </a>
                <Link href="/appraise">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-6 text-lg font-semibold tracking-wide border-2 rounded-xl dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:border-amber-500/50 border-amber-600/30 text-amber-700 hover:bg-amber-200/20 hover:border-amber-600/50 backdrop-blur-sm"
                  >
                    Or Get an AI Appraisal First
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BOTTOM CTA — Full-width gold bar
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="relative z-10 px-4 py-16 mx-auto text-center dark:bg-gradient-to-r dark:from-amber-600 dark:via-yellow-500 dark:to-amber-600 bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200">
          {/* Metallic texture overlay */}
          <div className="absolute inset-0 dark:opacity-10 opacity-5" style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.15) 2px,
              rgba(0,0,0,0.15) 4px
            )`,
            backgroundSize: '4px 100%',
          }} />
          {/* Shine sweep */}
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-transparent dark:via-white/10 dark:to-transparent bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />

          <div className="relative z-10">
            <h3 className="mb-3 text-2xl font-black tracking-tight font-display sm:text-3xl dark:text-black/90 text-slate-900">
              Ready to Turn Your Gold Into Cash?
            </h3>
            <p className="max-w-lg mx-auto mb-6 font-medium dark:text-black/70 text-vault-black/80">
              Visit us at 6132 Merrill Rd Ste 1, Jacksonville, FL 32277 — or call anytime.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/appraise">
                <Button
                  size="lg"
                  className="px-8 py-5 text-base font-bold shadow-lg dark:bg-black dark:shadow-lg dark:text-amber-400 dark:hover:bg-black/90 bg-vault-black text-amber-400 hover:bg-vault-black/90 rounded-xl"
                >
                  Free AI Appraisal
                </Button>
              </Link>
              <a href="tel:+19047441776">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-5 text-base font-bold border-2 dark:text-black dark:border-2 dark:border-black/30 dark:hover:bg-black/10 text-vault-black border-vault-black/30 hover:bg-vault-black/5 rounded-xl"
                >
                  <IconPhone className="w-5 h-5 mr-2" />
                  (904) 744-1776
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          STYLES — Particle animation
          ═══════════════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes float-particle {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-120vh) translateX(30px) scale(0.3);
            opacity: 0;
          }
        }
        .animate-float-particle {
          animation: float-particle 8s ease-out infinite;
        }
      `}</style>
    </main>
  );
}
