'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type GoldPriceData = {
  gold: number;
  silver: number;
  platinum: number;
  timestamp: string;
  source: string;
};

const CLIENT_FALLBACK_PRICES: GoldPriceData = {
  gold: 2050,
  silver: 24.5,
  platinum: 950,
  timestamp: new Date().toISOString(),
  source: 'fallback',
};

export default function GoldTicker() {
  const [prices, setPrices] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulsing, setPulsing] = useState(false);

  const fetchPrices = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch('/api/gold-price', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to fetch prices');
      const data: GoldPriceData = await res.json();

      // Trigger pulse animation if prices changed
      if (prices && (data.gold !== prices.gold || data.silver !== prices.silver || data.platinum !== prices.platinum)) {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 1500);
      }

      setPrices(data);
    } catch {
      if (!prices) {
        setPrices(CLIENT_FALLBACK_PRICES);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-vault-gold/10 via-vault-gold/5 to-vault-gold/10 border-b border-vault-gold/10">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-center">
        {loading ? (
          <Skeleton className="h-4 w-64 bg-vault-gold/20" />
        ) : prices ? (
          <div className={`flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-mono transition-all duration-300 ${pulsing ? 'scale-105 text-vault-gold-light' : 'text-vault-gold'}`}>
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">🟡</span>
              <span className="hidden sm:inline">Gold:</span>
              <span className="font-semibold">${prices.gold.toFixed(2)}<span className="text-vault-text-muted">/oz</span></span>
            </span>
            <span className="text-vault-gold/30">|</span>
            <span className="flex items-center gap-1">
              <span className="hidden sm:inline">Silver:</span>
              <span className="font-semibold">${prices.silver.toFixed(2)}<span className="text-vault-text-muted">/oz</span></span>
            </span>
            <span className="text-vault-gold/30">|</span>
            <span className="flex items-center gap-1">
              <span className="hidden sm:inline">Platinum:</span>
              <span className="font-semibold">${prices.platinum.toFixed(2)}<span className="text-vault-text-muted">/oz</span></span>
            </span>
          </div>
        ) : (
          <span className="text-vault-text-muted text-xs font-mono">Prices unavailable</span>
        )}
      </div>
    </div>
  );
}
