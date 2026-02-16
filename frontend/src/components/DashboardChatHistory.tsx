'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
}

interface Conversation {
  conversation_id: string;
  channel: string;
  messages: ChatMessage[];
  started_at: string;
  ended_at: string;
  message_count?: number;
  error?: string;
}

interface DashboardChatHistoryProps {
  maxDisplay?: number;
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

function ConversationCard({ conv, onExpand }: { conv: Conversation; onExpand: () => void }) {
  const firstUserMsg = conv.messages.find((m) => m.role === 'user');
  const preview = firstUserMsg?.content.substring(0, 80) || '(no messages)';
  const msgCount = conv.messages.length;
  const hasError = !!conv.error;

  return (
    <Card className="p-4 rounded-xl bg-vault-surface border border-vault-gold/5 hover:border-vault-gold/20 transition-colors cursor-pointer" onClick={onExpand}>
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-2">
          <span className="font-mono text-xs text-vault-text-muted truncate w-2/3">{conv.conversation_id.substring(0, 12)}...</span>
          <Badge variant={hasError ? 'destructive' : 'outline'} className="text-xs">
            {msgCount} msg
          </Badge>
        </div>
        <p className="text-sm text-vault-text-light mb-2 line-clamp-2">{preview}</p>
        <div className="flex justify-between items-center text-xs text-vault-text-muted">
          <span>{getRelativeTime(conv.started_at)}</span>
          <span>💬 {conv.channel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversationDetail({ conv, onClose }: { conv: Conversation; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-vault-black border-vault-gold/20">
        <CardHeader className="border-b border-vault-gold/10">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg mb-1">Conversation #{conv.conversation_id.substring(0, 8)}</CardTitle>
              <p className="text-xs text-vault-text-muted">
                {new Date(conv.started_at).toLocaleString()} • {conv.messages.length} messages
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-vault-text-light hover:bg-vault-surface">
              ✕
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {conv.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`
                    max-w-[80%] px-4 py-2.5 rounded-2xl text-sm
                    ${msg.role === 'user'
                      ? 'bg-vault-red/20 text-vault-text-light rounded-br-md'
                      : 'bg-vault-surface border border-vault-gold/10 text-vault-text-light rounded-bl-md'
                    }
                  `}
                >
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
        </ScrollArea>
      </Card>
    </div>
  );
}

export default function DashboardChatHistory({ maxDisplay = 10 }: DashboardChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = (await response.json()) as { conversations: Conversation[] };
          setConversations(data.conversations.slice(0, maxDisplay));
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 30000); // Refresh every 30s
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

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3" aria-hidden="true">
          💬
        </span>
        <h3 className="font-display text-lg text-vault-text-light mb-1">No chat history yet</h3>
        <p className="text-sm text-vault-text-muted">Chat conversations will appear here for QA/review</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-4 pb-20">
          {conversations.map((conv) => (
            <ConversationCard
              key={conv.conversation_id}
              conv={conv}
              onExpand={() => setSelectedConv(conv)}
            />
          ))}
        </div>
      </ScrollArea>

      {selectedConv && (
        <ConversationDetail
          conv={selectedConv}
          onClose={() => setSelectedConv(null)}
        />
      )}
    </>
  );
}
