'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Prevent hydration mismatch — render placeholder with same dimensions
    return (
      <Skeleton className="w-10 h-10 rounded-lg" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-10 h-10 rounded-lg bg-vault-surface-elevated border border-vault-border hover:border-vault-red/40 flex items-center justify-center transition-all duration-300 group overflow-hidden"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-500 ${
          isDark
            ? 'rotate-0 scale-100 opacity-100 text-vault-gold'
            : 'rotate-90 scale-0 opacity-0 text-vault-gold'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon (shown in light mode) */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-500 ${
          isDark
            ? '-rotate-90 scale-0 opacity-0 text-vault-text-primary'
            : 'rotate-0 scale-100 opacity-100 text-vault-text-primary'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </Button>
  );
}
