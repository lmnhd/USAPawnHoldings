'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ──────────────────────────────────────────────────────
   useVoiceChat — Browser → OpenAI Realtime API via WebRTC

   Flow:
   1. POST /api/realtime-session  →  ephemeral token
   2. getUserMedia()              →  mic audio track
   3. RTCPeerConnection           →  SDP offer/answer with OpenAI
   4. DataChannel "oai-events"    →  session events (transcripts, tools)
   5. Remote audio track           →  <audio> playback
   6. Tool calls                   →  execute against Next.js API routes

   The hook exposes:
   - connect()    — start voice session
   - disconnect() — tear down everything
   - status       — 'idle' | 'connecting' | 'connected' | 'error'
   - transcripts  — array of { role, text } spoken exchanges
   - isSpeaking   — true when the AI is outputting audio
   ────────────────────────────────────────────────────── */

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type VoiceTranscript = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  imageUrl?: string;  // For inventory/appraisal results
};

export type VoiceFormSpec = {
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

type UseVoiceChatReturn = {
  status: VoiceStatus;
  transcripts: VoiceTranscript[];
  activeForm: VoiceFormSpec | null;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
  connect: (options?: {
    mode?: 'general' | 'appraisal' | 'ops';
    conversationId?: string | null;
    pagePath?: string;
    roleHint?: 'customer' | 'staff_or_owner';
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => Promise<void>;
  disconnect: () => void;
  clearTranscripts: () => void;
  clearActiveForm: () => void;
  error: string | null;
};

const INVENTORY_NAVIGATION_TERMS = new Set([
  'next',
  'another',
  'other',
  'else',
  'what',
  'more',
  'different',
  'option',
  'options',
]);

function normalizeInventoryTerm(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isNavigationInventoryKeyword(value: unknown): boolean {
  const normalized = normalizeInventoryTerm(value);
  if (!normalized) return false;

  const compact = normalized.replace(/[^a-z0-9\s]+/g, ' ').trim();
  if (!compact) return false;

  const tokens = compact.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.length <= 5 && tokens.every((token) => INVENTORY_NAVIGATION_TERMS.has(token));
}

function buildInventoryResultKey(topMatches: Array<Record<string, unknown>>): string {
  if (topMatches.length === 0) return 'inventory:empty';

  const parts = topMatches.map((item) => {
    const itemId = String(item.item_id ?? item.id ?? '').trim();
    if (itemId) return `id:${itemId}`;

    const brand = String(item.brand ?? '').trim().toLowerCase();
    const model = String(item.model ?? '').trim().toLowerCase();
    const description = String(item.description ?? '').trim().toLowerCase().slice(0, 80);
    const image = String(item.image_url ?? '').trim().slice(0, 32);
    return `${brand}|${model}|${description}|${image}`;
  });

  return `inventory:${parts.join('||')}`;
}

export function useVoiceChat(): UseVoiceChatReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [activeForm, setActiveForm] = useState<VoiceFormSpec | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Track partial transcripts by item_id
  const partialTranscriptsRef = useRef<Map<string, string>>(new Map());

  // Track which tool calls we've already handled
  const handledToolCallsRef = useRef<Set<string>>(new Set());

  // Track pending image URL to attach to next assistant message
  const pendingImageRef = useRef<string | null>(null);

  // Track inventory image index per query so repeated "next" requests can rotate images
  const inventoryImageCursorRef = useRef<Map<string, number>>(new Map());
  const lastInventoryQueryRef = useRef<{ category: string; keyword: string } | null>(null);
  const formRequestCountRef = useRef(0);
  const lastFormRequestAtRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupResources = useCallback(() => {
    // Close data channel
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Pause audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    partialTranscriptsRef.current.clear();
    handledToolCallsRef.current.clear();
    inventoryImageCursorRef.current.clear();
    lastInventoryQueryRef.current = null;
  }, []);

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        // ── AI started / stopped audio output ──
        case 'response.audio.delta':
          setIsSpeaking(true);
          break;

        case 'response.audio.done':
          setIsSpeaking(false);
          break;

        // ── VAD: user started/stopped speaking ──
        case 'input_audio_buffer.speech_started':
          setIsUserSpeaking(true);
          break;

        case 'input_audio_buffer.speech_stopped':
          setIsUserSpeaking(false);
          break;

        // ── Transcripts: what the user said ──
        case 'conversation.item.input_audio_transcription.completed':
          if (msg.transcript?.trim()) {
            setTranscripts((prev) => [
              ...prev,
              {
                role: 'user',
                text: msg.transcript.trim(),
                timestamp: Date.now(),
              },
            ]);
          }
          break;

        // ── Transcripts: partial assistant audio transcript ──
        case 'response.audio_transcript.delta':
          if (msg.item_id && msg.delta) {
            const current = partialTranscriptsRef.current.get(msg.item_id) || '';
            partialTranscriptsRef.current.set(msg.item_id, current + msg.delta);
          }
          break;

        case 'response.audio_transcript.done':
          if (msg.transcript?.trim()) {
            // Use the completed transcript
            const newTranscript: VoiceTranscript = {
              role: 'assistant',
              text: msg.transcript.trim(),
              timestamp: Date.now(),
            };
            // Attach pending image if available
            if (pendingImageRef.current) {
              newTranscript.imageUrl = pendingImageRef.current;
              console.log(`[Voice] Attaching image to transcript: ${pendingImageRef.current.substring(0, 80)}...`);
              pendingImageRef.current = null;
            }
            setTranscripts((prev) => [...prev, newTranscript]);
          } else if (msg.item_id) {
            // Fall back to accumulated delta
            const accumulated = partialTranscriptsRef.current.get(msg.item_id);
            if (accumulated?.trim()) {
              const newTranscript: VoiceTranscript = {
                role: 'assistant',
                text: accumulated.trim(),
                timestamp: Date.now(),
              };
              // Attach pending image if available
              if (pendingImageRef.current) {
                newTranscript.imageUrl = pendingImageRef.current;
                console.log(`[Voice] Attaching image to transcript (delta): ${pendingImageRef.current.substring(0, 80)}...`);
                pendingImageRef.current = null;
              }
              setTranscripts((prev) => [...prev, newTranscript]);
            }
            partialTranscriptsRef.current.delete(msg.item_id);
          }
          setIsSpeaking(false);
          break;

        // ── Response lifecycle ──
        case 'response.done':
          setIsSpeaking(false);
          break;

        // ── Tool calls: Execute against Next.js API routes ──
        case 'response.function_call_arguments.done':
          if (msg.call_id && msg.name) {
            void executeToolCall(msg.call_id, msg.name, msg.arguments);
          }
          break;

        case 'response.output_item.done':
          if (msg.item?.type === 'function_call' && msg.item.call_id && msg.item.name) {
            void executeToolCall(msg.item.call_id, msg.item.name, msg.item.arguments);
          }
          break;

        // ── Errors ──
        case 'error':
          console.error('[Voice] OpenAI error:', msg.error);
          setError(msg.error?.message || 'Voice session error');
          break;

        default:
          // Other events we don't need to handle
          break;
      }
    } catch (err) {
      console.error('[Voice] Failed to parse data channel message:', err);
    }
  }, []);

  const buildInventoryVoiceResponse = useCallback((result: {
    success?: boolean;
    count?: number;
    top_matches?: Array<Record<string, unknown>>;
    selected_match?: Record<string, unknown>;
    navigation_request?: boolean;
  }): string => {
    const count = Number(result.count ?? 0);
    const top = Array.isArray(result.top_matches) ? result.top_matches : [];
    const selected = result.selected_match ?? top[0];

    if (!result.success || count <= 0 || top.length === 0) {
      return "I don’t see a live match in inventory right now. Want me to check another brand or style?";
    }

    const shortLabel = (item: Record<string, unknown>) => {
      const brand = String(item.brand ?? '').trim();
      const model = String(item.model ?? '').trim();
      const category = String(item.category ?? 'item').trim();
      const parts = [brand, model].filter((part) => part && part.toLowerCase() !== 'unbranded');
      const combined = parts.length > 0 ? parts.join(' ') : category;
      return combined.split(/\s+/).slice(0, 6).join(' ');
    };

    const selectedLabel = selected ? shortLabel(selected) : 'item';

    const noun = count === 1 ? 'item' : 'items';
    if (count > 1) {
      if (result.navigation_request) {
        return `Yep — I found ${count} ${noun}. Next match is ${selectedLabel}. Want details on this one or another option?`;
      }
      return `Yes — I found ${count} ${noun}. First match is ${selectedLabel}. Want details on this one, or should I show the next match?`;
    }

    return `Yes — I found ${count} ${noun}: ${selectedLabel}. Want details or something similar?`;
  }, []);

  const executeToolCall = useCallback(async (callId: string, name: string, argsJson: string) => {
    // Dedupe: only execute each call_id once
    if (handledToolCallsRef.current.has(callId)) return;
    handledToolCallsRef.current.add(callId);

    console.log(`[Voice Tool] Executing: ${name} (${callId})`);
    console.log(`[Voice Tool] Arguments:`, argsJson);

    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(argsJson || '{}');
    } catch (parseErr) {
      console.error(`[Voice Tool] Failed to parse arguments for ${name}:`, parseErr);
      args = {};
    }

    let result: unknown;
    let toolFollowupInstruction: string | null = null;

    try {
      // Route tool calls to the appropriate API endpoints
      switch (name) {
        case 'schedule_visit': {
          const nowMs = Date.now();
          const secondsSinceLastForm = lastFormRequestAtRef.current
            ? Math.round((nowMs - lastFormRequestAtRef.current) / 1000)
            : null;
          console.log(
            `[Voice Tool][FormFlow] schedule_visit invoked (call_id=${callId}, form_requests_seen=${formRequestCountRef.current}, seconds_since_last_form=${secondsSinceLastForm ?? 'none'})`
          );

          console.log(`[Voice Tool] → POST /api/schedule`);
          const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'voice_chat',
              customer_name: args.customer_name,
              phone: args.phone,
              preferred_time: args.preferred_time,
              item_description: args.item_description,
              estimated_value: args.estimated_value,
            }),
          });
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result:`, result);
          break;
        }

        case 'check_store_status': {
          console.log(`[Voice Tool] → GET /api/store-status`);
          const res = await fetch('/api/store-status');
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result:`, result);
          break;
        }

        case 'check_inventory': {
          const rawCategory = normalizeInventoryTerm(args.category);
          const rawKeyword = normalizeInventoryTerm(args.keyword);
          const navigationRequest = isNavigationInventoryKeyword(rawKeyword);

          const effectiveCategory = rawCategory || lastInventoryQueryRef.current?.category || '';
          const effectiveKeyword = navigationRequest
            ? (lastInventoryQueryRef.current?.keyword || '')
            : rawKeyword;

          if (effectiveCategory || effectiveKeyword) {
            lastInventoryQueryRef.current = {
              category: effectiveCategory,
              keyword: effectiveKeyword,
            };
          }

          console.log(`[Voice Tool] → POST /api/inventory/search`);
          const res = await fetch('/api/inventory/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: effectiveCategory,
              keyword: effectiveKeyword,
            }),
          });
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result: ${JSON.stringify(result).substring(0, 200)}...`);

          const inventoryResult = result as {
            success?: boolean;
            count?: number;
            top_matches?: Array<Record<string, unknown>>;
            display_image?: string | null;
          };

          const queryKey = `${effectiveCategory}::${effectiveKeyword}`;
          const topMatches = Array.isArray(inventoryResult.top_matches) ? inventoryResult.top_matches : [];
          const resultCursorKey = buildInventoryResultKey(topMatches);
          const cursorKey = resultCursorKey || queryKey;

          const nextIndex = inventoryImageCursorRef.current.get(cursorKey) ?? 0;
          const selectedIndex = navigationRequest && topMatches.length > 0
            ? nextIndex % topMatches.length
            : 0;
          const selectedMatch = topMatches.length > 0 ? topMatches[selectedIndex] : null;

          if (topMatches.length > 0) {
            inventoryImageCursorRef.current.set(cursorKey, (selectedIndex + 1) % topMatches.length);
          }

          const selectedImage = selectedMatch
            ? String(selectedMatch.image_url ?? '').trim() ||
              (Array.isArray(selectedMatch.images) && selectedMatch.images.length > 0
                ? String(selectedMatch.images[0] ?? '').trim()
                : '')
            : '';

          result = {
            ...inventoryResult,
            selected_match: selectedMatch,
            navigation_request: navigationRequest,
            voice_response: '',
            tool_truth: inventoryResult.success && Number(inventoryResult.count ?? 0) > 0
              ? 'inventory_available'
              : 'inventory_unavailable',
          };

          const deterministicWithSelection = buildInventoryVoiceResponse(result as {
            success?: boolean;
            count?: number;
            top_matches?: Array<Record<string, unknown>>;
            selected_match?: Record<string, unknown>;
            navigation_request?: boolean;
          });
          (result as { voice_response: string }).voice_response = deterministicWithSelection;

          toolFollowupInstruction = [
            'You just received check_inventory tool output.',
            'Tool output is authoritative. Do not contradict it.',
            `Speak this exact response in 1-2 sentences: "${deterministicWithSelection}"`,
          ].join(' ');

          const rotatedImage = selectedImage || inventoryResult.display_image || null;

          if (inventoryResult.success && rotatedImage) {
            pendingImageRef.current = rotatedImage;
            console.log(`[Voice Tool] Image queued (idx=${selectedIndex}, key=${cursorKey}): ${pendingImageRef.current.substring(0, 80)}...`);
          } else {
            console.log(`[Voice Tool] No image in response (success: ${inventoryResult.success}, has display_image: ${Boolean(inventoryResult.display_image)})`);
          }
          break;
        }

        case 'get_gold_spot_price': {
          console.log(`[Voice Tool] → GET /api/gold-price`);
          const res = await fetch('/api/gold-price');
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result:`, result);
          break;
        }

        case 'appraise_item': {
          console.log(`[Voice Tool] → POST /api/appraise`);
          const res = await fetch('/api/appraise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photo_url: args.photo_url,
              description: args.description,
              category: args.category,
            }),
          });
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result:`, result);
          
          // Save the photo URL for display in transcript
          if (args.photo_url) {
            pendingImageRef.current = args.photo_url as string;
            console.log(`[Voice Tool] Image queued: ${pendingImageRef.current}`);
          }
          break;
        }

        case 'log_lead': {
          console.log(`[Voice Tool] → POST /api/leads`);
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: args.source || 'voice_chat',
              customer_info: args.customer_info,
              item_interest: args.item_interest,
              estimated_value: args.estimated_value,
            }),
          });
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result:`, result);
          break;
        }

        case 'escalate_to_staff': {
          console.log(`[Voice Tool] → POST /api/leads (escalation)`);
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'voice_chat',
              priority: args.priority || 'high',
              estimated_value: args.estimated_value,
              item_description: args.reason,
              status: 'escalated',
            }),
          });
          console.log(`[Voice Tool] ← Status: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const text = await res.text();
            console.error(`[Voice Tool] Error response:`, text.substring(0, 500));
            throw new Error(`API returned ${res.status}: ${text.substring(0, 200)}`);
          }
          result = await res.json();
          console.log(`[Voice Tool] ✓ Result:`, result);
          break;
        }

        case 'request_form': {
          const fields = Array.isArray(args.fields)
            ? args.fields
                .filter((field): field is Record<string, unknown> => typeof field === 'object' && field !== null)
                .map((field) => {
                  const type = String(field.type ?? 'text');
                  const safeType: 'text' | 'tel' | 'email' | 'select' | 'textarea' =
                    type === 'tel' || type === 'email' || type === 'select' || type === 'textarea'
                      ? type
                      : 'text';

                  return {
                    name: String(field.name ?? '').trim(),
                    label: String(field.label ?? field.name ?? 'Field').trim(),
                    type: safeType,
                    placeholder: field.placeholder ? String(field.placeholder) : undefined,
                    required: Boolean(field.required),
                    options: Array.isArray(field.options)
                      ? field.options.map((option) => String(option)).filter(Boolean)
                      : undefined,
                  };
                })
                .filter((field) => field.name.length > 0 && field.label.length > 0)
            : [];

          const formSpec: VoiceFormSpec = {
            title: String(args.title ?? 'Please Fill Out').trim() || 'Please Fill Out',
            description: args.description ? String(args.description) : undefined,
            fields,
            submitLabel: args.submitLabel ? String(args.submitLabel) : undefined,
          };

          formRequestCountRef.current += 1;
          lastFormRequestAtRef.current = Date.now();
          console.log(
            `[Voice Tool][FormFlow] request_form invoked (call_id=${callId}, title="${formSpec.title}", fields=${formSpec.fields.length}, count=${formRequestCountRef.current})`
          );

          setActiveForm(formSpec);

          result = {
            __form_request: true,
            form_spec: formSpec,
          };

          toolFollowupInstruction = [
            'A structured form is now visible to the user.',
            'In one short sentence, ask them to complete it so you can continue.',
            'Do not ask each field one-by-one in voice.',
          ].join(' ');
          break;
        }

        default:
          console.error(`[Voice Tool] ⚠️ Unsupported tool: ${name}`);
          result = { success: false, error: `Unsupported tool: ${name}` };
      }
    } catch (err) {
      console.error(`[Voice Tool] ❌ Execution failed for ${name}:`, err);
      console.error(`[Voice Tool] Error details:`, {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      result = {
        success: false,
        error: err instanceof Error ? err.message : 'Tool execution failed',
      };
    }

    // Send result back to OpenAI via data channel
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result),
          },
        })
      );

      // Trigger the AI to respond with the tool result
      if (toolFollowupInstruction) {
        dcRef.current.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              instructions: toolFollowupInstruction,
            },
          })
        );
      } else {
        dcRef.current.send(JSON.stringify({ type: 'response.create' }));
      }
    }
  }, [buildInventoryVoiceResponse]);

  const connect = useCallback(async (options?: {
    mode?: 'general' | 'appraisal' | 'ops';
    conversationId?: string | null;
    pagePath?: string;
    roleHint?: 'customer' | 'staff_or_owner';
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) => {
    if (status === 'connecting' || status === 'connected') return;

    setStatus('connecting');
    setError(null);
    setTranscripts([]); // Fresh session = fresh transcripts
    setActiveForm(null);
    partialTranscriptsRef.current.clear();

    try {
      // 1. Get ephemeral token from our API
      const tokenRes = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options ?? {}),
      });
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.error || `Session creation failed (${tokenRes.status})`);
      }
      const { client_secret } = await tokenRes.json();
      if (!client_secret) throw new Error('No client secret returned');

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up audio playback for AI responses
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // 4. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      });
      streamRef.current = stream;

      // Add mic track to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 5. Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('[Voice] Data channel open');

        // Ensure input audio transcription is enabled (belt-and-suspenders with session config)
        dc.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              input_audio_transcription: {
                model: 'whisper-1',
              },
            },
          })
        );

        // Trigger model to start naturally per server-provided session instructions.
        dc.send(JSON.stringify({ type: 'response.create' }));
      };

      dc.onmessage = handleDataChannelMessage;

      dc.onclose = () => {
        console.log('[Voice] Data channel closed');
      };

      // 6. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Send offer to OpenAI, get answer
      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${client_secret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) {
        throw new Error(`WebRTC negotiation failed (${sdpRes.status})`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // 8. Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('[Voice] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStatus('connected');
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setStatus('idle');
          cleanupResources();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStatus('connected');
        }
      };

      // Optimistic status — most connections succeed quickly
      setStatus('connected');
    } catch (err) {
      console.error('[Voice] Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStatus('error');
      cleanupResources();
    }
  }, [status, cleanupResources, handleDataChannelMessage]);

  const disconnect = useCallback(() => {
    cleanupResources();
    setStatus('idle');
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    // NOTE: transcripts are intentionally NOT cleared here.
    // The parent component reads them to merge into the text chat history.
  }, [cleanupResources]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const clearActiveForm = useCallback(() => {
    console.log('[Voice Tool][FormFlow] clearActiveForm called (form dismissed or submitted).');
    setActiveForm(null);
  }, []);

  return {
    status,
    transcripts,
    activeForm,
    isSpeaking,
    isUserSpeaking,
    connect,
    disconnect,
    clearTranscripts,
    clearActiveForm,
    error,
  };
}
