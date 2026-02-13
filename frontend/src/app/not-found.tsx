import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-vault-black-deep flex items-center justify-center relative overflow-hidden">
      {/* Subtle radial gold glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, #C9A84C 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 text-center px-6 py-12 max-w-lg mx-auto">
        {/* Logo / Brand Mark */}
        <div className="mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-vault-gold/40 bg-vault-surface-elevated">
            <span className="font-display text-3xl font-black text-vault-gold">UP</span>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-vault-gold/60">
            USA Pawn Holdings
          </p>
        </div>

        {/* 404 Heading */}
        <h1 className="font-display text-7xl font-black text-vault-text-light md:text-8xl">
          404
        </h1>

        <p className="mt-4 font-display text-2xl font-bold text-vault-gold md:text-3xl">
          Page Not Found
        </p>

        <p className="mt-3 text-lg text-vault-text-muted leading-relaxed">
          Looks like this page has gone missing&hellip;
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild className="bg-vault-gold px-6 py-3 font-semibold text-vault-text-on-gold shadow-lg transition-transform hover:scale-105 hover:bg-vault-gold-light">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline" className="border-2 border-vault-gold px-6 py-3 font-semibold text-vault-gold hover:bg-vault-gold hover:text-vault-text-on-gold">
            <Link href="/appraise">Get Appraisal</Link>
          </Button>
          <Button asChild variant="outline" className="border-2 border-vault-surface-elevated px-6 py-3 font-semibold text-vault-text-muted hover:border-vault-gold/40 hover:text-vault-text-light">
            <Link href="/inventory">Browse Inventory</Link>
          </Button>
        </div>

        <Separator className="mt-12 mb-4 bg-vault-surface-elevated/40" />

        {/* Store Info */}
        <p className="text-sm text-vault-text-muted/60">
          6132 Merrill Rd Ste 1, Jacksonville, FL 32277 &nbsp;·&nbsp;{' '}
          <a
            href="tel:+19047441776"
            className="text-vault-gold/70 hover:text-vault-gold transition-colors"
          >
            (904) 744-1776
          </a>
        </p>
      </div>
    </div>
  )
}
