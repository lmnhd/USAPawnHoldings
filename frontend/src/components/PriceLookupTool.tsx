'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  parseMetalDescription,
  calculateValuation,
  formatCurrency,
  formatWeight,
  type ParsedMetalSpecs,
  type ValuationResult,
  type MetalType,
} from '@/lib/metalParser';

/* ------------------------------------------------------------------
   Price Lookup Tool Component
   Real-time gold/silver/platinum calculator for staff
   ------------------------------------------------------------------ */

type SpotPrices = {
  gold: number;
  silver: number;
  platinum: number;
  timestamp: string;
  source: string;
};

type StoreMargins = {
  payoutPercentMin: number;
  payoutPercentMax: number;
  pawnLoanPercent: number;
  retailPercent: number;
};

interface PriceLookupToolProps {
  onClose?: () => void;
}

export default function PriceLookupTool({ onClose }: PriceLookupToolProps) {
  const [description, setDescription] = useState('');
  const [parsedSpecs, setParsedSpecs] = useState<ParsedMetalSpecs | null>(null);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [spotPrices, setSpotPrices] = useState<SpotPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [manualWeight, setManualWeight] = useState('');
  const [manualMetalType, setManualMetalType] = useState<MetalType>('gold');
  const [manualPurity, setManualPurity] = useState('14k');
  const [showManual, setShowManual] = useState(false);

  // Default store margins (configurable)
  const storeMargins: StoreMargins = {
    payoutPercentMin: 0.70,
    payoutPercentMax: 0.80,
    pawnLoanPercent: 0.30,
    retailPercent: 1.20,
  };

  // Fetch spot prices on mount
  useEffect(() => {
    fetchSpotPrices();
  }, []);

  const fetchSpotPrices = async () => {
    setPriceLoading(true);
    try {
      const res = await fetch('/api/gold-price');
      if (res.ok) {
        const data = await res.json();
        setSpotPrices(data);
      }
    } catch (err) {
      console.error('Failed to fetch spot prices:', err);
    } finally {
      setPriceLoading(false);
    }
  };

  // Auto-calculate when description changes
  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      if (value.trim().length < 3) {
        setParsedSpecs(null);
        setValuation(null);
        return;
      }

      const specs = parseMetalDescription(value);
      setParsedSpecs(specs);

      if (spotPrices && specs.metalType !== 'unknown' && specs.weightGrams !== null) {
        const result = calculateValuation(specs, spotPrices, storeMargins);
        setValuation(result);
      } else {
        setValuation(null);
      }
    },
    [spotPrices, storeMargins]
  );

  // Manual calculation
  const handleManualCalculate = useCallback(() => {
    const weight = parseFloat(manualWeight);
    if (isNaN(weight) || weight <= 0 || !spotPrices) return;

    const specs: ParsedMetalSpecs = {
      metalType: manualMetalType,
      purity: getPurityFromInput(manualMetalType, manualPurity),
      weightGrams: weight,
      weightPennyweight: null,
      confidence: 'high',
      originalDescription: `${manualPurity} ${manualMetalType} item ${weight}g`,
      detectedKeywords: ['manual-entry'],
    };

    setParsedSpecs(specs);
    const result = calculateValuation(specs, spotPrices, storeMargins);
    setValuation(result);
  }, [manualWeight, manualMetalType, manualPurity, spotPrices, storeMargins]);

  const getPurityFromInput = (metal: MetalType, purityInput: string) => {
    const input = purityInput.toLowerCase();

    if (metal === 'gold') {
      if (input.includes('24')) return { karat: 24, decimal: 0.999, label: '24K' };
      if (input.includes('22')) return { karat: 22, decimal: 0.916, label: '22K' };
      if (input.includes('18')) return { karat: 18, decimal: 0.750, label: '18K' };
      if (input.includes('14')) return { karat: 14, decimal: 0.585, label: '14K' };
      if (input.includes('10')) return { karat: 10, decimal: 0.417, label: '10K' };
      return { karat: 14, decimal: 0.585, label: '14K (default)' };
    }

    if (metal === 'silver') {
      if (input.includes('999')) return { karat: null, decimal: 0.999, label: 'Fine Silver' };
      if (input.includes('925') || input.includes('sterling'))
        return { karat: null, decimal: 0.925, label: 'Sterling' };
      if (input.includes('900')) return { karat: null, decimal: 0.900, label: 'Coin Silver' };
      return { karat: null, decimal: 0.925, label: 'Sterling (default)' };
    }

    if (metal === 'platinum') {
      if (input.includes('999')) return { karat: null, decimal: 0.999, label: '.999 Pt' };
      if (input.includes('950')) return { karat: null, decimal: 0.950, label: '.950 Pt' };
      if (input.includes('900')) return { karat: null, decimal: 0.900, label: '.900 Pt' };
      return { karat: null, decimal: 0.950, label: '.950 Pt (default)' };
    }

    return { karat: null, decimal: 1.0, label: 'Pure' };
  };

  const getConfidenceBadge = (confidence: string) => {
    const styles =
      confidence === 'high'
        ? 'bg-green-500/20 text-green-400 border-green-500/30'
        : confidence === 'medium'
          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500/30';

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles}`}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
      </span>
    );
  };

  return (
    <Card className="rounded-xl border-vault-gold/15 bg-vault-surface-elevated overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <CardTitle className="font-display text-lg font-bold text-vault-text-light">
              Price Lookup
            </CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-vault-text-muted hover:text-vault-text-light">
              ✕
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Spot Prices Bar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-vault-black-deep border border-vault-gold/10">
          <span className="text-xs font-body text-vault-text-muted uppercase tracking-wider">
            Live Spot Prices
          </span>
          <div className="flex items-center gap-4">
            {priceLoading ? (
              <span className="text-xs text-vault-text-muted">Loading...</span>
            ) : spotPrices ? (
              <>
                <span className="text-xs font-mono text-vault-gold">
                  Gold: {formatCurrency(spotPrices.gold)}/oz
                </span>
                <span className="text-xs font-mono text-vault-text-muted">
                  Ag: {formatCurrency(spotPrices.silver)}/oz
                </span>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={fetchSpotPrices} className="text-xs text-vault-gold">
                Refresh Prices
              </Button>
            )}
          </div>
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <Label className="text-xs font-body font-medium text-vault-text-muted uppercase tracking-wider">
            Item Description
          </Label>
          <Input
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="e.g., '14k gold ring 5.2 grams' or 'sterling silver bracelet 12g'"
            className="w-full px-4 py-3 rounded-xl bg-vault-surface border-vault-gold/15 text-vault-text-light font-body placeholder-vault-text-muted/50 focus:outline-none focus:border-vault-gold/50 transition-colors"
          />
          <p className="text-[11px] text-vault-text-muted">
            Include metal type, purity (karat), and weight. Auto-calculates as you type.
          </p>
        </div>

        {/* Manual Override Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManual(!showManual)}
            className="text-xs text-vault-gold hover:text-vault-gold/80 p-0 h-auto"
          >
            {showManual ? '▼ Hide Manual Entry' : '▶ Manual Override'}
          </Button>
        </div>

        {/* Manual Entry Form */}
        {showManual && (
          <div className="p-4 rounded-lg bg-vault-black-deep/50 border border-vault-gold/10 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] text-vault-text-muted uppercase">Metal</Label>
                <select
                  value={manualMetalType}
                  onChange={(e) => setManualMetalType(e.target.value as MetalType)}
                  className="w-full px-2 py-2 rounded bg-vault-surface border border-vault-gold/15 text-vault-text-light text-sm"
                >
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-vault-text-muted uppercase">Purity</Label>
                <Input
                  type="text"
                  value={manualPurity}
                  onChange={(e) => setManualPurity(e.target.value)}
                  placeholder="14k, 925, etc."
                  className="px-2 py-2 h-auto text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] text-vault-text-muted uppercase">Weight (g)</Label>
                <Input
                  type="number"
                  value={manualWeight}
                  onChange={(e) => setManualWeight(e.target.value)}
                  placeholder="5.2"
                  step="0.1"
                  min="0"
                  className="px-2 py-2 h-auto text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleManualCalculate}
              disabled={!manualWeight || !spotPrices}
              className="w-full bg-vault-gold/20 text-vault-gold border border-vault-gold/30 hover:bg-vault-gold/30"
            >
              Calculate
            </Button>
          </div>
        )}

        {/* Parsed Specs Display */}
        {parsedSpecs && parsedSpecs.metalType !== 'unknown' && (
          <div className="p-3 rounded-lg bg-vault-gold/5 border border-vault-gold/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-vault-gold">Detected Specs</span>
              {getConfidenceBadge(parsedSpecs.confidence)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-[10px] text-vault-text-muted uppercase block">Metal</span>
                <span className="text-vault-text-light capitalize">{parsedSpecs.metalType}</span>
              </div>
              <div>
                <span className="text-[10px] text-vault-text-muted uppercase block">Purity</span>
                <span className="text-vault-text-light">{parsedSpecs.purity.label}</span>
              </div>
              <div>
                <span className="text-[10px] text-vault-text-muted uppercase block">Weight</span>
                <span className="text-vault-text-light">{formatWeight(parsedSpecs)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Valuation Results */}
        {valuation && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-r from-vault-gold/20 to-vault-gold/5 border border-vault-gold/30">
              <div className="text-xs text-vault-text-muted uppercase tracking-wider mb-1">
                Melt Value (Raw Metal Worth)
              </div>
              <div className="font-display text-3xl font-bold text-vault-gold">
                {formatCurrency(valuation.meltValue)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-vault-black-deep border border-vault-gold/10">
                <div className="text-[10px] text-vault-text-muted uppercase mb-1">Payout Offer</div>
                <div className="font-mono text-sm text-green-400">
                  {formatCurrency(valuation.payoutOfferLow)} - {formatCurrency(valuation.payoutOfferHigh)}
                </div>
                <div className="text-[10px] text-vault-text-muted">70-80% of melt</div>
              </div>

              <div className="p-3 rounded-lg bg-vault-black-deep border border-vault-gold/10">
                <div className="text-[10px] text-vault-text-muted uppercase mb-1">Pawn Loan Offer</div>
                <div className="font-mono text-sm text-vault-gold">
                  {formatCurrency(valuation.pawnLoanOffer)}
                </div>
                <div className="text-[10px] text-vault-text-muted">~30% of melt</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-vault-black-deep border border-vault-gold/10">
              <div className="text-[10px] text-vault-text-muted uppercase mb-1">Retail Estimate</div>
              <div className="font-mono text-sm text-vault-text-light">
                {formatCurrency(valuation.retailEstimate)}
              </div>
              <div className="text-[10px] text-vault-text-muted">~120% of melt (if sellable)</div>
            </div>

            {/* Calculation Breakdown */}
            <div className="p-3 rounded-lg bg-vault-black-deep/50 border border-vault-gold/5">
              <div className="text-[10px] text-vault-text-muted uppercase mb-2">Calculation</div>
              <div className="font-mono text-[11px] text-vault-text-muted space-y-1">
                <div>
                  {valuation.calculations.weightGrams.toFixed(2)}g × {valuation.calculations.purityDecimal} purity ={' '}
                  {valuation.calculations.pureMetalContent.toFixed(3)} oz pure
                </div>
                <div>
                  {valuation.calculations.pureMetalContent.toFixed(3)} oz ×{' '}
                  {formatCurrency(valuation.calculations.metalPrice)}/oz = {formatCurrency(valuation.meltValue)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Result State */}
        {description.trim().length >= 3 && !valuation && parsedSpecs?.metalType === 'unknown' && (
          <div className="p-4 rounded-lg bg-vault-black-deep border border-vault-gold/10 text-center">
            <span className="text-2xl block mb-2">🔍</span>
            <p className="text-sm text-vault-text-muted">
              Could not detect metal type. Try adding &quot;gold&quot;, &quot;silver&quot;, or &quot;platinum&quot; to your description.
            </p>
          </div>
        )}

        {description.trim().length >= 3 && parsedSpecs?.weightGrams === null && (
          <div className="p-4 rounded-lg bg-vault-black-deep border border-vault-gold/10 text-center">
            <span className="text-2xl block mb-2">⚖️</span>
            <p className="text-sm text-vault-text-muted">
              Weight not detected. Include weight in grams (e.g., &quot;5.2g&quot; or &quot;5 grams&quot;).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
