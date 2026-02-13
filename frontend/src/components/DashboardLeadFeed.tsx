'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Lead {
  lead_id: string;
  source: string;
  customer_name?: string;
  phone?: string;
  item_description: string;
  estimated_value?: number;
  status: string;
  created_at?: string;
  timestamp?: string;
}

interface DashboardLeadFeedProps {
  leads: Lead[];
  loading?: boolean;
}

const SOURCE_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  chat: { icon: '💬', label: 'Chat', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  appraisal: { icon: '📸', label: 'Appraisal', bg: 'bg-vault-gold/20', text: 'text-vault-gold' },
  sms: { icon: '📱', label: 'SMS', bg: 'bg-vault-success/20', text: 'text-vault-success' },
  phone: { icon: '📞', label: 'Phone', bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const STATUS_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  new: { icon: '🆕', label: 'New', bg: 'bg-vault-gold/20', text: 'text-vault-gold' },
  contacted: { icon: '📧', label: 'Contacted', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  scheduled: { icon: '📅', label: 'Scheduled', bg: 'bg-vault-success/20', text: 'text-vault-success' },
  closed: { icon: '✅', label: 'Closed', bg: 'bg-vault-text-muted/20', text: 'text-vault-text-muted' },
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function SkeletonCard() {
  return (
    <Card className="p-4 rounded-xl bg-vault-surface border border-vault-gold/5">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardLeadFeed({ leads, loading }: DashboardLeadFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-4" aria-hidden="true">📭</span>
        <h3 className="font-display text-lg text-vault-text-light mb-2">No leads yet today</h3>
        <p className="text-sm text-vault-text-muted font-body max-w-xs">
          Leads from the chat widget, appraisal portal, SMS, and phone calls will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 pr-1">
        {leads.map((lead) => {
          const source = SOURCE_CONFIG[lead.source] ?? SOURCE_CONFIG.chat;
          const status = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
          const dateStr = lead.created_at ?? lead.timestamp ?? '';

          return (
            <Card
              key={lead.lead_id}
              className="group relative rounded-xl bg-vault-surface border border-vault-gold/5 hover:border-vault-gold/30 transition-all duration-200 cursor-pointer"
            >
              <CardContent className="p-4">
                {/* Top Row — Name + Source Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-body font-semibold text-vault-text-light text-sm truncate">
                    {lead.customer_name || 'Anonymous'}
                  </h4>
                  <Badge
                    variant="secondary"
                    className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${source.bg} ${source.text}`}
                  >
                    <span aria-hidden="true">{source.icon}</span>
                    {source.label}
                  </Badge>
                </div>

                {/* Item Description */}
                <p className="text-sm text-vault-text-muted font-body leading-snug line-clamp-2 mb-3">
                  {lead.item_description}
                </p>

                {/* Bottom Row — Value, Status, Time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {lead.estimated_value != null && lead.estimated_value > 0 && (
                      <span className="font-mono text-sm font-semibold text-vault-gold">
                        ${lead.estimated_value.toLocaleString()}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}
                    >
                      <span aria-hidden="true">{status.icon}</span>
                      {status.label}
                    </Badge>
                  </div>
                  {dateStr && (
                    <span className="text-xs font-mono text-vault-text-muted flex-shrink-0">
                      {getRelativeTime(dateStr)}
                    </span>
                  )}
                </div>

                {/* Hover gold accent */}
                <div className="absolute inset-y-0 left-0 w-0.5 rounded-l-xl bg-vault-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
