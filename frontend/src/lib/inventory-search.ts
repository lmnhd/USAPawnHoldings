import { matchesCategoryCandidates, resolveCategoryCandidates, tokenizeSearchInput } from "@/lib/tag-governance";

type InventorySearchParams = {
  category: string;
  keyword: string;
  limit?: number;
};

type InventorySearchResult = {
  queryCategory: string;
  queryKeyword: string;
  count: number;
  topMatches: Array<Record<string, unknown>>;
  displayImage: string | null;
  usedKeywordFallback: boolean;
};

function getItemSearchBlob(item: Record<string, unknown>) {
  const itemCategory = String(item.category ?? "").toLowerCase();
  const brand = String(item.brand ?? "").toLowerCase();
  const description = String(item.description ?? "").toLowerCase();
  const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()).join(" ") : "";
  const searchableTokens = Array.isArray(item.searchable_tokens)
    ? item.searchable_tokens.map((token) => String(token).toLowerCase()).join(" ")
    : "";

  return {
    itemCategory,
    brand,
    description,
    tags,
    searchableTokens,
    searchableText: `${itemCategory} ${brand} ${description} ${tags} ${searchableTokens}`,
  };
}

export function searchInventoryItems(
  items: Array<Record<string, unknown>>,
  params: InventorySearchParams,
): InventorySearchResult {
  const queryCategory = String(params.category ?? "").toLowerCase().trim();
  const queryKeyword = String(params.keyword ?? "").toLowerCase().trim();
  const limit = Math.max(1, Number(params.limit ?? 5));

  const keywordTokens = tokenizeSearchInput(queryKeyword);
  const categoryCandidates = resolveCategoryCandidates(queryCategory, keywordTokens);

  const matchesInventoryItem = (item: Record<string, unknown>, requireCategoryMatch: boolean) => {
    const { itemCategory, searchableText } = getItemSearchBlob(item);

    const categoryMatch = !queryCategory || matchesCategoryCandidates(itemCategory, categoryCandidates);
    const directKeywordMatch = Boolean(queryKeyword) && searchableText.includes(queryKeyword);
    const tokenHits = keywordTokens.filter((token) => searchableText.includes(token)).length;
    const tokenCoverage = keywordTokens.length > 0 ? tokenHits / keywordTokens.length : 0;
    const tokenKeywordMatch = keywordTokens.length <= 1 ? tokenHits === 1 : tokenCoverage >= 0.6;
    const keywordMatch = !queryKeyword || directKeywordMatch || tokenKeywordMatch;

    return (requireCategoryMatch ? categoryMatch : true) && keywordMatch;
  };

  const strictFiltered = items.filter((item) => matchesInventoryItem(item, true));
  const fallbackFiltered = queryKeyword ? items.filter((item) => matchesInventoryItem(item, false)) : strictFiltered;
  const usedKeywordFallback = strictFiltered.length === 0 && fallbackFiltered.length > 0 && Boolean(queryCategory);
  const filtered = usedKeywordFallback ? fallbackFiltered : strictFiltered;

  const scoreItem = (item: Record<string, unknown>) => {
    const { itemCategory, brand, description, tags, searchableTokens, searchableText } = getItemSearchBlob(item);
    const hasImage = Boolean(item.image_url) || (Array.isArray(item.images) && item.images.length > 0);

    let score = 0;

    if (queryCategory) {
      if (itemCategory === queryCategory) score += 4;
      else if (itemCategory.includes(queryCategory)) score += 2;
      else if (categoryCandidates.some((candidate) => itemCategory === candidate)) score += 2;
      else if (categoryCandidates.some((candidate) => itemCategory.includes(candidate))) score += 1;
    }

    if (queryKeyword) {
      if (searchableText.includes(queryKeyword)) score += 6;
      if (description.includes(queryKeyword)) score += 5;
      if (brand.includes(queryKeyword)) score += 4;
      if (tags.includes(queryKeyword)) score += 4;
      if (itemCategory.includes(queryKeyword)) score += 2;

      for (const token of keywordTokens) {
        if (searchableText.includes(token)) score += 1;
        if (description.includes(token)) score += 1;
        if (brand.includes(token)) score += 1;
        if (tags.includes(token)) score += 1;
        if (searchableTokens.includes(token)) score += 1;
      }
    }

    if (hasImage) score += 0.5;

    return score;
  };

  const ranked = [...filtered]
    .map((item) => ({ item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  const topMatches = ranked.slice(0, limit);

  let displayImage: string | null = null;
  if (topMatches.length > 0) {
    const firstItem = topMatches[0];
    displayImage =
      String(firstItem.image_url ?? "") ||
      (Array.isArray(firstItem.images) && firstItem.images.length > 0 ? String(firstItem.images[0]) : null);
  }

  return {
    queryCategory,
    queryKeyword,
    count: filtered.length,
    topMatches,
    displayImage,
    usedKeywordFallback,
  };
}
