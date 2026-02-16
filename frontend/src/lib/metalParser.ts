/**
 * Metal Parser Utility
 * Parses item descriptions to extract metal type, purity, and weight
 * for gold/silver/platinum valuation calculations.
 */

export type MetalType = 'gold' | 'silver' | 'platinum' | 'unknown';

export type PurityStandard = {
  karat: number | null;
  decimal: number;
  label: string;
};

export type ParsedMetalSpecs = {
  metalType: MetalType;
  purity: PurityStandard;
  weightGrams: number | null;
  weightPennyweight: number | null;
  confidence: 'high' | 'medium' | 'low';
  originalDescription: string;
  detectedKeywords: string[];
};

export type ValuationResult = {
  meltValue: number;
  payoutOfferLow: number;
  payoutOfferHigh: number;
  pawnLoanOffer: number;
  retailEstimate: number;
  calculations: {
    metalPrice: number;
    metalType: MetalType;
    purityDecimal: number;
    weightGrams: number;
    pureMetalContent: number;
  };
};

// Standard purity mappings
const GOLD_PURITY: Record<string, PurityStandard> = {
  '24k': { karat: 24, decimal: 0.999, label: '24K' },
  '24kt': { karat: 24, decimal: 0.999, label: '24K' },
  '24 karat': { karat: 24, decimal: 0.999, label: '24K' },
  '999': { karat: 24, decimal: 0.999, label: '24K (.999)' },
  '22k': { karat: 22, decimal: 0.916, label: '22K' },
  '22kt': { karat: 22, decimal: 0.916, label: '22K' },
  '22 karat': { karat: 22, decimal: 0.916, label: '22K' },
  '916': { karat: 22, decimal: 0.916, label: '22K (.916)' },
  '18k': { karat: 18, decimal: 0.750, label: '18K' },
  '18kt': { karat: 18, decimal: 0.750, label: '18K' },
  '18 karat': { karat: 18, decimal: 0.750, label: '18K' },
  '750': { karat: 18, decimal: 0.750, label: '18K (.750)' },
  '14k': { karat: 14, decimal: 0.585, label: '14K' },
  '14kt': { karat: 14, decimal: 0.585, label: '14K' },
  '14 karat': { karat: 14, decimal: 0.585, label: '14K' },
  '585': { karat: 14, decimal: 0.585, label: '14K (.585)' },
  '10k': { karat: 10, decimal: 0.417, label: '10K' },
  '10kt': { karat: 10, decimal: 0.417, label: '10K' },
  '10 karat': { karat: 10, decimal: 0.417, label: '10K' },
  '417': { karat: 10, decimal: 0.417, label: '10K (.417)' },
};

const SILVER_PURITY: Record<string, PurityStandard> = {
  '999': { karat: null, decimal: 0.999, label: 'Fine Silver (.999)' },
  'sterling': { karat: null, decimal: 0.925, label: 'Sterling Silver' },
  '925': { karat: null, decimal: 0.925, label: 'Sterling (.925)' },
  'coin': { karat: null, decimal: 0.900, label: 'Coin Silver (.900)' },
  '900': { karat: null, decimal: 0.900, label: 'Coin Silver (.900)' },
  '800': { karat: null, decimal: 0.800, label: 'Silver (.800)' },
};

const PLATINUM_PURITY: Record<string, PurityStandard> = {
  '999': { karat: null, decimal: 0.999, label: 'Platinum (.999)' },
  '950': { karat: null, decimal: 0.950, label: 'Platinum (.950)' },
  '900': { karat: null, decimal: 0.900, label: 'Platinum (.900)' },
  '850': { karat: null, decimal: 0.850, label: 'Platinum (.850)' },
};

// Metal detection keywords
const METAL_KEYWORDS: Record<MetalType, string[]> = {
  gold: ['gold', 'yellow gold', 'white gold', 'rose gold', 'pink gold', 'green gold'],
  silver: ['silver', 'sterling', 'argent'],
  platinum: ['platinum', 'plat', 'pt'],
  unknown: [],
};

// Weight unit conversions
const GRAMS_PER_OUNCE = 31.1034768;
const GRAMS_PER_PENNYWEIGHT = 1.55517384;

/**
 * Parse weight from description
 * Handles: "5g", "5 grams", "5 gram", "5gr", "5.2 g", "3 dwt", "3 pennyweight"
 */
function parseWeight(description: string): { grams: number | null; pennyweight: number | null } {
  const normalized = description.toLowerCase().replace(/,/g, '');
  let grams: number | null = null;
  let pennyweight: number | null = null;

  // Gram patterns
  const gramPatterns = [
    /(\d+\.?\d*)\s*(?:grams?|gr|g)\b/,
    /(\d+\.?\d*)\s*grams?\b/,
  ];

  for (const pattern of gramPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value > 0 && value < 10000) {
        grams = value;
        break;
      }
    }
  }

  // Pennyweight patterns
  const dwtPatterns = [
    /(\d+\.?\d*)\s*(?:pennyweight|dwt|pw)\b/,
    /(\d+\.?\d*)\s*dwt\b/,
  ];

  for (const pattern of dwtPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value > 0 && value < 10000) {
        pennyweight = value;
        grams = value * GRAMS_PER_PENNYWEIGHT;
        break;
      }
    }
  }

  return { grams, pennyweight };
}

/**
 * Detect metal type from description
 */
function detectMetalType(description: string): { type: MetalType; confidence: 'high' | 'medium' | 'low' } {
  const normalized = description.toLowerCase();

  // Check for explicit metal keywords
  for (const [metal, keywords] of Object.entries(METAL_KEYWORDS)) {
    if (metal === 'unknown') continue;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return { type: metal as MetalType, confidence: 'high' };
      }
    }
  }

  // Check for karat indicators (implies gold)
  const karatPatterns = [/\b\d+k\b/, /\b\d+kt\b/, /\b\d+\s*karat\b/];
  for (const pattern of karatPatterns) {
    if (pattern.test(normalized)) {
      return { type: 'gold', confidence: 'medium' };
    }
  }

  // Check for purity stamps that imply metal type
  if (/\bsterling\b/.test(normalized) || /\b925\b/.test(normalized)) {
    return { type: 'silver', confidence: 'medium' };
  }

  if (/\bplatinum\b/.test(normalized) || /\bpt950\b/.test(normalized)) {
    return { type: 'platinum', confidence: 'high' };
  }

  return { type: 'unknown', confidence: 'low' };
}

/**
 * Detect purity based on metal type
 */
function detectPurity(
  description: string,
  metalType: MetalType
): { purity: PurityStandard; detectedKeywords: string[] } {
  const normalized = description.toLowerCase();
  const detectedKeywords: string[] = [];

  let purityMap: Record<string, PurityStandard> = {};

  switch (metalType) {
    case 'gold':
      purityMap = GOLD_PURITY;
      break;
    case 'silver':
      purityMap = SILVER_PURITY;
      break;
    case 'platinum':
      purityMap = PLATINUM_PURITY;
      break;
    default:
      return { purity: { karat: null, decimal: 0, label: 'Unknown' }, detectedKeywords: [] };
  }

  // Find matching purity keyword
  for (const [keyword, standard] of Object.entries(purityMap)) {
    if (normalized.includes(keyword)) {
      detectedKeywords.push(keyword);
      return { purity: standard, detectedKeywords };
    }
  }

  // Default purity if metal detected but no purity specified
  const defaults: Record<MetalType, PurityStandard> = {
    gold: { karat: 14, decimal: 0.585, label: '14K (assumed)' },
    silver: { karat: null, decimal: 0.925, label: 'Sterling (assumed)' },
    platinum: { karat: null, decimal: 0.950, label: 'Platinum .950 (assumed)' },
    unknown: { karat: null, decimal: 0, label: 'Unknown' },
  };

  detectedKeywords.push('default-assumed');
  return { purity: defaults[metalType], detectedKeywords };
}

/**
 * Parse metal description to extract specifications
 */
export function parseMetalDescription(description: string): ParsedMetalSpecs {
  const normalized = description.trim();

  const { type: metalType, confidence: typeConfidence } = detectMetalType(normalized);
  const { grams, pennyweight } = parseWeight(normalized);
  const { purity, detectedKeywords } = detectPurity(normalized, metalType);

  // Adjust confidence based on weight detection
  let finalConfidence = typeConfidence;
  if (grams === null && pennyweight === null) {
    finalConfidence = 'low';
  } else if (grams !== null && detectedKeywords.length > 0) {
    finalConfidence = 'high';
  }

  return {
    metalType,
    purity,
    weightGrams: grams,
    weightPennyweight: pennyweight,
    confidence: finalConfidence,
    originalDescription: normalized,
    detectedKeywords,
  };
}

/**
 * Calculate valuation based on metal specs and current spot prices
 */
export function calculateValuation(
  specs: ParsedMetalSpecs,
  spotPrices: { gold: number; silver: number; platinum: number },
  storeMargins: {
    payoutPercentMin: number;
    payoutPercentMax: number;
    pawnLoanPercent: number;
    retailPercent: number;
  } = {
    payoutPercentMin: 0.70,
    payoutPercentMax: 0.80,
    pawnLoanPercent: 0.30,
    retailPercent: 1.20,
  }
): ValuationResult | null {
  if (specs.metalType === 'unknown' || specs.weightGrams === null || specs.weightGrams <= 0) {
    return null;
  }

  const metalPrice = spotPrices[specs.metalType];
  if (!metalPrice || metalPrice <= 0) {
    return null;
  }

  // Calculate pure metal content in troy ounces
  const pureMetalContent = (specs.weightGrams * specs.purity.decimal) / GRAMS_PER_OUNCE;

  // Melt value = pure metal content × spot price per ounce
  const meltValue = pureMetalContent * metalPrice;

  // Calculate offer ranges
  const payoutOfferLow = meltValue * storeMargins.payoutPercentMin;
  const payoutOfferHigh = meltValue * storeMargins.payoutPercentMax;
  const pawnLoanOffer = meltValue * storeMargins.pawnLoanPercent;
  const retailEstimate = meltValue * storeMargins.retailPercent;

  return {
    meltValue: Math.round(meltValue * 100) / 100,
    payoutOfferLow: Math.round(payoutOfferLow * 100) / 100,
    payoutOfferHigh: Math.round(payoutOfferHigh * 100) / 100,
    pawnLoanOffer: Math.round(pawnLoanOffer * 100) / 100,
    retailEstimate: Math.round(retailEstimate * 100) / 100,
    calculations: {
      metalPrice,
      metalType: specs.metalType,
      purityDecimal: specs.purity.decimal,
      weightGrams: specs.weightGrams,
      pureMetalContent: Math.round(pureMetalContent * 1000) / 1000,
    },
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Get weight display string
 */
export function formatWeight(specs: ParsedMetalSpecs): string {
  if (specs.weightGrams !== null) {
    return `${specs.weightGrams.toFixed(2)}g`;
  }
  if (specs.weightPennyweight !== null) {
    return `${specs.weightPennyweight.toFixed(2)}dwt (${(specs.weightPennyweight * GRAMS_PER_PENNYWEIGHT).toFixed(2)}g)`;
  }
  return 'Weight not detected';
}

/**
 * Example usage for testing
 */
export const EXAMPLE_DESCRIPTIONS = [
  '14k gold ring 5.2 grams',
  'Sterling silver necklace 12g',
  '22kt gold bracelet 8 dwt',
  'Platinum wedding band 4 grams pt950',
  '10k gold chain 3.5g',
];
