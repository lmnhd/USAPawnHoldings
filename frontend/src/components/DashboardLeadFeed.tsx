'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Lead {
  lead_id: string;
  appointment_id?: string;
  source?: string;
  source_channel?: string;
  contact_method?: string;
  type?: string;
  customer_name?: string;
  phone?: string;
  item_description: string;
  estimated_value?: number;
  status: string;
  priority?: string;
  notes?: string;
  photo_url?: string;
  created_at?: string;
  timestamp?: string;
  appointment_time?: string;
  preferred_time?: string;
  scheduled_time?: string;
  appraisal_id?: string;
  value_range?: string;
  item_category?: string;
}

interface DashboardLeadFeedProps {
  leads: Lead[];
  loading?: boolean;
  onLeadSelect?: (lead: Lead) => void;
  selectedLeadId?: string;
  disableInternalScroll?: boolean;
}

const SOURCE_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  web: { icon: '🌐', label: 'Web', bg: 'bg-vault-gold/20', text: 'text-vault-gold' },
  chat: { icon: '💬', label: 'Chat', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  voice: { icon: '📞', label: 'Voice', bg: 'bg-vault-warning/20', text: 'text-vault-warning' },
  appraisal: { icon: '📸', label: 'Appraisal', bg: 'bg-vault-gold/20', text: 'text-vault-gold' },
  appraise_page: { icon: '📸', label: 'Appraisal', bg: 'bg-vault-gold/20', text: 'text-vault-gold' },
  sms: { icon: '📱', label: 'SMS', bg: 'bg-vault-success/20', text: 'text-vault-success' },
  mms: { icon: '🖼️', label: 'MMS', bg: 'bg-vault-success/20', text: 'text-vault-success' },
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

function formatDateTime(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getContactMethod(lead: Lead): string {
  const method = String(lead.contact_method ?? '').trim().toLowerCase();
  if (method) return method;

  const source = String(lead.source ?? '').toLowerCase();
  if (source.includes('sms') || source.includes('mms') || source.includes('text')) return 'sms';
  if (source.includes('voice') || source.includes('phone') || source.includes('call')) return 'phone';
  if (source.includes('chat')) return 'chat';
  return 'web';
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

export default function DashboardLeadFeed({
  leads,
  loading,
  onLeadSelect,
  selectedLeadId,
  disableInternalScroll = false,
}: DashboardLeadFeedProps) {
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

  const feedContent = (
    <div className="grid grid-cols-1 gap-2 pb-2 pr-1 xl:grid-cols-2 2xl:grid-cols-3">
        {leads.map((lead) => {
          // Distinguish between appointments and appraisals
          const isAppointment = lead.type === 'appointment';
          const sourceKey = String(lead.source ?? 'chat').toLowerCase();
          const source = isAppointment 
            ? { icon: '📅', label: 'Appointment', bg: 'bg-vault-success/20', text: 'text-vault-success' }
            : SOURCE_CONFIG[sourceKey] ?? SOURCE_CONFIG.chat;
          const status = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.new;
          const dateStr = lead.created_at ?? lead.timestamp ?? '';
          const appointmentTime = lead.scheduled_time ?? lead.appointment_time ?? lead.preferred_time;
          const method = getContactMethod(lead);

          const isSelected = selectedLeadId === lead.lead_id;

          return (
            <button
              key={lead.lead_id}
              type="button"
              onClick={() => onLeadSelect?.(lead)}
              className={`dashboard-lead-item w-full h-full text-left transition-all duration-200 ${isSelected ? 'ring-2 ring-vault-gold/40 border-vault-gold/50' : ''}`}
            >
              <CardContent className="p-3">
                <div className="grid items-center grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {lead.photo_url && (
                        <div className="relative w-8 h-8 overflow-hidden border rounded-md border-vault-border bg-vault-black-deep">
                          <Image
                            src={lead.photo_url}
                            alt="Appraisal thumbnail"
                            fill
                            unoptimized
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <h4 className="text-sm font-semibold truncate font-body text-vault-text-light">
                        {lead.customer_name || 'Anonymous'}
                      </h4>
                    </div>
                    <p className="text-sm leading-snug text-vault-text-muted font-body line-clamp-1">
                      {lead.item_description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${source.bg} ${source.text}`}
                    >
                      <span aria-hidden="true">{source.icon}</span>
                      {source.label}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-vault-surface-elevated text-vault-text-muted"
                    >
                      Method: {method}
                    </Badge>
                    {appointmentTime && (
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-vault-success/15 text-vault-success"
                      >
                        {formatDateTime(appointmentTime) ?? appointmentTime}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-1 md:items-end">
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
                      <span className="font-mono text-xs text-vault-text-muted">
                        {getRelativeTime(dateStr)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </button>
          );
        })}
      </div>
  );

  if (disableInternalScroll) {
    return feedContent;
  }

  return <ScrollArea className="max-h-[600px] scroll-pb-20">{feedContent}</ScrollArea>;
}
