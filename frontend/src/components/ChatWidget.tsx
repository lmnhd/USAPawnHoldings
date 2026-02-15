'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import DynamicFormPanel from './DynamicFormPanel';

type FormSpec = {
  title: string;
  description?: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
    placeholder?: string;
    required?: boolean;
    options?: string[];
  }>;
  submitLabel?: string;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  formSpec?: FormSpec;
};

const QUICK_REPLIES = ['Get Appraisal', 'Check Hours', 'Schedule Visit', 'Start Ticket'];

const WELCOME_MESSAGE: Message = {
  id: 0,
  role: 'assistant',
  content: "Welcome to USA Pawn Holdings! I'm your AI assistant. I can help you get instant appraisals, check our hours, browse inventory, or schedule a visit. How can I help you today?",
};

export default function ChatWidget() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<FormSpec | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load conversation from localStorage on mount
  useEffect(() => {
    const loadConversation = async () => {
      const savedId = localStorage.getItem('vault_conversation_id');
      if (savedId) {
        setConversationId(savedId);
        setIsLoading(true);
        try {
          const response = await fetch(`/api/conversations/${savedId}`);
          if (response.ok) {
            const data = (await response.json()) as { conversation: { messages?: unknown[] } };
            if (data.conversation?.messages && Array.isArray(data.conversation.messages)) {
              // Restore messages from DB
              const restored = data.conversation.messages.map((msg: unknown, idx: number) => {
                const msgObj = msg as { role?: string; content?: string; image_url?: string };
                return {
                  id: idx,
                  role: (msgObj.role ?? 'user') as 'user' | 'assistant',
                  content: String(msgObj.content ?? ''),
                  imageUrl: msgObj.image_url,
                };
              });
              if (restored.length > 0) {
                setMessages(restored);
              }
            }
          }
        } catch (error) {
          console.error('Failed to restore conversation:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadConversation();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (expanded && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [expanded, isLoading]);

  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
    if (!content.trim() && !imageUrl) return;
    if (isStreaming) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      imageUrl,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    const assistantMsgId = Date.now() + 1;

    try {
      // Build chat messages for API
      const apiMessages = updatedMessages
        .filter((m) => m.id !== 0) // skip welcome
        .map((m) => {
          const msg: { role: string; content: string; image_url?: string } = {
            role: m.role,
            content: m.content,
          };
          if (m.imageUrl) {
            msg.image_url = m.imageUrl;
          }
          return msg;
        });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          conversationId,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      // Extract conversationId from response header
      const respConvId = response.headers.get('X-Conversation-ID');
      if (respConvId && !conversationId) {
        setConversationId(respConvId);
        localStorage.setItem('vault_conversation_id', respConvId);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let accumulatedContent = '';
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMsg]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.id === assistantMsgId) {
            updated[lastIdx] = { ...updated[lastIdx], content: accumulatedContent };
          }
          return updated;
        });
      }

      // After streaming, check if response contains a form request
      try {
        // Try to parse as JSON to detect form requests
        const parsed = JSON.parse(accumulatedContent);
        if (parsed.__form_request && parsed.form_spec) {
          // Store form spec and update message to indicate form is shown
          setActiveForm(parsed.form_spec as FormSpec);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.id === assistantMsgId) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: parsed.form_spec.description || 'Please fill out the form below:',
                formSpec: parsed.form_spec as FormSpec,
              };
            }
            return updated;
          });
        }
      } catch {
        // Not JSON, treat as regular text message (already handled)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: "I'm sorry, I had trouble processing that. Please try again or call us at (904) 641-7296.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, conversationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      sendMessage(`[Photo uploaded for appraisal]`, base64);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && expanded) {
      setExpanded(false);
    }
  };

  const handleFormSubmit = (data: Record<string, string>) => {
    // Format the form data as a user message
    const formattedData = Object.entries(data)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    sendMessage(`Form submitted:\n${formattedData}`);
    setActiveForm(null);
  };

  const handleFormCancel = () => {
    setActiveForm(null);
    sendMessage('Form cancelled');
  };

  // Collapsed bubble
  if (!expanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          onClick={() => setExpanded(true)}
          className="group w-16 h-16 rounded-full bg-vault-red text-white shadow-2xl hover:scale-110 hover:bg-vault-red-hover active:scale-95 transition-all duration-200"
          aria-label="Open chat"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">💬</span>
        </Button>
        {/* Notification dot for new visitors */}
        {messages.length === 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-vault-red rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  // Expanded chat
  const containerClass = isMobile
    ? 'fixed inset-0 z-50 bg-vault-black flex flex-col'
    : 'fixed bottom-6 right-6 z-50 w-[400px] h-[600px] bg-vault-surface-elevated rounded-xl shadow-vault-lg border border-vault-border-accent flex flex-col overflow-hidden';

  return (
    <div className={containerClass} onKeyDown={handleKeyDown} role="dialog" aria-label="USA Pawn AI Chat">
      {/* Header */}
      <div className="bg-vault-red text-white px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏛️</span>
          <div>
            <span className="font-semibold text-sm">USA Pawn AI</span>
            <span className="block text-xs opacity-70">Your Smart Pawn Assistant</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(false)}
          className="w-8 h-8 rounded-full text-white hover:bg-black/10 hover:text-white"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-vault-red/20 text-vault-text-light rounded-br-md'
                    : 'bg-vault-surface text-vault-text-light rounded-bl-md border border-vault-border'
                  }
                `}
              >
                {msg.imageUrl && (
                  <div className="mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded item"
                      className="max-w-full h-auto max-h-32 rounded-lg"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-vault-surface text-vault-text-light px-4 py-2.5 rounded-2xl rounded-bl-md border border-vault-border">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-vault-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-vault-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-vault-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Dynamic Form Panel */}
      {activeForm && (
        <DynamicFormPanel
          formSpec={activeForm}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Quick Replies */}
      {messages.length <= 2 && !isStreaming && (
        <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-vault-border shrink-0">
          {QUICK_REPLIES.map((reply) => (
            <Button
              key={reply}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(reply)}
              className="text-xs bg-vault-surface hover:bg-vault-red/20 text-vault-text-light border-vault-border-accent px-3 py-1.5 rounded-full h-auto"
              disabled={isStreaming}
            >
              {reply}
            </Button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-vault-border-accent flex gap-2 items-end shrink-0 bg-vault-surface-elevated"
      >
        {/* Image upload button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-lg bg-vault-surface hover:bg-vault-red/20 text-vault-text-light shrink-0"
          aria-label="Upload image"
          disabled={isStreaming}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 bg-vault-input-bg border-vault-input-border rounded-lg px-3 py-2.5 text-sm text-vault-text-light placeholder:text-vault-text-muted focus:border-vault-red/50 focus-visible:ring-vault-red/30"
          disabled={isStreaming}
        />

        <Button
          type="submit"
          size="icon"
          disabled={isStreaming || !input.trim()}
          className="w-10 h-10 rounded-lg bg-vault-red text-white hover:bg-vault-red-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </form>
    </div>
  );
}
