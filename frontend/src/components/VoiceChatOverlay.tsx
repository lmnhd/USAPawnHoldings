'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VoiceStatus, VoiceTranscript } from '@/hooks/useVoiceChat';

/* ──────────────────────────────────────────────────────
   VoiceChatOverlay

   Renders inside the ChatWidget when voice mode is active.
   Shows:
   - Animated orb / pulse indicator
   - Connection + speaking status
   - Scrolling transcript of the conversation
   - End call button
   ────────────────────────────────────────────────────── */

type VoiceChatOverlayProps = {
  status: VoiceStatus;
  transcripts: VoiceTranscript[];
  isSpeaking: boolean;
  isUserSpeaking: boolean;
  error: string | null;
  onDisconnect: () => void;
};

export default function VoiceChatOverlay({
  status,
  transcripts,
  isSpeaking,
  isUserSpeaking,
  error,
  onDisconnect,
}: VoiceChatOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const statusLabel =
    status === 'connecting'
      ? 'Connecting...'
      : isUserSpeaking
        ? 'Listening...'
        : isSpeaking
          ? 'Speaking...'
          : 'Ready — speak anytime';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Voice Orb ── */}
      <div className="flex flex-col items-center justify-center py-8 gap-4 shrink-0">
        {/* Pulsing orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring pulse */}
          <span
            className={`
              absolute w-28 h-28 rounded-full transition-all duration-500
              ${isSpeaking
                ? 'bg-vault-red/20 animate-ping'
                : isUserSpeaking
                  ? 'bg-blue-500/20 animate-pulse'
                  : status === 'connecting'
                    ? 'bg-vault-text-muted/10 animate-pulse'
                    : 'bg-vault-red/10'
              }
            `}
          />
          {/* Middle ring */}
          <span
            className={`
              absolute w-20 h-20 rounded-full transition-all duration-300
              ${isSpeaking
                ? 'bg-vault-red/30 scale-110'
                : isUserSpeaking
                  ? 'bg-blue-500/25 scale-105'
                  : 'bg-vault-red/15'
              }
            `}
          />
          {/* Core orb */}
          <span
            className={`
              relative z-10 w-14 h-14 rounded-full flex items-center justify-center
              transition-all duration-200 shadow-lg
              ${isSpeaking
                ? 'bg-vault-red scale-110 shadow-vault-red/40'
                : isUserSpeaking
                  ? 'bg-blue-500 scale-105 shadow-blue-500/40'
                  : status === 'connecting'
                    ? 'bg-vault-text-muted/50'
                    : 'bg-vault-red/80'
              }
            `}
          >
            {status === 'connecting' ? (
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </span>
        </div>

        {/* Status label */}
        <p className="text-sm text-vault-text-muted font-medium tracking-wide">
          {statusLabel}
        </p>

        {/* Error message */}
        {error && (
          <p className="text-xs text-vault-red px-4 text-center max-w-[80%]">
            {error}
          </p>
        )}
      </div>

      {/* ── Transcript ── */}
      <ScrollArea className="flex-1 min-h-0 border-t border-vault-border">
        <div className="p-4 space-y-2.5">
          {transcripts.length === 0 && status === 'connected' && (
            <p className="text-xs text-vault-text-muted text-center italic py-2">
              Conversation transcript will appear here...
            </p>
          )}
          {transcripts.map((t, i) => (
            <div
              key={`${t.timestamp}-${i}`}
              className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${t.role === 'user'
                    ? 'bg-vault-red/20 text-vault-text-light rounded-br-md'
                    : 'bg-vault-surface text-vault-text-light rounded-bl-md border border-vault-border'
                  }
                `}
              >
                {/* Display image if present (from inventory/appraisal results) */}
                {t.imageUrl && (
                  <div className="mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.imageUrl}
                      alt="Inventory item"
                      className="max-w-full h-auto max-h-48 rounded-lg border-2 border-vault-border-accent shadow-lg"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{t.text}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* ── End Call ── */}
      <div className="p-3 border-t border-vault-border-accent flex justify-center shrink-0 bg-vault-surface-elevated">
        <Button
          onClick={onDisconnect}
          className="bg-vault-red hover:bg-vault-red-hover text-white px-8 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
          End Voice Chat
        </Button>
      </div>
    </div>
  );
}
