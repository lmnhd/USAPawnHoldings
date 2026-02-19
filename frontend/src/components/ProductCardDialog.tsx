'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export type ProductCardData = {
  item_id?: string;
  sku?: string;
  title?: string;
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  tags?: string[];
  price?: number;
  value_range?: string;
  savings_pct?: string;
  condition?: string;
  status?: string;
  image_url?: string;
  images?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  sold_date?: string;
  [key: string]: unknown;
};

type ProductCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductCardData | null;
};

function getPrimaryImage(product: ProductCardData | null): string | null {
  if (!product) return null;
  const fromPrimary = String(product.image_url ?? '').trim();
  if (fromPrimary) return fromPrimary;
  if (Array.isArray(product.images)) {
    const first = String(product.images[0] ?? '').trim();
    if (first) return first;
  }
  return null;
}

function formatPrice(price: unknown): string {
  const numeric = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'N/A';
  return `$${numeric.toLocaleString()}`;
}

function formatDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

function collectTrackingRows(product: ProductCardData): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  const directRows: Array<{ label: string; value: unknown }> = [
    { label: 'Item ID', value: product.item_id },
    { label: 'SKU', value: product.sku },
    { label: 'Status', value: product.status },
    { label: 'Condition', value: product.condition },
    { label: 'Created', value: product.created_at ? formatDate(product.created_at) : '' },
    { label: 'Updated', value: product.updated_at ? formatDate(product.updated_at) : '' },
    { label: 'Sold Date', value: product.sold_date ? formatDate(product.sold_date) : '' },
    { label: 'Value Range', value: product.value_range },
    { label: 'Savings', value: product.savings_pct },
  ];

  for (const row of directRows) {
    const text = String(row.value ?? '').trim();
    if (text) rows.push({ label: row.label, value: text });
  }

  if (product.metadata && typeof product.metadata === 'object') {
    for (const [key, value] of Object.entries(product.metadata)) {
      if (value == null) continue;
      const text = String(value).trim();
      if (!text) continue;
      const label = key
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      rows.push({ label, value: text });
    }
  }

  return rows;
}

export default function ProductCardDialog({ open, onOpenChange, product }: ProductCardDialogProps) {
  if (!product) {
    return null;
  }

  const image = getPrimaryImage(product);
  const title = String(product.title ?? '').trim() || [product.brand, product.model].filter(Boolean).join(' ') || String(product.category ?? 'Inventory Item');
  const tags = Array.isArray(product.tags) ? product.tags.map(String).filter(Boolean) : [];
  const trackingRows = collectTrackingRows(product);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-vault-border bg-vault-surface-elevated text-vault-text-light p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle className="font-display text-2xl text-vault-text-light">
            Product Card
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-6 pb-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
            <div className="rounded-xl border border-vault-border overflow-hidden bg-vault-surface">
              {image ? (
                <img src={image} alt={title} className="w-full aspect-[4/3] object-cover" />
              ) : (
                <div className="w-full aspect-[4/3] flex items-center justify-center text-vault-text-muted">
                  No product image
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-vault-text-light leading-snug">{title}</h3>
                <p className="mt-1 font-body text-sm text-vault-text-muted">
                  {product.category || 'Uncategorized'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-2xl font-bold text-vault-gold">{formatPrice(product.price)}</span>
                {product.condition && (
                  <Badge className="bg-vault-warning/20 text-vault-warning border-0 uppercase tracking-wide">
                    {String(product.condition)}
                  </Badge>
                )}
                {product.status && (
                  <Badge className="bg-vault-info/20 text-vault-info border-0 uppercase tracking-wide">
                    {String(product.status)}
                  </Badge>
                )}
              </div>

              {product.description && (
                <div className="rounded-xl border border-vault-border bg-vault-surface/60 p-3">
                  <p className="text-sm leading-relaxed text-vault-text-light/95">{String(product.description)}</p>
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-vault-text-muted mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} className="bg-vault-gold/15 text-vault-gold border-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-5 bg-vault-border" />

          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-vault-text-muted mb-3">Tracking Info</p>
            {trackingRows.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {trackingRows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="rounded-lg border border-vault-border bg-vault-surface/50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-vault-text-muted">{row.label}</p>
                    <p className="mt-1 text-sm text-vault-text-light break-words">{row.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-vault-text-muted">No tracking metadata available for this item yet.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}