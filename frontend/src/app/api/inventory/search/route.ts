import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_TAGS } from "@/lib/constants";
import { TABLES, scanItems } from "@/lib/dynamodb";
import { searchInventoryItems } from "@/lib/inventory-search";

/* ──────────────────────────────────────────────────────
   POST /api/inventory/search

   Search inventory by category and/or keyword.
   Used by voice chat tool execution.
   Returns matching items with display image for first match.
   ────────────────────────────────────────────────────── */

type SearchRequestBody = {
  category?: string;
  keyword?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SearchRequestBody;
    const category = String(body.category ?? "").toLowerCase().trim();
    const keyword = String(body.keyword ?? "").toLowerCase().trim();

    console.log(`[Inventory Search] Category: "${category}", Keyword: "${keyword}"`);

    const all = await scanItems<Record<string, unknown>>(TABLES.inventory);
    console.log(`[Inventory Search] Total items: ${all.length}`);
    const searchResult = searchInventoryItems(all, { category, keyword, limit: 5 });
    const topMatches = searchResult.topMatches;

    console.log(`[Inventory Search] Matches: ${searchResult.count}`);

    const result = {
      success: true,
      categories: CATEGORY_TAGS,
      count: searchResult.count,
      top_matches: topMatches,
      display_image: searchResult.displayImage,
      category_fallback_used: searchResult.usedKeywordFallback,
      display_summary:
        topMatches.length > 0
          ? `Found ${searchResult.count} item${searchResult.count !== 1 ? "s" : ""} matching your search. Top result: ${String(topMatches[0].category ?? "")} - ${String(topMatches[0].description ?? "")}`
          : `No items found matching your search.`,
    };

    console.log(`[Inventory Search] Summary: ${result.display_summary}`);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Inventory Search] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search inventory",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
