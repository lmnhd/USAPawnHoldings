'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Lead {
  lead_id: string;
  source?: string;
  type?: string;
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
    <Card className="p-4 border rounded-xl bg-vault-surface border-vault-gold/5">
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="w-3/4 h-3 mb-2" />
        <Skeleton className="w-1/2 h-3 mb-3" />
        <div className="flex justify-between">
          <Skeleton className="w-20 h-4" />
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
        <span className="mb-4 text-4xl" aria-hidden="true">📭</span>
        <h3 className="mb-2 text-lg font-display text-vault-text-light">No leads yet today</h3>
        <p className="max-w-xs text-sm text-vault-text-muted font-body">
          Leads from the chat widget, appraisal portal, SMS, and phone calls will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]? scroll-pb-20">
      <div className="pb-20 pr-1 space-y-3">
        {leads.map((lead) => {
          // Distinguish between appointments and appraisals
          const isAppointment = lead.type === 'appointment';
          const isAppraisal = lead.source === 'appraise_page';
          const source = isAppointment 
            ? { icon: '📅', label: 'Appointment', bg: 'bg-vault-success/20', text: 'text-vault-success' }
            : SOURCE_CONFIG[lead.source ?? 'chat'] ?? SOURCE_CONFIG.chat;
          const status = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
          const dateStr = lead.created_at ?? lead.timestamp ?? '';

          // Different border colors for appointments vs appraisals
          const borderColor = isAppointment 
            ? 'border-vault-success/20 hover:border-vault-success/50'
            : isAppraisal
            ? 'border-vault-gold/20 hover:border-vault-gold/50'
            : 'border-vault-gold/5 hover:border-vault-gold/30';

          return (
            <Card
              key={lead.lead_id}
              className={`relative pb-10 transition-all duration-200 border cursor-pointer group rounded-xl bg-vault-surface ${borderColor}`}
            >
              <CardContent className="p-4">
                {/* Top Row — Name + Source Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold truncate font-body text-vault-text-light">
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
                <p className="mb-3 text-sm leading-snug text-vault-text-muted font-body line-clamp-2">
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
                    <span className="flex-shrink-0 font-mono text-xs text-vault-text-muted">
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
