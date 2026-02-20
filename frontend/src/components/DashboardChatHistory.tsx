'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | string;
  content: string;
  timestamp: string;
  image_url?: string;
  media_url?: string;
}

interface Conversation {
  conversation_id: string;
  channel: 'web' | 'sms' | 'voice' | 'appraise' | string;
  source: 'web_chat' | 'sms' | 'mms' | 'voice' | 'appraise' | 'unknown';
  messages: ChatMessage[];
  started_at: string;
  ended_at?: string;
  message_count: number;
  metadata?: {
    event?: string;
    status?: string;
    [key: string]: unknown;
  };
}

interface ConversationCase {
  case_key: string;
  case_title: string;
  sources: Array<'web_chat' | 'sms' | 'mms' | 'voice' | 'appraise' | 'unknown'>;
  last_activity_at: string;
  first_activity_at: string;
  message_count: number;
  conversation_count: number;
  preview: string;
  conversations: Conversation[];
}

interface CustomerGroup {
  customer_key: string;
  customer_label: string;
  customer_id?: string;
  phone?: string;
  source_count: number;
  message_count: number;
  conversation_count: number;
  last_activity_at: string;
  first_activity_at: string;
  sources: Array<'web_chat' | 'sms' | 'mms' | 'voice' | 'appraise' | 'unknown'>;
  cases: ConversationCase[];
}

interface DashboardChatHistoryProps {
  maxDisplay?: number;
}

function sourceBadgeClass(source: CustomerGroup['sources'][number]): string {
  switch (source) {
    case 'voice':
      return 'border-vault-warning/40 bg-vault-warning/10 text-vault-warning';
    case 'sms':
    case 'mms':
      return 'border-vault-info/40 bg-vault-info/10 text-vault-info';
    case 'appraise':
      return 'border-vault-success/40 bg-vault-success/10 text-vault-success';
    case 'web_chat':
      return 'border-vault-gold/40 bg-vault-gold/10 text-vault-gold-light';
    default:
      return 'border-vault-gold/20 bg-vault-surface text-vault-text-muted';
  }
}

function caseTitleBadgeClass(caseTitle: string): string {
  const title = caseTitle.toLowerCase();
  if (title.includes('appointment')) {
    return 'border-vault-warning/40 bg-vault-warning/10 text-vault-warning';
  }
  if (title.includes('appraisal')) {
    return 'border-vault-success/40 bg-vault-success/10 text-vault-success';
  }
  if (title.includes('inventory')) {
    return 'border-vault-info/40 bg-vault-info/10 text-vault-info';
  }
  if (title.includes('hours')) {
    return 'border-vault-gold/40 bg-vault-gold/10 text-vault-gold-light';
  }
  return 'border-vault-gold/25 bg-vault-surface-elevated text-vault-text-light';
}

function cardAccentClass(sources: ConversationCase['sources']): string {
  if (sources.includes('voice')) {
    return 'border-vault-warning/20 hover:border-vault-warning/45';
  }
  if (sources.includes('appraise')) {
    return 'border-vault-success/20 hover:border-vault-success/45';
  }
  if (sources.includes('sms') || sources.includes('mms')) {
    return 'border-vault-info/20 hover:border-vault-info/45';
  }
  return 'border-vault-gold/20 hover:border-vault-gold/45';
}

type DisplayCase = {
  customer: CustomerGroup;
  caseItem: ConversationCase;
  mergedCount: number;
};

function normalizeSeriesText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .slice(0, 120);
}

function buildSeriesKey(customer: CustomerGroup, caseItem: ConversationCase): string {
  const sourceKey = [...caseItem.sources].sort().join('|');
  const previewKey = normalizeSeriesText(caseItem.preview);
  return `${customer.customer_key}:${caseItem.case_title.toLowerCase()}:${sourceKey}:${previewKey}`;
}

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

function sourceLabel(source: CustomerGroup['sources'][number]): string {
  switch (source) {
    case 'web_chat':
      return 'web';
    case 'mms':
      return 'mms';
    default:
      return source;
  }
}

function SkeletonConversation() {
  return (
    <Card className="p-4 rounded-xl bg-vault-surface border border-vault-gold/5">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2 mb-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function CaseCard({
  customer,
  caseItem,
  onExpand,
  onDeleteConversation,
  deletingConversationId,
  mergedCount,
}: {
  customer: CustomerGroup;
  caseItem: ConversationCase;
  onExpand: () => void;
  onDeleteConversation: (conversationId: string) => void;
  deletingConversationId: string | null;
  mergedCount: number;
}) {
  const latestConversation = caseItem.conversations
    .slice()
    .sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime())[0];

  return (
    <Card
      className={`p-4 rounded-xl bg-vault-surface border transition-colors cursor-pointer ${cardAccentClass(caseItem.sources)}`}
      onClick={onExpand}
    >
      <CardContent className="p-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm text-vault-text-light">{customer.customer_label}</p>
            <p className="font-mono text-xs text-vault-text-muted">{customer.customer_key}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {caseItem.message_count} msg
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${caseTitleBadgeClass(caseItem.case_title)}`}>
            {caseItem.case_title}
          </Badge>
          {mergedCount > 1 && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-vault-gold/40 bg-vault-gold/10 text-vault-gold-light">
              merged {mergedCount}
            </Badge>
          )}
          {caseItem.sources.map((source) => (
            <Badge key={source} variant="outline" className={`text-[10px] uppercase tracking-wide ${sourceBadgeClass(source)}`}>
              {sourceLabel(source)}
            </Badge>
          ))}

          {latestConversation && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-5 px-2 text-[10px] border-vault-danger/50 text-vault-danger hover:bg-vault-danger/10"
              disabled={deletingConversationId === latestConversation.conversation_id}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteConversation(latestConversation.conversation_id);
              }}
            >
              {deletingConversationId === latestConversation.conversation_id ? 'Deleting...' : 'Delete Last'}
            </Button>
          )}
        </div>

        <p className="text-sm text-vault-text-light line-clamp-2">{caseItem.preview}</p>

        <div className="flex justify-between items-center text-xs text-vault-text-muted">
          <span>{getRelativeTime(caseItem.last_activity_at)}</span>
          <span>{caseItem.conversation_count} convo</span>
        </div>
      </CardContent>
    </Card>
  );
}

function buildTimeline(caseItem: ConversationCase): Array<ChatMessage & { source: Conversation['source']; conversation_id: string }> {
  return caseItem.conversations
    .flatMap((conv) =>
      conv.messages.map((message) => ({
        ...message,
        timestamp: message.timestamp || conv.started_at,
        source: conv.source,
        conversation_id: conv.conversation_id,
      })),
    )
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

function CaseDetail({
  customer,
  caseItem,
  onClose,
  onDeleteConversation,
  deletingConversationId,
}: {
  customer: CustomerGroup;
  caseItem: ConversationCase;
  onClose: () => void;
  onDeleteConversation: (conversationId: string) => void;
  deletingConversationId: string | null;
}) {
  const timeline = useMemo(() => buildTimeline(caseItem), [caseItem]);
  const caseConversations = useMemo(
    () => caseItem.conversations.slice().sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime()),
    [caseItem],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden bg-vault-black border-vault-gold/20">
        <CardHeader className="border-b border-vault-gold/10">
          <div className="flex justify-between items-start gap-3">
            <div>
              <CardTitle className="text-lg mb-1">{customer.customer_label} • {caseItem.case_title}</CardTitle>
              <p className="text-xs text-vault-text-muted">
                {new Date(caseItem.first_activity_at).toLocaleString()} → {new Date(caseItem.last_activity_at).toLocaleString()} • {timeline.length} interactions
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-vault-text-light hover:bg-vault-surface">
              ✕
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-vault-gold/10 bg-vault-surface/40 p-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-vault-text-muted">Conversations in this case</p>
              <div className="space-y-2">
                {caseConversations.map((conversation) => (
                  <div key={conversation.conversation_id} className="flex items-center justify-between gap-3 rounded-md bg-vault-black-deep/60 p-2 border border-vault-gold/10">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-vault-text-muted truncate">{conversation.conversation_id}</p>
                      <p className="text-[11px] text-vault-text-light">
                        {new Date(conversation.started_at).toLocaleString()} • {conversation.message_count} msg • {sourceLabel(conversation.source)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] border-vault-danger/50 text-vault-danger hover:bg-vault-danger/10"
                      disabled={deletingConversationId === conversation.conversation_id}
                      onClick={() => onDeleteConversation(conversation.conversation_id)}
                    >
                      {deletingConversationId === conversation.conversation_id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {timeline.map((msg, idx) => (
              <div key={`${msg.conversation_id}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`
                    max-w-[85%] px-4 py-2.5 rounded-2xl text-sm
                    ${msg.role === 'user'
                      ? 'bg-vault-red/20 text-vault-text-light rounded-br-md'
                      : 'bg-vault-surface border border-vault-gold/10 text-vault-text-light rounded-bl-md'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wide px-1.5 py-0 ${sourceBadgeClass(msg.source)}`}>
                      {sourceLabel(msg.source)}
                    </Badge>
                    <span className="text-[10px] text-vault-text-muted">{new Date(msg.timestamp).toLocaleString()}</span>
                  </div>

                  {msg.image_url && (
                    <div className="mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.image_url}
                        alt="Chat image"
                        className="max-w-full h-auto max-h-32 rounded-lg"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function isVoiceAuditCase(caseItem: ConversationCase): boolean {
  if (caseItem.sources.includes('voice')) {
    return true;
  }

  return caseItem.conversations.some(
    (conv) => conv.metadata?.event === 'voice_schedule_visit' || conv.conversation_id.startsWith('voice_booking_'),
  );
}

export default function DashboardChatHistory({ maxDisplay = 10 }: DashboardChatHistoryProps) {
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<{ customer: CustomerGroup; caseItem: ConversationCase } | null>(null);
  const [view, setView] = useState<'all' | 'voice-audit'>('all');
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [collapseRepeats, setCollapseRepeats] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/conversations?view=grouped&_t=${Date.now()}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = (await response.json()) as { customers: CustomerGroup[] };
          const allCustomers = data.customers ?? [];
          setCustomers(maxDisplay > 0 ? allCustomers.slice(0, maxDisplay) : allCustomers);
        } else {
          console.error('[Dashboard] Failed to fetch grouped conversations:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch grouped conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [maxDisplay]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonConversation key={i} />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3" aria-hidden="true">
          💬
        </span>
        <h3 className="font-display text-lg text-vault-text-light mb-1">No conversations yet</h3>
        <p className="text-sm text-vault-text-muted">Grouped customer timelines will appear here for QA/review</p>
      </div>
    );
  }

  const filteredCustomers = view === 'voice-audit'
    ? customers
        .map((customer) => ({
          ...customer,
          cases: customer.cases.filter((caseItem) => isVoiceAuditCase(caseItem)),
        }))
        .filter((customer) => customer.cases.length > 0)
    : customers;

  const allCases = filteredCustomers.flatMap((customer) =>
    customer.cases.map((caseItem) => ({ customer, caseItem })),
  );

  const displayCases: DisplayCase[] = (() => {
    const base = allCases
      .slice()
      .sort(
        (left, right) =>
          new Date(right.caseItem.last_activity_at).getTime() - new Date(left.caseItem.last_activity_at).getTime(),
      )
      .map(({ customer, caseItem }) => ({ customer, caseItem, mergedCount: 1 }));

    if (!collapseRepeats) {
      return base;
    }

    const merged = new Map<string, DisplayCase>();

    for (const item of base) {
      const seriesKey = buildSeriesKey(item.customer, item.caseItem);
      const existing = merged.get(seriesKey);

      if (!existing) {
        merged.set(seriesKey, item);
        continue;
      }

      existing.mergedCount += 1;
    }

    return Array.from(merged.values());
  })();

  const removeConversationFromGroups = (groups: CustomerGroup[], conversationId: string): CustomerGroup[] => {
    return groups
      .map((customer) => {
        const nextCases = customer.cases
          .map((caseItem) => {
            const remainingConversations = caseItem.conversations.filter(
              (conversation) => conversation.conversation_id !== conversationId,
            );

            if (remainingConversations.length === 0) {
              return null;
            }

            const sortedConversations = remainingConversations.slice().sort(
              (left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
            );

            const latestConversation = sortedConversations[0];
            const earliestConversation = sortedConversations[sortedConversations.length - 1];
            const aggregatedMessageCount = remainingConversations.reduce(
              (sum, conversation) => sum + (conversation.message_count || conversation.messages.length),
              0,
            );

            return {
              ...caseItem,
              conversations: remainingConversations,
              conversation_count: remainingConversations.length,
              message_count: aggregatedMessageCount,
              last_activity_at: latestConversation.ended_at ?? latestConversation.started_at,
              first_activity_at: earliestConversation.started_at,
              preview: latestConversation.messages.find((message) => message.role === 'user')?.content?.slice(0, 120)
                ?? latestConversation.messages[0]?.content?.slice(0, 120)
                ?? caseItem.preview,
              sources: Array.from(new Set(remainingConversations.map((conversation) => conversation.source))),
            };
          })
          .filter((caseItem): caseItem is ConversationCase => Boolean(caseItem));

        if (nextCases.length === 0) {
          return null;
        }

        const flattenedConversations = nextCases.flatMap((caseItem) => caseItem.conversations);
        const sortedByTime = flattenedConversations.slice().sort(
          (left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
        );

        const newest = sortedByTime[0];
        const oldest = sortedByTime[sortedByTime.length - 1];

        return {
          ...customer,
          cases: nextCases,
          conversation_count: flattenedConversations.length,
          message_count: flattenedConversations.reduce(
            (sum, conversation) => sum + (conversation.message_count || conversation.messages.length),
            0,
          ),
          last_activity_at: newest.ended_at ?? newest.started_at,
          first_activity_at: oldest.started_at,
          sources: Array.from(new Set(flattenedConversations.map((conversation) => conversation.source))),
          source_count: Array.from(new Set(flattenedConversations.map((conversation) => conversation.source))).length,
        };
      })
      .filter((customer): customer is CustomerGroup => Boolean(customer));
  };

  const handleDeleteConversation = async (conversationId: string) => {
    setDeletingConversationId(conversationId);
    try {
      const response = await fetch(`/api/conversations?conversation_id=${encodeURIComponent(conversationId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed (${response.status})`);
      }

      setCustomers((prev) => {
        const next = removeConversationFromGroups(prev, conversationId);

        if (selectedCase) {
          const matchedCustomer = next.find((customer) => customer.customer_key === selectedCase.customer.customer_key);
          const matchedCase = matchedCustomer?.cases.find((caseItem) => caseItem.case_key === selectedCase.caseItem.case_key);
          if (!matchedCustomer || !matchedCase) {
            setSelectedCase(null);
          } else {
            setSelectedCase({ customer: matchedCustomer, caseItem: matchedCase });
          }
        }

        return next;
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeletingConversationId(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant={view === 'all' ? 'default' : 'outline'}
          onClick={() => setView('all')}
          className="text-xs"
        >
          All Timelines
        </Button>
        <Button
          size="sm"
          variant={view === 'voice-audit' ? 'default' : 'outline'}
          onClick={() => setView('voice-audit')}
          className="text-xs"
        >
          Voice Booking Audits
        </Button>
        <Button
          size="sm"
          variant={collapseRepeats ? 'default' : 'outline'}
          onClick={() => setCollapseRepeats((prev) => !prev)}
          className="text-xs"
        >
          {collapseRepeats ? 'Collapsed Series' : 'Collapse Repeats'}
        </Button>
      </div>

      <ScrollArea className="h-full w-full">
        <div className="space-y-3 pr-4 pb-20">
          {displayCases.map(({ customer, caseItem, mergedCount }) => (
            <CaseCard
              key={`${customer.customer_key}:${caseItem.case_key}`}
              customer={customer}
              caseItem={caseItem}
              onExpand={() => setSelectedCase({ customer, caseItem })}
              onDeleteConversation={handleDeleteConversation}
              deletingConversationId={deletingConversationId}
              mergedCount={mergedCount}
            />
          ))}

          {displayCases.length === 0 && (
            <Card className="p-4 rounded-xl bg-vault-surface border border-vault-gold/5">
              <CardContent className="p-0 text-sm text-vault-text-muted font-body">
                No conversations match this filter yet.
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {selectedCase && (
        <CaseDetail
          customer={selectedCase.customer}
          caseItem={selectedCase.caseItem}
          onClose={() => setSelectedCase(null)}
          onDeleteConversation={handleDeleteConversation}
          deletingConversationId={deletingConversationId}
        />
      )}
    </>
  );
}
