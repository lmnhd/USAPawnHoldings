'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

/* ── Constants ── */

const CATEGORIES = [
  { icon: '🏅', title: 'Gold & Jewelry', desc: 'Rings, chains, watches, diamonds — top dollar at live spot prices.', filter: 'jewelry' },
  { icon: '📱', title: 'Electronics', desc: 'Laptops, phones, consoles, TVs — we buy and loan on the latest tech.', filter: 'electronics' },
  { icon: '🔧', title: 'Tools & Equipment', desc: 'Power tools, hand tools, generators — working condition gets top offers.', filter: 'tools' },
  { icon: '🔫', title: 'Firearms', desc: 'Handguns, rifles, shotguns — licensed FFL dealer, legal transfers only.', filter: 'firearms' },
  { icon: '🎸', title: 'Musical Instruments', desc: 'Guitars, amps, keyboards, drums — bring your gear and get paid.', filter: 'musical' },
  { icon: '🎨', title: 'Collectibles', desc: 'Coins, sports memorabilia, antiques — rare finds are our specialty.', filter: 'collectibles' },
  { icon: '⚾', title: 'Sporting Goods', desc: 'Bows, fishing gear, fitness equipment — outdoor & sports gear welcome.', filter: 'sporting' },
];

const STEPS = [
  {
    num: '1',
    title: 'Bring Your Item In',
    desc: 'Visit our store at 6132 Merrill Rd, or upload a photo online for an instant AI estimate before you even leave home.',
    detail: 'No appointment needed — walk-ins welcome Mon–Sat.',
  },
  {
    num: '2',
    title: 'Get a Fair Appraisal',
    desc: 'Our AI-powered system checks real-time market data, spot prices, and comparable sales to give you the most accurate valuation possible.',
    detail: 'We use GPT-4o Vision + live gold/silver/platinum spot prices.',
  },
  {
    num: '3',
    title: 'Walk Out with Cash',
    desc: 'Choose a pawn loan (get your item back later) or sell outright. Either way, you leave with cash in your pocket the same day.',
    detail: 'Loans start at 30 days. Sell for a higher immediate payout.',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need an ID?',
    a: 'Yes. Florida law requires a valid government-issued photo ID (driver\'s license, passport, or state ID) for all pawn transactions. This protects both you and us.',
  },
  {
    q: 'Can I get my item back?',
    a: 'Absolutely. You have 30 days to repay your loan plus interest and reclaim your item. We hold it securely in our vault during that time.',
  },
  {
    q: 'What if I can\'t repay on time?',
    a: 'We offer extension options so you can keep your loan active. If you\'re unable to repay, the item becomes store property and is sold — but there\'s never any impact to your credit score.',
  },
  {
    q: 'How is the loan amount determined?',
    a: 'Typically 25–33% of the item\'s appraised market value, depending on condition, demand, and current spot prices (for precious metals). Our AI gives you a transparent estimate before you commit.',
  },
  {
    q: 'What happens if I default?',
    a: 'The item is sold in our store. Unlike traditional loans, pawn loans have zero impact on your credit score — the item itself is the only collateral.',
  },
  {
    q: 'Do you buy items outright?',
    a: 'Yes! If you\'d rather sell than pawn, we offer competitive outright purchase prices. You\'ll typically get a higher immediate payout than a loan amount.',
  },
];

const LOAN_TERMS = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

/* ── Page ── */

export default function InfoPage() {
  const [itemValue, setItemValue] = useState(500);
  const [termIndex, setTermIndex] = useState(0);

  /* Calculator logic */
  const loanCalc = useMemo(() => {
    const ltv = 0.3; // 30% loan-to-value
    const interestRate = 0.25; // 25% per 30 days
    const term = LOAN_TERMS[termIndex];
    const periods = term.days / 30;

    const loanAmount = Math.round(itemValue * ltv);
    const interest = Math.round(loanAmount * interestRate * periods);
    const totalPayback = loanAmount + interest;

    return { loanAmount, interest, totalPayback, term };
  }, [itemValue, termIndex]);

  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vault-black-deep via-vault-black to-vault-black-deep" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, var(--vault-gold) 0%, transparent 50%)`,
          }}
        />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-vault-gold/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-vault-gold/40 to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block px-4 py-1.5 text-xs font-mono font-semibold tracking-[0.2em] text-white bg-vault-red/10 border border-vault-red/40 rounded-full uppercase mb-6">
            Learn How It Works
          </span>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            How{' '}
            <span className="bg-gradient-to-r from-vault-red via-vault-gold to-vault-gold bg-clip-text text-transparent">
              Pawning
            </span>{' '}
            Works
          </h1>

          <p className="mt-5 text-lg text-vault-text-muted max-w-2xl mx-auto leading-relaxed">
            Your complete guide to pawn loans, selling pre-owned items, and getting the best value for your valuables.
          </p>
        </div>
      </section>

      {/* ═══════════════ WHAT IS A PAWN LOAN? ═══════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-light text-center mb-6">
            What is a <span className="text-vault-red">Pawn Loan</span>?
          </h2>

          <div className="max-w-3xl mx-auto">
            <p className="text-vault-text-muted text-base sm:text-lg leading-relaxed text-center">
              A pawn loan is a short-term loan secured by your personal property. Unlike traditional
              loans, there&apos;s no credit check, no employment verification, and no impact on your
              credit score. You bring in an item of value, we appraise it, and you walk out with
              cash. When you repay the loan plus interest, you get your item back — simple as that.
            </p>

            {/* Key benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
              {[
                { icon: '✅', text: 'No credit check required' },
                { icon: '⚡', text: 'Cash in hand the same day' },
                { icon: '🔒', text: 'Your item stored safely in our vault' },
                { icon: '🔄', text: 'Get your item back when you repay' },
                { icon: '📊', text: 'No impact on your credit score' },
                { icon: '🤝', text: 'Fair appraisals using real market data' },
              ].map((benefit, idx) => (
                <div
                  key={benefit.text}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-vault-surface-elevated border ${idx % 3 === 0 ? 'border-vault-red/20 hover:border-vault-red/40' : 'border-vault-gold/10 hover:border-vault-gold/30'} transition-colors`}
                >
                  <span className="text-lg">{benefit.icon}</span>
                  <span className="text-sm text-vault-text-light font-body">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ 3-STEP PROCESS (detailed) ═══════════════ */}
      <section className="py-16 sm:py-20 bg-vault-surface/50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-light text-center mb-14">
            Simple <span className="text-vault-red">3-Step</span> Process
          </h2>

          <div className="space-y-8">
            {STEPS.map((step, idx) => (
              <div
                key={step.num}
                className="group relative flex gap-6 items-start"
              >
                {/* Step number */}
                <div className="flex-shrink-0">
                  <Badge className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full bg-vault-black border-2 ${idx === 1 ? 'border-vault-red text-vault-red group-hover:bg-vault-red' : 'border-vault-gold text-vault-gold group-hover:bg-vault-gold'} font-display text-2xl font-bold group-hover:text-white transition-all duration-300`}>
                    {step.num}
                  </Badge>
                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div className={`absolute left-7 top-14 w-0.5 h-8 bg-gradient-to-b ${idx === 0 ? 'from-vault-gold/40 via-vault-red/30' : 'from-vault-red/40 via-vault-gold/30'} to-transparent`} />
                  )}
                </div>

                {/* Content */}
                <Card className={`bg-vault-surface-elevated border rounded-2xl flex-1 transition-colors ${idx === 1 ? 'border-vault-red/10 group-hover:border-vault-red/30' : 'border-vault-gold/10 group-hover:border-vault-gold/30'}`}>
                  <CardContent className="p-6">
                    <h3 className="font-display text-xl font-semibold text-vault-text-light mb-2">
                      {step.title}
                    </h3>
                    <p className="text-vault-text-muted leading-relaxed">
                      {step.desc}
                    </p>
                    <p className={`mt-3 text-xs font-mono ${idx === 1 ? 'text-vault-red/70' : 'text-vault-gold/70'}`}>
                      💡 {step.detail}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ LOAN CALCULATOR ═══════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-light text-center mb-4">
            Loan <span className="text-vault-gold">Calculator</span>
          </h2>
          <p className="text-vault-text-muted text-center mb-10 max-w-lg mx-auto">
            See an estimate of your pawn loan based on item value. Numbers are illustrative — actual offers may vary.
          </p>

          <div className="max-w-lg mx-auto bg-vault-surface-elevated border-2 border-vault-gold/20 hover:border-vault-red/30 rounded-2xl p-6 sm:p-8 shadow-xl shadow-vault-gold/5 transition-colors">
            {/* Item Value Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-vault-text-light">
                  Estimated Item Value
                </Label>
                <span className="font-mono text-lg font-bold text-vault-gold">
                  ${itemValue.toLocaleString()}
                </span>
              </div>
              <Slider
                min={50}
                max={10000}
                step={50}
                value={[itemValue]}
                onValueChange={(v) => setItemValue(v[0])}
                className="w-full [&>span:first-child]:bg-vault-surface [&>span:first-child>span]:bg-vault-gold [&_[role=slider]]:bg-vault-gold [&_[role=slider]]:border-vault-gold [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-vault-gold/30"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-vault-text-muted font-mono">
                <span>$50</span>
                <span>$10,000</span>
              </div>
            </div>

            {/* Loan Term Selector */}
            <div className="mb-8">
              <Label className="block text-sm font-semibold text-vault-text-light mb-3">
                Loan Term
              </Label>
              <div className="flex gap-2">
                {LOAN_TERMS.map((term, i) => (
                  <Button
                    key={term.days}
                    variant={termIndex === i ? "default" : "outline"}
                    onClick={() => setTermIndex(i)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      termIndex === i
                        ? 'gold-gradient text-vault-text-on-gold shadow-lg shadow-vault-gold/20'
                        : 'bg-vault-surface border border-vault-gold/10 text-vault-text-muted hover:border-vault-gold/30 hover:text-vault-text-light'
                    }`}
                  >
                    {term.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <Separator className="h-px bg-gradient-to-r from-transparent via-vault-gold/30 to-transparent mb-6" />

            {/* Results */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-vault-text-muted">Estimated Loan Amount</span>
                <span className="font-mono text-xl font-bold text-vault-red">
                  ${loanCalc.loanAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-vault-text-muted">
                  Interest (25% × {loanCalc.term.days / 30} {loanCalc.term.days === 30 ? 'period' : 'periods'})
                </span>
                <span className="font-mono text-base text-vault-warning">
                  ${loanCalc.interest.toLocaleString()}
                </span>
              </div>

              <Separator className="bg-vault-gold/10" />

              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-semibold text-vault-text-light">Total to Reclaim</span>
                <span className="font-mono text-2xl font-bold text-vault-text-light">
                  ${loanCalc.totalPayback.toLocaleString()}
                </span>
              </div>
            </div>

            {/* LTV note */}
            <p className="mt-6 text-[11px] text-vault-text-muted/60 font-mono text-center leading-relaxed">
              Loan-to-value ratio: 30%. Interest: 25% per 30-day period.
              <br />
              Actual terms subject to in-store appraisal.
            </p>

            {/* CTA */}
            <Button asChild className="flex items-center justify-center gap-2 mt-6 w-full py-3.5 rounded-xl font-semibold text-vault-text-on-gold gold-gradient hover:shadow-lg hover:shadow-vault-gold/20 transition-all">
              <Link href="/appraise">
                <span>📸</span>
                Get Pre-Approved with AI Appraisal
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHAT WE ACCEPT ═══════════════ */}
      <section className="py-16 sm:py-20 bg-vault-surface/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-light text-center mb-4">
            What We <span className="bg-gradient-to-r from-vault-red to-vault-gold bg-clip-text text-transparent">Accept</span>
          </h2>
          <p className="text-vault-text-muted text-center mb-12 max-w-lg mx-auto">
            From gold chains to power tools — if it has value, we want to see it.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {CATEGORIES.map((cat, idx) => (
              <Link
                key={cat.title}
                href={`/inventory?category=${cat.filter}`}
                className={`group relative bg-vault-surface-elevated border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${idx % 4 === 0 ? 'border-vault-red/10 hover:border-vault-red/40 hover:shadow-vault-red/5' : 'border-vault-gold/10 hover:border-vault-gold/40 hover:shadow-vault-gold/5'}`}
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className={`font-display text-lg font-semibold text-vault-text-light transition-colors ${idx % 4 === 0 ? 'group-hover:text-vault-red' : 'group-hover:text-vault-gold'}`}>
                  {cat.title}
                </h3>
                <p className="mt-2 text-sm text-vault-text-muted leading-relaxed">
                  {cat.desc}
                </p>
                {/* Browse arrow */}
                <div className={`mt-4 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${idx % 4 === 0 ? 'text-vault-red' : 'text-vault-gold'}`}>
                  Browse items
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ boxShadow: 'inset 0 0 30px rgba(201,168,76,0.05)' }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ACCORDION ═══════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-light text-center mb-4">
            Frequently Asked <span className="bg-gradient-to-r from-vault-gold to-vault-red bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className="text-vault-text-muted text-center mb-10">
            Everything you need to know about pawning, buying, and selling.
          </p>

          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className={`border rounded-xl bg-vault-surface-elevated/50 transition-all duration-300 ${index % 3 === 0 ? 'border-vault-red/10 hover:border-vault-red/20 data-[state=open]:border-vault-red/40 data-[state=open]:shadow-vault-red/5' : 'border-vault-gold/10 hover:border-vault-gold/20 data-[state=open]:border-vault-gold/40 data-[state=open]:shadow-vault-gold/5'} data-[state=open]:bg-vault-surface-elevated data-[state=open]:shadow-lg`}
              >
                <AccordionTrigger className={`w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:no-underline [&>svg]:w-5 [&>svg]:h-5 ${index % 3 === 0 ? '[&>svg]:text-vault-red' : '[&>svg]:text-vault-gold'}`}>
                  <span className="font-display text-base sm:text-lg font-semibold text-vault-text-light pr-4">
                    {faq.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 text-sm sm:text-base text-vault-text-muted leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-20 sm:py-24 bg-vault-surface/50 border-t border-vault-gold/10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-light">
            Ready to <span className="text-vault-red">Get Started</span>?
          </h2>
          <p className="mt-4 text-vault-text-muted max-w-lg mx-auto leading-relaxed">
            Whether you&apos;re looking to pawn, sell, or buy — we&apos;re here to help. Get an instant estimate online or visit us in person.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white red-gradient shadow-lg shadow-vault-red/20 hover:shadow-vault-red/40 hover:scale-[1.02] transition-all duration-300">
              <Link href="/appraise">
                <span className="text-lg">📸</span>
                Get AI Appraisal
              </Link>
            </Button>
            <Button asChild variant="outline" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-vault-gold border-2 border-vault-gold/40 hover:border-vault-gold hover:bg-vault-gold/5 transition-all duration-300">
              <a
                href="https://maps.google.com/?q=6132+Merrill+Rd+Ste+1+Jacksonville+FL+32277"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="text-lg">📍</span>
                Visit Store
              </a>
            </Button>
          </div>

          {/* Phone */}
          <a
            href="tel:+19046417296"
            className="inline-flex items-center gap-2 mt-8 text-vault-red/80 hover:text-vault-red text-sm font-mono transition-colors"
          >
            📞 (904) 641-7296
          </a>
        </div>
      </section>
    </>
  );
}
