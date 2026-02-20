'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import InventoryGrid, { InventoryItem } from '@/components/InventoryGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

/* ── Constants ── */

const CATEGORIES = [
  { key: 'All', icon: '🏪', label: 'All Items' },
  { key: 'jewelry', icon: '💎', label: 'Jewelry' },
  { key: 'firearms', icon: '🔫', label: 'Firearms' },
  { key: 'electronics', icon: '📱', label: 'Electronics' },
  { key: 'tools', icon: '🔧', label: 'Tools' },
  { key: 'musical', icon: '🎸', label: 'Musical Instruments' },
  { key: 'collectibles', icon: '🎨', label: 'Collectibles' },
  { key: 'sporting', icon: '⚾', label: 'Sporting Goods' },
];

const PAGE_SIZE = 20;

/* ── Page ── */

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-vault-black" />}>
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState('All');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [availability, setAvailability] = useState<'all' | 'available' | 'pending' | 'sold' | 'returned'>('all');
  const [condition, setCondition] = useState<'all' | 'excellent' | 'good' | 'fair' | 'poor'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  /* Initialize category from URL params on mount */
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    if (urlCategory) {
      setCategory(urlCategory);
    }
  }, [searchParams]);

  /* Fetch category counts once on mount */
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/inventory?limit=100');
        const data = await res.json();
        const allItems: InventoryItem[] = data.items ?? [];
        const counts: Record<string, number> = { All: allItems.length };
        allItems.forEach((item) => {
          const cat = (item.category ?? '').toLowerCase();
          counts[cat] = (counts[cat] ?? 0) + 1;
        });
        setCategoryCounts(counts);
      } catch {
        // Silently fail — counts are cosmetic
      }
    }
    fetchCounts();
  }, []);

  /* Fetch inventory for selected category */
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (category !== 'All') {
        params.set('category', category);
      }
      if (availability !== 'all') {
        params.set('status', availability);
      }
      if (searchTerm.trim().length > 0) {
        params.set('keyword', searchTerm.trim());
      }
      if (condition !== 'all') {
        params.set('condition', condition);
      }
      if (minPrice.trim().length > 0) {
        params.set('min_price', minPrice.trim());
      }
      if (maxPrice.trim().length > 0) {
        params.set('max_price', maxPrice.trim());
      }
      params.set('sort', sortBy);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const allItems: InventoryItem[] = data.items ?? [];
      setTotalCount(Number(data.count ?? allItems.length));
      setItems(allItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(msg);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [availability, category, condition, maxPrice, minPrice, searchTerm, sortBy]);

  useEffect(() => {
    setPage(1);
    fetchInventory();
  }, [fetchInventory]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const clearFilters = () => {
    setCategory('All');
    setAvailability('all');
    setCondition('all');
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setPage(1);
  };

  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative py-20 sm:py-24 overflow-hidden">
        {/* Background radials */}
        <div className="absolute inset-0 bg-gradient-to-b from-vault-black-deep via-vault-black to-vault-black-deep" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 40%, var(--vault-gold) 0%, transparent 50%),
                              radial-gradient(circle at 70% 60%, var(--vault-gold) 0%, transparent 50%)`,
          }}
        />
        {/* Gold accent lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-vault-gold/40 to-transparent" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <span className="inline-block px-4 py-1.5 text-xs font-mono font-semibold tracking-[0.2em] text-vault-gold border border-vault-gold/30 rounded-full uppercase mb-6">
            Shop Pre-Owned
          </span>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Browse Our{' '}
            <span className="bg-gradient-to-r from-vault-gold via-vault-gold-light to-vault-gold bg-clip-text text-transparent">
              Inventory
            </span>
          </h1>

          <p className="mt-4 text-lg text-vault-text-muted max-w-xl mx-auto leading-relaxed">
            Quality pre-owned items at unbeatable prices. New items added daily.
          </p>
        </div>
      </section>

      {/* ═══════════════ CATEGORY FILTERS ═══════════════ */}
      <section className="sticky top-0 z-30 bg-vault-black-deep/95 backdrop-blur-md border-y border-vault-gold/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="sm:hidden">
            <div className="rounded-2xl border border-vault-gold/15 bg-vault-surface-elevated/95 p-2 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 rounded-xl border-vault-gold/20 bg-vault-surface text-vault-text-light font-semibold">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                  {CATEGORIES.map((cat) => {
                    const count =
                      cat.key === 'All'
                        ? categoryCounts['All'] ?? 0
                        : categoryCounts[cat.key.toLowerCase()] ?? 0;

                    return (
                      <SelectItem key={cat.key} value={cat.key}>
                        {`${cat.icon} ${cat.label} (${count})`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="hidden sm:flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.key;
              const count =
                cat.key === 'All'
                  ? categoryCounts['All'] ?? 0
                  : categoryCounts[cat.key.toLowerCase()] ?? 0;

              return (
                <Button
                  key={cat.key}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setCategory(cat.key)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'gold-gradient text-vault-text-on-gold shadow-lg shadow-vault-gold/20'
                      : 'bg-vault-surface-elevated text-vault-text-muted border border-vault-gold/10 hover:border-vault-gold/30 hover:text-vault-text-light'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="whitespace-nowrap">{cat.label}</span>
                  {count > 0 && (
                    <Badge
                      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-mono font-bold rounded-full ${
                        isActive
                          ? 'bg-vault-black/20 text-vault-text-on-gold'
                          : 'bg-vault-gold/10 text-vault-gold'
                      }`}
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Desktop filters */}
          <div className="hidden sm:block mt-4 rounded-2xl border border-vault-gold/15 bg-vault-surface-elevated/95 p-3 sm:p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search inventory by keyword, brand, model..."
                  className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light placeholder:text-vault-text-muted"
                />
              </div>

              <div className="lg:col-span-2">
                <Select
                  value={availability}
                  onValueChange={(value) =>
                    setAvailability(value as 'all' | 'available' | 'pending' | 'sold' | 'returned')
                  }
                >
                  <SelectTrigger className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2">
                <Select
                  value={condition}
                  onValueChange={(value) => setCondition(value as 'all' | 'excellent' | 'good' | 'fair' | 'poor')}
                >
                  <SelectTrigger className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                    <SelectItem value="all">All Condition</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="Min $"
                  className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light placeholder:text-vault-text-muted"
                />
                <Input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Max $"
                  className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light placeholder:text-vault-text-muted"
                />
              </div>

              <div className="lg:col-span-2 flex gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'newest' | 'price-low' | 'price-high')}>
                  <SelectTrigger className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light flex-1">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="h-11 px-3 border-vault-gold/20 text-vault-text-muted hover:text-vault-text-light hover:border-vault-gold/40"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile filter toggle */}
          <div className="sm:hidden mt-4 flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 h-12 rounded-xl gold-gradient text-vault-text-on-gold font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-vault-gold/20 transition-all"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {/* Mobile filters (collapsible) */}
          {showFilters && (
            <div className="sm:hidden mt-4 rounded-2xl border border-vault-gold/15 bg-vault-surface-elevated/95 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-vault-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Search
                  </label>
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Keyword, brand, model..."
                    className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light placeholder:text-vault-text-muted text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-vault-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Availability
                  </label>
                  <Select
                    value={availability}
                    onValueChange={(value) =>
                      setAvailability(value as 'all' | 'available' | 'pending' | 'sold' | 'returned')
                    }
                  >
                    <SelectTrigger className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light">
                      <SelectValue placeholder="Availability" />
                    </SelectTrigger>
                    <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-vault-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Condition
                  </label>
                  <Select
                    value={condition}
                    onValueChange={(value) => setCondition(value as 'all' | 'excellent' | 'good' | 'fair' | 'poor')}
                  >
                    <SelectTrigger className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                      <SelectItem value="all">All Condition</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-vault-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="Min $"
                      className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light placeholder:text-vault-text-muted text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="Max $"
                      className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light placeholder:text-vault-text-muted text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-vault-text-muted uppercase tracking-wider font-semibold mb-2 block">
                    Sort
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'newest' | 'price-low' | 'price-high')}>
                    <SelectTrigger className="h-11 border-vault-gold/20 bg-vault-surface text-vault-text-light w-full">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="border-vault-border bg-vault-surface-elevated text-vault-text-light">
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="w-full h-11 border-vault-gold/20 text-vault-text-muted hover:text-vault-text-light hover:border-vault-gold/40"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ INVENTORY GRID ═══════════════ */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="font-display text-xl font-bold text-vault-red mb-2">
                Something went wrong
              </h3>
              <p className="text-vault-text-muted mb-6">{error}</p>
              <Button
                onClick={fetchInventory}
                className="px-6 py-3 rounded-xl font-semibold text-vault-text-on-gold gold-gradient hover:shadow-lg hover:shadow-vault-gold/20 transition-all"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Grid */}
          {!error && (
            <>
              {/* Result count */}
              {!loading && (
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-vault-text-muted">
                    Showing{' '}
                    <span className="text-vault-gold font-semibold">
                      {paginatedItems.length}
                    </span>{' '}
                    of{' '}
                    <span className="text-vault-text-light font-semibold">
                      {totalCount}
                    </span>{' '}
                    items
                    {searchTerm.trim() && (
                      <span>
                        {' '}
                        for <span className="text-vault-gold">&ldquo;{searchTerm.trim()}&rdquo;</span>
                      </span>
                    )}
                    {category !== 'All' && (
                      <span>
                        {' '}
                        in <span className="text-vault-gold">{CATEGORIES.find((c) => c.key === category)?.label ?? category}</span>
                      </span>
                    )}
                  </p>
                </div>
              )}

              <InventoryGrid items={paginatedItems} loading={loading} />

              {/* Pagination */}
              {totalPages > 1 && !loading && (
                <div className="flex items-center justify-center gap-4 mt-12">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </Button>

                  <span className="text-sm text-vault-text-muted font-mono">
                    Page{' '}
                    <span className="text-vault-gold font-bold">{page}</span>
                    {' '}of{' '}
                    <span className="text-vault-text-light">{totalPages}</span>
                  </span>

                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <section className="py-16 bg-vault-surface/50 border-t border-vault-gold/10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-vault-text-light">
            Have Something to <span className="text-vault-gold">Sell or Pawn</span>?
          </h2>
          <p className="mt-3 text-vault-text-muted max-w-lg mx-auto">
            Get an instant AI-powered appraisal — just snap a photo and our AI tells you what it&apos;s worth.
          </p>
          <Button asChild className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-xl font-semibold text-vault-text-on-gold gold-gradient shadow-lg shadow-vault-gold/20 hover:shadow-vault-gold/40 hover:scale-[1.02] transition-all duration-300">
            <Link href="/appraise">
              <span className="text-lg">📸</span>
              Get AI Appraisal
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
