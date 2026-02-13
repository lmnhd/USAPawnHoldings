'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface QueueItem {
  lead_id: string;
  customer_name: string;
  appointment_time?: string;
  item_description: string;
  estimated_value?: number;
  source: string;
  status: string;
}

interface QueueManagerProps {
  queue: QueueItem[];
  loading?: boolean;
  onMarkComplete?: (leadId: string) => void;
}

function formatQueueTime(isoString?: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isWithin30Min(isoString?: string): boolean {
  if (!isoString) return false;
  const diff = new Date(isoString).getTime() - Date.now();
  return diff > 0 && diff <= 30 * 60 * 1000;
}

function isPast(isoString?: string): boolean {
  if (!isoString) return false;
  return new Date(isoString).getTime() < Date.now();
}

function SkeletonRow() {
  return (
    <Card className="flex items-center gap-4 p-4 rounded-xl border-vault-gold/10 bg-vault-surface animate-pulse">
      <Skeleton className="w-16 h-10 bg-vault-surface-elevated rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28 bg-vault-surface-elevated rounded" />
        <Skeleton className="h-3 w-48 bg-vault-surface-elevated rounded" />
      </div>
      <Skeleton className="h-4 w-16 bg-vault-surface-elevated rounded" />
    </Card>
  );
}

export default function QueueManager({ queue, loading, onMarkComplete }: QueueManagerProps) {
  // Sort by appointment time (earliest first), items without time go to end
  const sorted = [...queue]
    .sort((a, b) => {
      if (!a.appointment_time && !b.appointment_time) return 0;
      if (!a.appointment_time) return 1;
      if (!b.appointment_time) return -1;
      return new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime();
    })
    .slice(0, 10);

  if (loading) {
    return (
      <Card className="border-vault-gold/15 bg-vault-surface-elevated overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-vault-gold/10">
          <CardTitle className="font-display text-lg font-bold text-vault-text-light">Appointment Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </CardContent>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card className="border-vault-gold/15 bg-vault-surface-elevated overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-vault-gold/10">
          <CardTitle className="font-display text-lg font-bold text-vault-text-light">Appointment Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <span className="text-4xl mb-3 block" aria-hidden="true">📋</span>
          <p className="text-vault-text-muted font-body text-sm">
            No appointments scheduled
          </p>
          <p className="text-vault-text-muted/60 font-body text-xs mt-1">
            Scheduled appointments and walk-ins will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-vault-gold/15 bg-vault-surface-elevated overflow-hidden">
      {/* Header */}
      <CardHeader className="px-5 py-4 border-b border-vault-gold/10 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display text-lg font-bold text-vault-text-light">Appointment Queue</CardTitle>
        <Badge variant="secondary" className="text-xs font-mono text-vault-text-muted bg-vault-surface hover:bg-vault-surface px-2 py-1 rounded-full border-0">
          {sorted.length} upcoming
        </Badge>
      </CardHeader>

      {/* Queue Items */}
      <div className="divide-y divide-vault-gold/5">
        {sorted.map((item) => {
          const soon = isWithin30Min(item.appointment_time);
          const past = isPast(item.appointment_time);

          return (
            <div
              key={item.lead_id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-vault-surface/50 ${
                soon ? 'bg-vault-gold/5' : ''
              }`}
            >
              {/* Time Badge */}
              <Badge
                variant="outline"
                className={`
                  flex-shrink-0 w-16 text-center justify-center px-2 py-2 rounded-lg font-mono text-sm font-semibold
                  ${soon
                    ? 'bg-vault-gold/20 text-vault-gold border-vault-gold/30'
                    : past
                      ? 'bg-vault-danger/10 text-vault-danger/80 border-vault-danger/20'
                      : 'bg-vault-surface text-vault-text-muted border-vault-gold/10'
                  }
                `}
              >
                {formatQueueTime(item.appointment_time)}
              </Badge>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-body font-semibold text-vault-text-light text-sm truncate">
                  {item.customer_name}
                </p>
                <p className="font-body text-xs text-vault-text-muted truncate">
                  {item.item_description}
                </p>
              </div>

              {/* Value */}
              {item.estimated_value != null && item.estimated_value > 0 && (
                <span className="flex-shrink-0 font-mono text-sm text-vault-gold font-medium">
                  ${item.estimated_value.toLocaleString()}
                </span>
              )}

              {/* Source Badge */}
              <Badge variant="secondary" className="flex-shrink-0 text-[10px] font-body uppercase tracking-wider text-vault-text-muted bg-vault-surface hover:bg-vault-surface px-2 py-0.5 rounded-full border-0 hidden sm:inline-flex">
                {item.source}
              </Badge>

              {/* Action Button */}
              {onMarkComplete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMarkComplete(item.lead_id)}
                  className="flex-shrink-0 text-vault-success/70 hover:text-vault-success hover:bg-vault-success/10"
                  title="Mark Complete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
