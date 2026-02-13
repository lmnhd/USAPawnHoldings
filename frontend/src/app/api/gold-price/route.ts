import { NextResponse } from "next/server";

type GoldPricePayload = {
  gold: number;
  silver: number;
  platinum: number;
  timestamp: string;
  source: string;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const METALS_API_TIMEOUT_MS = 7000;

const FALLBACK_PRICES: GoldPricePayload = {
  gold: 2050.0,
  silver: 24.5,
  platinum: 950.0,
  timestamp: "2026-02-13T12:00:00Z",
  source: "mock",
};

let cachedPrices: GoldPricePayload | null = null;
let cachedAt = 0;

function normalizeRateToOunce(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  if (rate < 1) {
    return 1 / rate;
  }
  if (rate < 100) {
    return rate * 31.1034768;
  }
  return rate;
}

function parseMetalsApiResponse(payload: unknown): GoldPricePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as { rates?: Record<string, number>; success?: boolean };
  if (!data.success || !data.rates) {
    return null;
  }

  const gold = normalizeRateToOunce(Number(data.rates.XAU));
  const silver = normalizeRateToOunce(Number(data.rates.XAG));
  const platinum = normalizeRateToOunce(Number(data.rates.XPT));

  if (!gold || !silver || !platinum) {
    return null;
  }

  return {
    gold: Number(gold.toFixed(2)),
    silver: Number(silver.toFixed(2)),
    platinum: Number(platinum.toFixed(2)),
    timestamp: new Date().toISOString(),
    source: "metals-api",
  };
}

export async function GET() {
  const now = Date.now();
  if (cachedPrices && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cachedPrices, source: `${cachedPrices.source}-cache` });
  }

  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) {
    const payload = { ...FALLBACK_PRICES, timestamp: new Date().toISOString(), source: "mock" };
    if (!cachedPrices) {
      cachedPrices = payload;
      cachedAt = now;
    }
    return NextResponse.json(payload);
  }

  try {
    const endpoint = `https://metals-api.com/api/latest?access_key=${apiKey}&base=USD&symbols=XAU,XAG,XPT`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), METALS_API_TIMEOUT_MS);
    const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Metals API failed with ${response.status}`);
    }

    const data = await response.json();
    const parsed = parseMetalsApiResponse(data);

    if (!parsed) {
      throw new Error("Unexpected metals API payload");
    }

    cachedPrices = parsed;
    cachedAt = now;
    return NextResponse.json(parsed);
  } catch {
    const payload = cachedPrices
      ? { ...cachedPrices, source: `${cachedPrices.source}-cache` }
      : { ...FALLBACK_PRICES, timestamp: new Date().toISOString(), source: "mock" };
    return NextResponse.json(payload);
  }
}
