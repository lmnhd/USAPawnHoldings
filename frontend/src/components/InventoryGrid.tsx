'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import ProductCardDialog, { type ProductCardData } from '@/components/ProductCardDialog';

/* ── Types ── */

export interface InventoryItem {
  item_id: string;
  sku?: string;
  title?: string;
  brand?: string;
  model?: string;
  category: string;
  price: number;
  condition?: string;
  description?: string;
  tags?: string[];
  image_url?: string;
  images?: string[];
  status?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  sold_date?: string;
  value_range?: string;
  savings_pct?: string;
}

interface InventoryGridProps {
  items: InventoryItem[];
  loading?: boolean;
}

/* ── Helpers ── */

const CONDITION_STYLES: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-vault-red/20', text: 'text-vault-text-light' },
  good: { bg: 'bg-vault-success/20', text: 'text-vault-success' },
  fair: { bg: 'bg-vault-warning/20', text: 'text-vault-warning' },
  poor: { bg: 'bg-vault-red/30', text: 'text-vault-red' },
};

function conditionStyle(condition?: string) {
  if (!condition) return CONDITION_STYLES.good;
  return CONDITION_STYLES[condition.toLowerCase()] ?? CONDITION_STYLES.good;
}

function itemDisplayName(item: InventoryItem): string {
  if (item.title) return item.title;
  const parts = [item.brand, item.description].filter(Boolean);
  return parts.join(' — ') || 'Untitled Item';
}

function itemImage(item: InventoryItem): string | null {
  if (item.image_url) return item.image_url;
  if (item.images && item.images.length > 0) return item.images[0];
  return null;
}

/* ── Skeleton Card ── */

function SkeletonCard() {
  return (
    <Card className="animate-pulse rounded-2xl bg-vault-surface-elevated border-vault-border overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="aspect-[4/3] w-full rounded-none bg-vault-surface" />
      {/* Content skeleton */}
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-4 bg-vault-surface rounded-lg w-3/4" />
        <Skeleton className="h-3 bg-vault-surface rounded-lg w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 bg-vault-surface rounded-lg w-20" />
          <Skeleton className="h-5 bg-vault-surface rounded-full w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="font-display text-xl font-bold text-vault-text-light mb-2">
        No Items Found
      </h3>
      <p className="text-vault-text-muted max-w-md leading-relaxed">
        We don&apos;t have anything in this category right now, but our inventory changes daily.
        Check back soon or{' '}
          <Link href="/appraise" className="text-vault-red hover:underline">
          get an AI appraisal
          </Link>{' '}
        to sell us your items!
      </p>
    </div>
  );
}

/* ── Item Card ── */

function ItemCard({ item, onImageClick }: { item: InventoryItem; onImageClick: (item: InventoryItem) => void }) {
  const img = itemImage(item);
  const cond = item.condition ? conditionStyle(item.condition) : null;
  const name = itemDisplayName(item);

  return (
    <Card
      className="group relative rounded-2xl bg-vault-surface-elevated border-vault-border overflow-hidden hover:border-vault-red/50 hover:shadow-vault hover:shadow-vault-red/5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={() => onImageClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onImageClick(item);
        }
      }}
      aria-label={`Open product card for ${name}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-vault-surface overflow-hidden">
        {img ? (
          <button
            type="button"
            className="relative w-full h-full text-left"
            onClick={(event) => {
              event.stopPropagation();
              onImageClick(item);
            }}
            aria-label={`Open product card for ${name}`}
          >
            <Image
              src={img}
              alt={name}
              fill
              unoptimized
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-vault-text-muted/40">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Category tag (top-left) */}
        <Badge className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-vault-text-light bg-vault-black/80 hover:bg-vault-black/80 backdrop-blur-sm rounded-full border border-vault-border-accent">
          {item.category}
        </Badge>

        {/* Gold gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-vault-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <CardContent className="p-5">
        <h3 className="font-display text-base font-semibold text-vault-text-light leading-snug line-clamp-2 group-hover:text-vault-red transition-colors">
          {name}
        </h3>

        {item.description && (
          <p className="mt-1.5 text-xs text-vault-text-muted leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-vault-text-muted">
          Tap for full product card
        </p>

        <Separator className="mt-4 bg-vault-border" />

        <div className="flex items-center justify-between pt-3">
          {/* Price */}
          <span className="font-mono text-lg font-bold text-vault-text-light">
            ${item.price ? item.price.toLocaleString() : 'N/A'}
          </span>

          {/* Condition badge */}
          {cond && item.condition && (
            <Badge className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border-0 ${cond.bg} ${cond.text}`}>
              {item.condition}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Hover glow ring */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: 'inset 0 0 40px rgba(204,0,0,0.05)' }}
      />
    </Card>
  );
}

/* ── Main Grid ── */

export default function InventoryGrid({ items, loading = false }: InventoryGridProps) {
  const [selectedItem, setSelectedItem] = useState<ProductCardData | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <ItemCard
            key={item.item_id}
            item={item}
            onImageClick={(clickedItem) => setSelectedItem(clickedItem as ProductCardData)}
          />
        ))}
      </div>
      <ProductCardDialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        product={selectedItem}
      />
    </>
  );
}
