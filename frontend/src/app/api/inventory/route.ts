import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as dynamodbLib from '@/lib/dynamodb';
import { buildSearchableTokens, matchesCategoryCandidates, normalizeTagList, resolveCategoryCandidates, tokenizeSearchInput } from '@/lib/tag-governance';

type InventoryStatus = 'available' | 'sold' | 'pending' | 'returned';

type InventoryItem = {
  item_id: string;
  category: string;
  brand?: string;
  description?: string;
  tags?: string[];
  searchable_tokens?: string[];
  price?: number;
  condition?: string;
  status: InventoryStatus;
  images?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  sold_date?: string;
  [key: string]: unknown;
};

const INVENTORY_TABLE = 'USA_Pawn_Inventory';
const DEFAULT_CATEGORIES = [
  'jewelry',
  'electronics',
  'tools',
  'firearms',
  'musical',
  'sporting',
  'collectibles',
];

const dynamodb = dynamodbLib as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

async function scanInventory(): Promise<InventoryItem[]> {
  if (typeof dynamodb.scanItems === 'function') {
    return ((await dynamodb.scanItems(INVENTORY_TABLE)) as InventoryItem[]) ?? [];
  }
  if (typeof dynamodb.getAllItems === 'function') {
    return ((await dynamodb.getAllItems(INVENTORY_TABLE)) as InventoryItem[]) ?? [];
  }
  return [];
}

async function putInventory(item: InventoryItem): Promise<void> {
  if (typeof dynamodb.putItem === 'function') {
    await dynamodb.putItem(INVENTORY_TABLE, item);
    return;
  }
  if (typeof dynamodb.createItem === 'function') {
    await dynamodb.createItem(INVENTORY_TABLE, item);
  }
}

async function updateInventory(itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
  const items = await scanInventory();
  const target = items.find((item) => item.item_id === itemId);
  if (!target) {
    throw new Error('Item not found');
  }

  const mergedPreview: InventoryItem = { ...target, ...updates };
  if (updates.tags) {
    mergedPreview.tags = normalizeTagList(updates.tags);
  }

  const shouldRebuildTokens =
    updates.category != null || updates.brand != null || updates.description != null || updates.tags != null;

  if (shouldRebuildTokens) {
    mergedPreview.searchable_tokens = buildSearchableTokens({
      category: mergedPreview.category,
      brand: mergedPreview.brand,
      description: mergedPreview.description,
      tags: mergedPreview.tags,
    });
    updates.searchable_tokens = mergedPreview.searchable_tokens;
    updates.tags = mergedPreview.tags;
  }

  if (typeof dynamodb.updateItem === 'function') {
    const updated = (await dynamodb.updateItem(INVENTORY_TABLE, { item_id: itemId }, updates)) as InventoryItem | null;
    return updated ?? mergedPreview;
  }

  const merged = mergedPreview;
  await putInventory(merged);
  return merged;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const category = params.get('category')?.toLowerCase() ?? null;
    const keyword = params.get('keyword')?.toLowerCase() ?? null;
    const status = params.get('status')?.toLowerCase() ?? null;
    const condition = params.get('condition')?.toLowerCase() ?? null;
    const minPriceParam = params.get('min_price');
    const maxPriceParam = params.get('max_price');
    const sort = params.get('sort')?.toLowerCase() ?? 'newest';
    const limit = Math.max(1, Math.min(Number(params.get('limit') ?? '20'), 1000));
    const keywordTokens = tokenizeSearchInput(keyword ?? '');
    const categoryCandidates = resolveCategoryCandidates(category ?? '', keywordTokens);
    const minPrice = minPriceParam != null && minPriceParam.trim().length > 0 ? Number(minPriceParam) : null;
    const maxPrice = maxPriceParam != null && maxPriceParam.trim().length > 0 ? Number(maxPriceParam) : null;
    const hasMinPrice = minPrice != null && Number.isFinite(minPrice) && minPrice >= 0;
    const hasMaxPrice = maxPrice != null && Number.isFinite(maxPrice) && maxPrice >= 0;

    let items = await scanInventory();
    
    // Normalize items to ensure all fields have valid defaults
    items = items.map(item => ({
      ...item,
      images: Array.isArray(item.images) ? item.images : [],
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      searchable_tokens: Array.isArray(item.searchable_tokens) ? item.searchable_tokens.map(String) : [],
      price: typeof item.price === 'number' ? item.price : 0,
      brand: item.brand || 'Unknown',
      description: item.description || 'No description',
      condition: item.condition || 'Used',
      status: (item.status || 'available') as InventoryStatus,
    }));
    
    if (category) {
      items = items.filter((item) => matchesCategoryCandidates(String(item.category ?? ''), categoryCandidates));
    }
    if (status) {
      items = items.filter((item) => String(item.status).toLowerCase() === status);
    }
    if (condition) {
      items = items.filter((item) => String(item.condition ?? '').toLowerCase() === condition);
    }
    if (keyword) {
      items = items.filter((item) => {
        const blob = `${item.brand ?? ''} ${item.description ?? ''} ${item.category ?? ''} ${(item.tags ?? []).join(' ')} ${(item.searchable_tokens ?? []).join(' ')}`.toLowerCase();
        const directMatch = blob.includes(keyword);
        const tokenHits = keywordTokens.filter((token) => blob.includes(token)).length;
        const tokenCoverage = keywordTokens.length > 0 ? tokenHits / keywordTokens.length : 0;
        return directMatch || (keywordTokens.length <= 1 ? tokenHits === 1 : tokenCoverage >= 0.6);
      });
    }

    if (hasMinPrice) {
      items = items.filter((item) => Number(item.price ?? 0) >= (minPrice as number));
    }
    if (hasMaxPrice) {
      items = items.filter((item) => Number(item.price ?? 0) <= (maxPrice as number));
    }

    if (sort === 'price-low') {
      items.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    } else if (sort === 'price-high') {
      items.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const limited = items.slice(0, limit);

    return NextResponse.json({
      items: limited,
      count: items.length,
      categories: DEFAULT_CATEGORIES,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = String(body?.category ?? '');
    const brand = String(body?.brand ?? '');
    const description = String(body?.description ?? '');
    const condition = String(body?.condition ?? '');

    if (!category || !brand || !description || body?.price == null || !condition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedTags = normalizeTagList(body?.tags ?? body?.ai_tags);

    const item: InventoryItem = {
      item_id: randomUUID(),
      category,
      brand,
      description,
      tags: normalizedTags,
      price: Number(body.price),
      condition,
      status: 'available',
      images: Array.isArray(body.images) ? body.images.map(String) : [],
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
      created_at: new Date().toISOString(),
    };

    item.searchable_tokens = buildSearchableTokens({
      category: item.category,
      brand: item.brand,
      description: item.description,
      tags: item.tags,
    });

    await putInventory(item);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create inventory item', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const itemId = String(body?.item_id ?? '');
    if (!itemId) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    const updates: Partial<InventoryItem> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) {
      const normalized = String(body.status) as InventoryStatus;
      if (!['available', 'sold', 'pending', 'returned'].includes(normalized)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = normalized;
    }
    if (body.price != null) {
      updates.price = Number(body.price);
    }
    if (body.condition) {
      updates.condition = String(body.condition);
    }
    if (body.description) {
      updates.description = String(body.description);
    }
    if (body.brand) {
      updates.brand = String(body.brand);
    }
    if (body.tags != null) {
      updates.tags = normalizeTagList(body.tags);
    }
    if (Array.isArray(body.images)) {
      updates.images = body.images.map(String);
    }
    if (body.sold_date) {
      updates.sold_date = String(body.sold_date);
    }

    const updated = await updateInventory(itemId, updates);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update inventory item', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const itemId = params.get('item_id');
    
    if (!itemId) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    if (typeof dynamodb.deleteItem === 'function') {
      await dynamodb.deleteItem(INVENTORY_TABLE, { item_id: itemId });
    } else {
      return NextResponse.json({ error: 'Delete operation not supported' }, { status: 501 });
    }

    return NextResponse.json({ success: true, item_id: itemId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete inventory item', details: (error as Error).message },
      { status: 500 }
    );
  }
}
