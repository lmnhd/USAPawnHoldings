const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "item",
  "any",
  "have",
  "show",
  "looking",
  "look",
  "please",
  "sale",
  "sell",
  "in",
  "on",
  "at",
  "to",
  "of",
]);

const TAG_SYNONYMS: Record<string, string> = {
  gun: "firearms",
  guns: "firearms",
  firearm: "firearms",
  handgun: "handgun",
  pistol: "handgun",
  revolver: "handgun",
  rifle: "long-gun",
  shotgun: "long-gun",

  necklace: "necklace",
  necklaces: "necklace",
  chain: "chain",
  chains: "chain",
  pendant: "pendant",
  ring: "ring",
  rings: "ring",
  bracelet: "bracelet",
  watch: "watch",

  jewelery: "jewelry",
  jewellery: "jewelry",

  goldtone: "gold-tone",
  "gold-tone": "gold-tone",
  sterling: "silver",

  "like-new": "excellent-condition",
  pristine: "excellent-condition",
  excellent: "excellent-condition",
  fair: "fair-condition",
  poor: "poor-condition",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  jewelry: ["jewelry", "watch", "watches"],
  watch: ["watch", "watches", "jewelry"],
  watches: ["watch", "watches", "jewelry"],
  electronics: ["electronics", "electronic", "tech"],
  tools: ["tools", "tool"],
  firearms: ["firearms", "firearm", "guns", "gun"],
  musical: ["musical", "instrument", "instruments"],
  sporting: ["sporting", "sports"],
  collectibles: ["collectibles", "collectible"],
};

function sanitize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeTag(text: string): string | null {
  const cleaned = sanitize(text);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 30) {
    return null;
  }

  if (STOP_WORDS.has(cleaned)) {
    return null;
  }

  return TAG_SYNONYMS[cleaned] ?? cleaned;
}

export function normalizeTagList(raw: unknown, max = 20): string[] {
  const base = Array.isArray(raw)
    ? raw.map((entry) => String(entry))
    : typeof raw === "string"
      ? raw.split(",").map((entry) => entry.trim())
      : [];

  const unique: string[] = [];
  for (const candidate of base) {
    const canonical = canonicalizeTag(candidate);
    if (!canonical) continue;
    if (!unique.includes(canonical)) {
      unique.push(canonical);
    }
    if (unique.length >= max) break;
  }

  return unique;
}

export function tokenizeSearchInput(input: string): string[] {
  return sanitize(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token))
    .map((token) => TAG_SYNONYMS[token] ?? token);
}

export function buildSearchableTokens(item: {
  category?: string;
  brand?: string;
  description?: string;
  tags?: string[];
}): string[] {
  const materializedTags = normalizeTagList(item.tags ?? []);
  const sourceText = [
    item.category ?? "",
    item.brand ?? "",
    item.description ?? "",
    ...materializedTags,
  ].join(" ");

  const tokens = tokenizeSearchInput(sourceText);
  return [...new Set(tokens)].slice(0, 80);
}

export function resolveCategoryCandidates(category: string, keywordTokens: string[] = []): string[] {
  const normalizedCategory = sanitize(category);
  const candidates = new Set<string>();

  if (normalizedCategory) {
    candidates.add(normalizedCategory);
    for (const alias of CATEGORY_ALIASES[normalizedCategory] ?? []) {
      candidates.add(alias);
    }
  }

  const normalizedTokens = keywordTokens.map((token) => sanitize(token)).filter(Boolean);
  if (normalizedTokens.includes("watch") || normalizedTokens.includes("watches")) {
    candidates.add("watch");
    candidates.add("watches");
    candidates.add("jewelry");
  }

  return [...candidates];
}

export function matchesCategoryCandidates(itemCategory: string, candidates: string[]): boolean {
  if (candidates.length === 0) return true;

  const normalizedItemCategory = sanitize(itemCategory);
  if (!normalizedItemCategory) return false;

  return candidates.some((candidate) => {
    const normalizedCandidate = sanitize(candidate);
    if (!normalizedCandidate) return false;
    return (
      normalizedItemCategory === normalizedCandidate ||
      normalizedItemCategory.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedItemCategory)
    );
  });
}
