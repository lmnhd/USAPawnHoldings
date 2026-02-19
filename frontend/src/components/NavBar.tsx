'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import GoldTicker from './GoldTicker';
import ThemeToggle from './ThemeToggle';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/?heroMode=appraisal&heroOpen=1', label: 'Appraise', highlight: true },
  { href: '/gold', label: 'Gold', gold: true },
  { href: '/inventory', label: 'Inventory' },
  { href: '/media', label: 'Media' },
  { href: '/info', label: 'Info' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md border-vault-border-accent" style={{ backgroundColor: 'var(--vault-nav-bg)' }}>
      {/* Gold Ticker Strip */}
      <GoldTicker />

      {/* Main Nav */}
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vault-red/60 to-transparent" />
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/logo-symbol.png"
              alt="USA Pawn Holdings Logo"
              width={300}
              height={240}
              className="w-auto h-10 transition-opacity duration-200 md:h-12 group-hover:opacity-90"
              priority
            />
          </Link>

          {/* Desktop Links */}
          <div className="items-center hidden gap-2 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 tracking-wide
                    ${isActive
                      ? 'text-vault-text-light bg-vault-red/10'
                      : 'text-vault-text-light hover:text-vault-red'
                    }
                    ${link.highlight && !isActive
                      ? 'bg-vault-red/10 hover:bg-vault-red/20 border border-vault-red/30 text-vault-text-light'
                      : ''
                    }
                    ${'gold' in link && link.gold && !isActive
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300'
                      : ''
                    }
                  `}
                >
                  {link.label}
                  {isActive && (
                    <>
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-vault-red rounded-full" />
                    </>
                  )}
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-2 transition-colors rounded-md text-vault-text-light hover:text-vault-red hover:bg-vault-surface-elevated"
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="bg-vault-black border-vault-border-accent">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="px-4 py-3 space-y-1">
                  {NAV_LINKS.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`
                          block px-4 py-3 rounded-lg text-base font-medium transition-colors
                          ${isActive
                            ? 'text-white bg-vault-red/10 border-l-2 border-vault-red'
                            : 'text-vault-text-light hover:text-white hover:bg-vault-surface-elevated'
                          }
                        `}
                      >
                        {link.label}
                        {link.highlight && !isActive && (
                          <Badge variant="secondary" className="ml-2 text-xs text-white bg-vault-red/15">
                            AI
                          </Badge>
                        )}
                        {'gold' in link && link.gold && !isActive && (
                          <Badge variant="secondary" className="ml-2 text-xs text-amber-300 bg-amber-500/15">
                            ★
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
