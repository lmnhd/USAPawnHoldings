'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import ProductCardDialog, { type ProductCardData } from './ProductCardDialog';
import DynamicFormPanel from './DynamicFormPanel';
import { useVoiceChat, type VoiceFormSpec } from '@/hooks/useVoiceChat';

type FormSpec = VoiceFormSpec;

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  productItem?: ProductCardData;
  formSpec?: FormSpec;
  isWelcome?: boolean;
};

type ChatMode = 'general' | 'appraisal' | 'ops';

type VaultOpenChatDetail = {
  mode?: ChatMode;
  source?: string;
  open?: boolean;
};

type ModeStore = Record<ChatMode, Message[]>;
type ConversationStore = Record<ChatMode, string | null>;

type AppraisalDraft = {
  initialized: boolean;
  step: 1 | 2 | 3 | 4 | 5;
  category: string;
  description: string;
  photos: Array<{ id: string; preview: string; label: string }>;
  submitting: boolean;
  lastError: string;
  resultSummary: string;
  result?: {
    appraisalId?: string;
    photoUrl?: string;
    valueRange: string;
    estimatedValue: number;
    explanation: string;
    nextSteps: string;
  };
};

const CHAT_NAME = 'Merrill Vault Assistant';

const APPRAISAL_CATEGORIES = [
  'Jewelry',
  'Firearms',
  'Electronics',
  'Tools',
  'Musical Instruments',
  'Collectibles',
  'Sporting Goods',
] as const;

const PHOTO_LABELS = ['Front', 'Back', 'Detail', 'Serial/Hallmark', 'Clasp/Buckle', 'Scale Reference'] as const;
const HERO_WORD_COLORS = ['text-vault-red', 'text-white', 'text-vault-gold dark:text-[#5BA0E8]'] as const;
const HERO_TYPEWRITER_MAX_CHARS = 30;
const MODE_META: Record<ChatMode, { label: string; icon: string; subtitle: string }> = {
  general: {
    label: 'General',
    icon: '🏛️',
    subtitle: 'Store info, hours, inventory, and scheduling',
  },
  appraisal: {
    label: 'Appraisal',
    icon: '💎',
    subtitle: 'Guided, step-by-step valuation flow',
  },
  ops: {
    label: 'Operations',
    icon: '🛠️',
    subtitle: 'Staff and management support',
  },
};

const WELCOME_MESSAGES: Record<ChatMode, Message> = {
  general: {
    id: 100,
    role: 'assistant',
    isWelcome: true,
    content: 'Welcome to USAPawnHoldings, looking for something specific?',
  },
  appraisal: {
    id: 200,
    role: 'assistant',
    isWelcome: true,
    content: 'Welcome to Guided Appraisal—what item are we valuing today?',
  },
  ops: {
    id: 300,
    role: 'assistant',
    isWelcome: true,
    content: 'Operations mode is active—what do you need help with right now?',
  },
};

const QUICK_REPLIES: Record<ChatMode, string[]> = {
  general: ['Check Hours', 'Browse Inventory', 'Schedule Visit', 'Loan Terms'],
  appraisal: ['Start Guided Appraisal', 'How long does this take?'],
  ops: ['Lead Summary', 'Inventory Question', 'Staff Issue', 'Schedule Conflict'],
};

const SCHEDULE_TIME_OPTIONS = [
  'Today 3:00 PM',
  'Today 4:00 PM',
  'Today 5:00 PM',
  'Tomorrow 10:00 AM',
  'Tomorrow 1:00 PM',
  'Tomorrow 3:00 PM',
  'Tomorrow 4:00 PM',
] as const;

function inferModeFromPath(pathname: string): ChatMode {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/staff')) {
    return 'ops';
  }
  return 'general';
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

function buildHeroHeadline(raw: string | undefined, fallback: string, options?: { preserveFullLead?: boolean; maxChars?: number }): string {
  const source = (raw ?? '').trim();
  if (!source) return fallback;

  const cleaned = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*|__|~~|#+/g, ' ')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;

  const lead = options?.preserveFullLead ? cleaned : cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() || cleaned;
  if (!lead) return fallback;

  const maxChars = Number(options?.maxChars ?? 0);
  if (!maxChars || lead.length <= maxChars) return lead;

  const clipped = lead.slice(0, maxChars).trimEnd();
  const safeCut = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('?'), clipped.lastIndexOf('!'), clipped.lastIndexOf(','));
  return `${(safeCut >= 60 ? clipped.slice(0, safeCut + 1) : clipped).trimEnd()}…`;
}

function extractInventoryHighlights(raw: string | undefined): string[] {
  const source = (raw ?? '').trim();
  if (!source) return [];

  const topMatchesMarker = source.match(/Top matches:\s*(.*?)(?:\.\s|$)/i)?.[1] ?? '';
  if (!topMatchesMarker) return [];

  const fromPipes = topMatchesMarker
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fromPipes.length > 0) {
    return fromPipes.slice(0, 3);
  }

  const fromSemicolons = topMatchesMarker
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return fromSemicolons.slice(0, 3);
}

function normalizeImageKey(url: string): string {
  return url.trim().replace(/[?#].*$/, '');
}

function imageMatches(candidateUrl: string | null | undefined, targetUrl: string): boolean {
  const candidate = normalizeImageKey(String(candidateUrl ?? ''));
  const target = normalizeImageKey(targetUrl);
  if (!candidate || !target) return false;
  return candidate === target || candidate.endsWith(target) || target.endsWith(candidate);
}

export default function ChatWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldHide = pathname === '/pitch';

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('general');
  const [messagesByMode, setMessagesByMode] = useState<ModeStore>({
    general: [WELCOME_MESSAGES.general],
    appraisal: [WELCOME_MESSAGES.appraisal],
    ops: [WELCOME_MESSAGES.ops],
  });
  const [conversationIds, setConversationIds] = useState<ConversationStore>({
    general: null,
    appraisal: null,
    ops: null,
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeForm, setActiveForm] = useState<FormSpec | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [selectedProductCard, setSelectedProductCard] = useState<ProductCardData | null>(null);
  const [productCardError, setProductCardError] = useState('');
  const [isResolvingProductCard, setIsResolvingProductCard] = useState(false);
  const [appraisal, setAppraisal] = useState<AppraisalDraft>({
    initialized: false,
    step: 1,
    category: '',
    description: '',
    photos: [],
    submitting: false,
    lastError: '',
    resultSummary: '',
    result: undefined,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const quickImageInputRef = useRef<HTMLInputElement>(null);
  const appraisalImageInputRef = useRef<HTMLInputElement>(null);
  const handledAutoVoiceRequestRef = useRef<string | null>(null);
  const hasPlayedGeneralIntroTypewriterRef = useRef(false);

  const voice = useVoiceChat();

  const autoMode = useMemo(() => inferModeFromPath(pathname), [pathname]);
  const opsAllowed = autoMode === 'ops';
  const visibleModes = useMemo(
    () => (opsAllowed ? (['ops'] as ChatMode[]) : (['general', 'appraisal'] as ChatMode[])),
    [opsAllowed],
  );
  const currentMessages = useMemo(() => messagesByMode[mode] ?? [], [messagesByMode, mode]);
  const latestAssistantMessage = useMemo(
    () => [...currentMessages].reverse().find((message) => message.role === 'assistant' && message.content.trim().length > 0),
    [currentMessages],
  );
  const latestUserMessage = useMemo(
    () => [...currentMessages].reverse().find((message) => message.role === 'user' && message.content.trim().length > 0),
    [currentMessages],
  );
  const latestVoiceAssistant = useMemo(
    () => [...voice.transcripts].reverse().find((entry) => entry.role === 'assistant' && entry.text.trim().length > 0),
    [voice.transcripts],
  );
  const latestVisualMessage = useMemo(() => {
    return [...currentMessages].reverse().find((message) => Boolean(message.imageUrl)) ?? null;
  }, [currentMessages]);
  const latestVisualImageUrl = useMemo(() => {
    if (voiceMode) {
      return [...voice.transcripts].reverse().find((entry) => Boolean(entry.imageUrl))?.imageUrl ?? null;
    }
    return latestVisualMessage?.imageUrl ?? null;
  }, [voiceMode, voice.transcripts, latestVisualMessage]);
  const isAppraisalResultView = mode === 'appraisal' && appraisal.step === 5;

  const findInventoryItemByImage = useCallback(async (imageUrl: string): Promise<ProductCardData | null> => {
    const res = await fetch('/api/inventory?limit=100');
    if (!res.ok) return null;

    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    const matched = items.find((item: ProductCardData) => {
      if (imageMatches(String(item.image_url ?? ''), imageUrl)) return true;
      if (!Array.isArray(item.images)) return false;
      return item.images.some((img) => imageMatches(String(img), imageUrl));
    });

    return matched ?? null;
  }, []);

  const handleLatestVisualImageClick = useCallback(async () => {
    const imageUrl = latestVisualImageUrl;
    if (!imageUrl || voiceMode) return;

    setProductCardError('');

    if (latestVisualMessage?.productItem) {
      setSelectedProductCard(latestVisualMessage.productItem);
      return;
    }

    setIsResolvingProductCard(true);
    try {
      const matched = await findInventoryItemByImage(imageUrl);
      if (matched) {
        setSelectedProductCard(matched);
      } else {
        setProductCardError('No inventory record linked to this image yet.');
      }
    } catch {
      setProductCardError('Unable to load product details right now.');
    } finally {
      setIsResolvingProductCard(false);
    }
  }, [latestVisualImageUrl, voiceMode, latestVisualMessage, findInventoryItemByImage]);

  const appendAssistant = useCallback((targetMode: ChatMode, content: string) => {
    setMessagesByMode((prev) => ({
      ...prev,
      [targetMode]: [
        ...prev[targetMode],
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          role: 'assistant',
          content,
        },
      ],
    }));
  }, []);

  const mergeVoiceTranscriptsIntoChat = useCallback(() => {
    if (voice.transcripts.length === 0) return;

    const merged: Message[] = voice.transcripts.map((entry, index) => ({
      id: Date.now() + index,
      role: entry.role,
      content: entry.text,
      imageUrl: entry.imageUrl,
    }));

    setMessagesByMode((prev) => ({
      ...prev,
      [mode]: [...prev[mode], ...merged],
    }));
    voice.clearTranscripts();
  }, [mode, voice]);

  const resetAppraisalFlow = useCallback(() => {
    setAppraisal({
      initialized: true,
      step: 1,
      category: '',
      description: '',
      photos: [],
      submitting: false,
      lastError: '',
      resultSummary: '',
      result: undefined,
    });
    setMessagesByMode((prev) => ({
      ...prev,
      appraisal: [
        WELCOME_MESSAGES.appraisal,
        {
          id: Date.now(),
          role: 'assistant',
          content: 'Step 1 of 4 — Choose your item category to begin your guided appraisal.',
        },
      ],
    }));
  }, []);

  useEffect(() => {
    if (searchParams.get('heroOpen') === '1') {
      setOpen(true);
    }

    if (pathname === '/') {
      const requested = searchParams.get('heroMode');
      const requestedMode = requested === 'appraisal' || requested === 'ops' || requested === 'general' || requested === 'voice'
        ? requested
        : 'general';
      if (requestedMode === 'voice') {
        setMode('general');
      } else if (!opsAllowed && requestedMode === 'ops') {
        setMode('general');
      } else {
        setMode(requestedMode);
      }
      return;
    }

    setMode(autoMode);
  }, [pathname, searchParams, autoMode, opsAllowed]);

  useEffect(() => {
    if (voice.activeForm && mode !== 'appraisal') {
      setActiveForm(voice.activeForm as FormSpec);
    }
  }, [voice.activeForm, mode]);

  useEffect(() => {
    if (mode === 'appraisal' && !appraisal.initialized) {
      resetAppraisalFlow();
    }
  }, [mode, appraisal.initialized, resetAppraisalFlow]);

  useEffect(() => {
    if (!opsAllowed && mode === 'ops') {
      setMode('general');
    }
  }, [opsAllowed, mode]);

  useEffect(() => {
    if (open && mode !== 'appraisal') {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [open, mode]);

  useEffect(() => {
    const handleVaultOpenChat = (event: Event) => {
      const detail = (event as CustomEvent<VaultOpenChatDetail>).detail;
      const requestedMode = detail?.mode;

      if (requestedMode === 'ops' && !opsAllowed) {
        setMode('general');
      } else if (requestedMode === 'general' || requestedMode === 'appraisal' || requestedMode === 'ops') {
        setMode(requestedMode);
      }

      setOpen(detail?.open ?? true);
    };

    window.addEventListener('vault:open-chat', handleVaultOpenChat as EventListener);
    return () => {
      window.removeEventListener('vault:open-chat', handleVaultOpenChat as EventListener);
    };
  }, [opsAllowed]);

  const sendChatMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      if (mode === 'appraisal') return;
      if (!content.trim() && !imageUrl) return;
      if (isStreaming) return;

      const userMsg: Message = {
        id: Date.now(),
        role: 'user',
        content: content.trim(),
        imageUrl,
      };

      const nextMessages = [...currentMessages, userMsg];
      setMessagesByMode((prev) => ({ ...prev, [mode]: nextMessages }));
      setInput('');
      setIsStreaming(true);

      const assistantMsgId = Date.now() + 1;

      try {
        const apiMessages = nextMessages
          .map((msg) => {
            const formatted: { role: string; content: string; image_url?: string } = {
              role: msg.role,
              content: msg.content,
            };
            if (msg.imageUrl) formatted.image_url = msg.imageUrl;
            return formatted;
          });

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            conversationId: conversationIds[mode] ?? undefined,
            mode,
            pagePath: pathname,
            roleHint: autoMode === 'ops' ? 'staff_or_owner' : 'customer',
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Chat request failed');
        }

        const respConvId = response.headers.get('X-Conversation-ID');
        if (respConvId) {
          setConversationIds((prev) => ({ ...prev, [mode]: respConvId }));
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        let accumulatedContent = '';
        let isFormRequest = false;
        let isImageResponse = false;

        setMessagesByMode((prev) => ({
          ...prev,
          [mode]: [...prev[mode], { id: assistantMsgId, role: 'assistant', content: '' }],
        }));

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          if (!isFormRequest && accumulatedContent.trim().startsWith('{') && accumulatedContent.includes('__form_request')) {
            isFormRequest = true;
          }

          if (!isImageResponse && accumulatedContent.trim().startsWith('{') && accumulatedContent.includes('__with_image')) {
            isImageResponse = true;
          }

          if (!isFormRequest && !isImageResponse) {
            setMessagesByMode((prev) => {
              const streamMessages = [...prev[mode]];
              const idx = streamMessages.findIndex((m) => m.id === assistantMsgId);
              if (idx >= 0) {
                streamMessages[idx] = { ...streamMessages[idx], content: accumulatedContent };
              }
              return { ...prev, [mode]: streamMessages };
            });
          }
        }

        if (isFormRequest) {
          try {
            const parsed = JSON.parse(accumulatedContent);
            if (parsed.__form_request && parsed.form_spec) {
              setActiveForm(parsed.form_spec as FormSpec);
              setMessagesByMode((prev) => {
                const updated = [...prev[mode]];
                const idx = updated.findIndex((m) => m.id === assistantMsgId);
                if (idx >= 0) {
                  updated[idx] = {
                    ...updated[idx],
                    content: parsed.form_spec.description || 'Please fill out the form below.',
                    formSpec: parsed.form_spec as FormSpec,
                  };
                }
                return { ...prev, [mode]: updated };
              });
            }
          } catch {
            setMessagesByMode((prev) => {
              const updated = [...prev[mode]];
              const idx = updated.findIndex((m) => m.id === assistantMsgId);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], content: accumulatedContent };
              }
              return { ...prev, [mode]: updated };
            });
          }
        } else if (isImageResponse) {
          try {
            const parsed = JSON.parse(accumulatedContent);
            if (parsed.__with_image && parsed.content && parsed.image_url) {
              const parsedProduct = parsed.product_item && typeof parsed.product_item === 'object'
                ? (parsed.product_item as ProductCardData)
                : undefined;
              setMessagesByMode((prev) => {
                const updated = [...prev[mode]];
                const idx = updated.findIndex((m) => m.id === assistantMsgId);
                if (idx >= 0) {
                  updated[idx] = {
                    ...updated[idx],
                    content: parsed.content,
                    imageUrl: parsed.image_url,
                    productItem: parsedProduct,
                  };
                }
                return { ...prev, [mode]: updated };
              });
            }
          } catch {
            setMessagesByMode((prev) => {
              const updated = [...prev[mode]];
              const idx = updated.findIndex((m) => m.id === assistantMsgId);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], content: accumulatedContent };
              }
              return { ...prev, [mode]: updated };
            });
          }
        }
      } catch {
        appendAssistant(
          mode,
          "I hit a temporary issue. Please retry in a moment, or call us at (904) 871-8226.",
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [
      mode,
      isStreaming,
      currentMessages,
      conversationIds,
      pathname,
      autoMode,
      appendAssistant,
    ],
  );

  const handleQuickImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const base64 = await toBase64(file);
        await sendChatMessage('[Photo uploaded for quick estimate]', base64);
      } finally {
        event.target.value = '';
      }
    },
    [sendChatMessage],
  );

  const addAppraisalPhotos = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selected = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 6);
    if (selected.length === 0) {
      setAppraisal((prev) => ({ ...prev, lastError: 'Please upload image files only.' }));
      return;
    }

    const previews = await Promise.all(
      selected.map(async (file, index) => ({
        id: `${Date.now()}-${index}`,
        preview: await toBase64(file),
        label: PHOTO_LABELS[index] ?? `Photo ${index + 1}`,
      })),
    );

    setAppraisal((prev) => ({
      ...prev,
      lastError: '',
      photos: [...prev.photos, ...previews].slice(0, 6),
    }));
  }, []);

  const moveAppraisalStep = useCallback(
    (nextStep: 1 | 2 | 3 | 4 | 5) => {
      setAppraisal((prev) => ({ ...prev, step: nextStep, lastError: '' }));

      if (nextStep === 2) {
        appendAssistant('appraisal', 'Great, please provide a description of your item including brand, condition, model, age, and any markings (Step 2 of 4).');
      }
      if (nextStep === 3) {
        appendAssistant('appraisal', 'Perfect, now upload clear photos of your item with front and close-up detail shots for Step 3 of 4.');
      }
      if (nextStep === 4) {
        appendAssistant('appraisal', 'Excellent, review your details and submit when ready for Step 4 of 4.');
      }
    },
    [appendAssistant],
  );

  const submitGuidedAppraisal = useCallback(async () => {
    if (!appraisal.category || appraisal.photos.length === 0) {
      setAppraisal((prev) => ({ ...prev, lastError: 'Category and at least one photo are required.' }));
      return;
    }

    setAppraisal((prev) => ({ ...prev, submitting: true, lastError: '' }));
    appendAssistant('appraisal', 'Analyzing your item now — this usually takes a few seconds.');

    try {
      const response = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: appraisal.category,
          description: appraisal.description || undefined,
          photoUrls: appraisal.photos.map((photo) => photo.preview),
          photoLabels: appraisal.photos.map((photo) => photo.label),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Unable to appraise item');
      }

      const result = await response.json() as {
        appraisal_id: string;
        photo_url?: string;
        value_range: string;
        estimated_value: number;
        explanation: string;
        next_steps: string;
      };

      const summary = `Estimated range: $${result.value_range}. Midpoint: $${result.estimated_value}. ${result.next_steps}`;

      setAppraisal((prev) => ({
        ...prev,
        step: 5,
        submitting: false,
        resultSummary: summary,
        result: {
          appraisalId: result.appraisal_id,
          photoUrl: result.photo_url,
          valueRange: result.value_range,
          estimatedValue: result.estimated_value,
          explanation: result.explanation,
          nextSteps: result.next_steps,
        },
      }));

      appendAssistant('appraisal', 'Appraisal complete — your full Appraisal Result Card is ready below.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete appraisal right now.';
      setAppraisal((prev) => ({ ...prev, submitting: false, lastError: message }));
      appendAssistant('appraisal', 'I couldn’t finish that appraisal. Please retry or call the store for immediate help.');
    }
  }, [appraisal, appendAssistant]);

  const handleFormSubmit = useCallback(
    async (data: Record<string, string>) => {
      const titleSuggestsSchedule = (activeForm?.title ?? '').toLowerCase().includes('schedule');
      const hasScheduleShape = Boolean(
        (data.customer_name || data.full_name || data.name)
        && (data.phone || data.phone_number)
        && (data.preferred_time || data.time || data.time_slot),
      );
      const scheduleIntent = titleSuggestsSchedule || hasScheduleShape;
      const formatted = Object.entries(data)
        .map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
          return `${label}: ${value}`;
        })
        .join('\n');

      setActiveForm(null);
      voice.clearActiveForm();

      if (scheduleIntent) {
        try {
          const customerName = data.customer_name ?? data.full_name ?? data.name ?? '';
          const phone = data.phone ?? data.phone_number ?? '';
          const preferredTime = data.preferred_time ?? data.time ?? '';
          const itemDescription = data.item_description ?? `${appraisal.category || 'Item'} appraisal follow-up`;

          const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_name: customerName,
              phone,
              preferred_time: preferredTime,
              item_description: itemDescription,
              estimated_value: appraisal.result?.estimatedValue,
              appraisal_id: appraisal.result?.appraisalId,
              photo_url: appraisal.photos[0]?.preview ?? appraisal.result?.photoUrl,
              source: 'chat_widget_form',
            }),
          });

          if (response.ok) {
            const result = await response.json() as {
              confirmation_code?: string;
              scheduled_time?: string;
              sms_sent?: boolean;
            };
            const confirmationText = result.sms_sent
              ? `Appointment confirmed for ${result.scheduled_time ?? preferredTime}. Confirmation code: ${result.confirmation_code ?? 'N/A'}. We sent your SMS details now.`
              : `Appointment confirmed for ${result.scheduled_time ?? preferredTime}. Confirmation code: ${result.confirmation_code ?? 'N/A'}. SMS may be delayed, so call (904) 871-8226 if needed.`;
            appendAssistant(mode, confirmationText);
          } else if (response.status === 409) {
            const conflict = await response.json() as { suggest_next?: string };
            const suggested = conflict.suggest_next
              ? `Next available slot: ${new Date(conflict.suggest_next).toLocaleString()}.`
              : 'Please choose another listed slot.';
            appendAssistant(mode, `That time slot is full. ${suggested}`);
          } else {
            appendAssistant(mode, 'I couldn’t finalize your appointment yet. Please retry or call (904) 871-8226 and we’ll book it manually.');
          }
        } catch {
          appendAssistant(mode, 'I hit a temporary scheduling issue. Please retry in a moment, or call (904) 871-8226.');
        }
        return;
      }

      sendChatMessage(`Here is the requested information:\n\n${formatted}`);
    },
    [activeForm?.title, appraisal, appendAssistant, mode, sendChatMessage, voice],
  );

  const handleScheduleFromAppraisal = useCallback(() => {
    appendAssistant('general', 'Scheduling visit now. Please complete your contact details below so we can coordinate your in-store appraisal appointment.');
    setMode('general');
    setActiveForm({
      title: 'Schedule Visit',
      description: 'Share your contact info and preferred time. We will coordinate your in-store appraisal visit.',
      submitLabel: 'Send Schedule Request',
      fields: [
        { name: 'customer_name', label: 'Name', type: 'text', placeholder: 'Your full name', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', placeholder: '(904) 555-1234', required: true },
        {
          name: 'preferred_time',
          label: 'Preferred Time',
          type: 'select',
          required: true,
          options: [...SCHEDULE_TIME_OPTIONS],
        },
        {
          name: 'item_description',
          label: 'Item Details',
          type: 'textarea',
          placeholder: appraisal.description || `${appraisal.category || 'Item'} appraisal follow-up`,
          required: true,
        },
      ],
    });
    voice.clearActiveForm();
  }, [appraisal.category, appraisal.description, appendAssistant, voice]);

  const appraisalProgress = appraisal.step === 5 ? 100 : (appraisal.step / 4) * 100;
  const voiceLoadingText = useMemo(() => {
    if (!voiceMode) return MODE_META[mode].subtitle;
    if (voice.status === 'connecting') return 'Retrieving voice agent...';
    if (voice.status === 'connected') return 'Voice agent ready — ask your question.';
    if (voice.status === 'error') return 'Voice unavailable right now — switching back to text.';
    return 'Retrieving voice agent...';
  }, [voiceMode, voice.status, mode]);

  const rawHeroStatement = useMemo(() => {
    if (!voiceMode) return latestAssistantMessage?.content;

    const latestVoiceText = latestVoiceAssistant?.text?.trim();
    return latestVoiceText;
  }, [voiceMode, latestVoiceAssistant?.text, latestAssistantMessage?.content]);
  const heroStatement = useMemo(
    () => buildHeroHeadline(rawHeroStatement, voiceLoadingText, {
      preserveFullLead: voiceMode || mode === 'appraisal',
      maxChars: voiceMode ? 280 : mode === 'appraisal' ? 260 : 190,
    }),
    [rawHeroStatement, voiceLoadingText, voiceMode, mode],
  );
  const heroMessageKey = useMemo(
    () => (voiceMode
      ? `voice-${mode}-${latestVoiceAssistant?.timestamp ?? 'seed'}`
      : `text-${mode}-${latestAssistantMessage?.id ?? 'seed'}`),
    [voiceMode, mode, latestVoiceAssistant?.timestamp, latestAssistantMessage?.id],
  );
  const isOpsMode = mode === 'ops';
  const forceGeneralIntroTypewriter = useMemo(
    () => (
      mode === 'general'
      && !voiceMode
      && Boolean(latestAssistantMessage?.isWelcome)
      && !hasPlayedGeneralIntroTypewriterRef.current
    ),
    [mode, voiceMode, latestAssistantMessage?.isWelcome],
  );
  const shouldTypewriter = useMemo(
    () => forceGeneralIntroTypewriter || (!isOpsMode && heroStatement.length <= HERO_TYPEWRITER_MAX_CHARS),
    [forceGeneralIntroTypewriter, isOpsMode, heroStatement.length],
  );
  const [typedHeroLength, setTypedHeroLength] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    if (!open) {
      setTypedHeroLength(0);
      setHeroVisible(false);
      return;
    }

    if (shouldTypewriter) {
      setTypedHeroLength(0);
      setHeroVisible(true);
      return;
    }

    setTypedHeroLength(heroStatement.length);
    setHeroVisible(false);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setHeroVisible(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [heroMessageKey, open, shouldTypewriter, heroStatement.length]);

  useEffect(() => {
    if (!shouldTypewriter) return;
    if (!open) return;
    if (!heroStatement) return;

    if (typedHeroLength > heroStatement.length) {
      setTypedHeroLength(heroStatement.length);
      return;
    }

    if (typedHeroLength >= heroStatement.length) return;

    const remaining = heroStatement.length - typedHeroLength;
    const progress = heroStatement.length > 0 ? typedHeroLength / heroStatement.length : 1;
    const dynamicDelay = forceGeneralIntroTypewriter
      ? 3
      : remaining <= 12
        ? 20
        : progress < 0.45
          ? 8
          : progress < 0.85
            ? 11
            : 15;
    const stepSize = forceGeneralIntroTypewriter ? 2 : 1;

    const timeoutId = window.setTimeout(() => {
      setTypedHeroLength((current) => Math.min(current + stepSize, heroStatement.length));
    }, dynamicDelay);

    return () => window.clearTimeout(timeoutId);
  }, [heroStatement, typedHeroLength, open, shouldTypewriter, forceGeneralIntroTypewriter]);

  useEffect(() => {
    if (!forceGeneralIntroTypewriter) return;
    if (!open) return;
    if (!heroStatement) return;
    if (typedHeroLength < heroStatement.length) return;

    hasPlayedGeneralIntroTypewriterRef.current = true;
  }, [forceGeneralIntroTypewriter, open, heroStatement, typedHeroLength]);

  const visibleHeroStatement = useMemo(
    () => (shouldTypewriter ? heroStatement.slice(0, typedHeroLength) : heroStatement),
    [heroStatement, typedHeroLength, shouldTypewriter],
  );
  const inventoryHighlights = useMemo(
    () => extractInventoryHighlights(latestAssistantMessage?.content),
    [latestAssistantMessage?.content],
  );
  const typedHeroTokens = useMemo(() => {
    if (isOpsMode) {
      return [
        <span key="ops-hero" className="text-white">
          {visibleHeroStatement}
        </span>,
      ];
    }

    let wordIndex = 0;
    return visibleHeroStatement.split(/(\s+)/).map((token, index) => {
      if (!token) return null;
      if (/^\s+$/.test(token)) {
        return <span key={`space-${index}`}>{token}</span>;
      }

      const colorClass = HERO_WORD_COLORS[wordIndex % HERO_WORD_COLORS.length];
      wordIndex += 1;
      return (
        <span key={`word-${index}`} className={colorClass}>
          {token}
        </span>
      );
    });
  }, [visibleHeroStatement, isOpsMode]);

  const heroLength = visibleHeroStatement.length;
  const heroScale = useMemo(() => {
    const maxSizeRem = 4.8;
    const minSizeRem = 1.1;
    const shrinkStart = 42;
    const shrinkRange = 210;
    const ratio = Math.min(1, Math.max(0, (heroLength - shrinkStart) / shrinkRange));
    const sizeRem = maxSizeRem - (maxSizeRem - minSizeRem) * ratio;
    const lineHeight = 1.08 + 0.14 * ratio;

    return {
      fontSize: `clamp(1.4rem, ${Math.max(2.4, 7.2 - ratio * 3.2)}vw, ${sizeRem.toFixed(2)}rem)`,
      lineHeight: Number(lineHeight.toFixed(2)),
      transition: 'font-size 180ms ease, line-height 180ms ease',
    } as const;
  }, [heroLength]);

  const showTextInput = mode !== 'appraisal';
  const showQuickReplies = mode !== 'appraisal' && currentMessages.length <= 2 && !isStreaming;
  const isDynamicFormActive = Boolean(activeForm) && mode !== 'appraisal';
  const heroTextStyle = isDynamicFormActive
    ? {
        ...heroScale,
        fontSize: 'clamp(1.2rem, 4.2vw, 2.8rem)',
        lineHeight: 1.18,
      }
    : isOpsMode
      ? {
          ...heroScale,
          fontSize: 'clamp(1.55rem, 4.9vw, 5.3rem)',
          lineHeight: 1.06,
        }
      : heroScale;
  const heroOpacityTransition = shouldTypewriter ? 'opacity 180ms ease' : 'opacity 320ms ease';

  const toggleVoiceMode = useCallback(async () => {
    if (mode === 'appraisal') return;

    if (voiceMode) {
      voice.disconnect();
      mergeVoiceTranscriptsIntoChat();
      setVoiceMode(false);
      return;
    }

    voice.clearTranscripts();
    setVoiceMode(true);
    await voice.connect({
      mode,
      conversationId: conversationIds[mode],
      pagePath: pathname,
      roleHint: autoMode === 'ops' ? 'staff_or_owner' : 'customer',
      history: currentMessages
        .slice(-8)
        .map((msg) => ({ role: msg.role, content: msg.content })),
    });
  }, [mode, voiceMode, voice, mergeVoiceTranscriptsIntoChat, conversationIds, pathname, autoMode, currentMessages]);

  useEffect(() => {
    const requestedMode = searchParams.get('heroMode');
    const requestedOpen = searchParams.get('heroOpen');

    if (pathname !== '/' || requestedMode !== 'voice' || requestedOpen !== '1') {
      handledAutoVoiceRequestRef.current = null;
      return;
    }

    const requestKey = `${pathname}|${requestedMode}|${requestedOpen}`;
    if (handledAutoVoiceRequestRef.current === requestKey) return;
    if (voiceMode || voice.status === 'connecting' || voice.status === 'connected') return;

    handledAutoVoiceRequestRef.current = requestKey;
    void toggleVoiceMode();
  }, [pathname, searchParams, voiceMode, voice.status, toggleVoiceMode]);

  useEffect(() => {
    if (voiceMode && voice.status === 'error') {
      setVoiceMode(false);
      mergeVoiceTranscriptsIntoChat();
    }
  }, [voiceMode, voice.status, mergeVoiceTranscriptsIntoChat]);

  /* ── Disconnect voice when dialog closes or page navigates ── */
  useEffect(() => {
    if (voiceMode && !open) {
      console.log('[ChatWidget] Dialog closed while voice active—disconnecting');
      voice.disconnect();
      setVoiceMode(false);
    }
  }, [open, voiceMode, voice]);

  useEffect(() => {
    if (voiceMode) {
      console.log('[ChatWidget] Page navigation detected while voice active—disconnecting');
      voice.disconnect();
      setVoiceMode(false);
    }
  }, [pathname, voiceMode, voice]);

  if (shouldHide) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      modal
    >
      <DialogTrigger asChild>
        <motion.button
          type="button"
          className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center overflow-visible rounded-full border border-vault-gold/35 bg-vault-black/90 shadow-[0_0_22px_rgba(230,0,0,0.75),0_0_50px_rgba(204,0,0,0.5),0_10px_34px_rgba(0,0,0,0.55)]"
          aria-label="Open hero chat"
          onClick={() => {
            if (pathname === '/') {
              setMode('general');
            }
          }}
          animate={{ y: [0, -8, 0], x: [0, -4, 0], rotate: [0, -2, 0, 2, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="absolute rounded-full pointer-events-none -inset-4 bg-vault-red/75 blur-2xl"
            animate={{ opacity: [0.55, 0.95, 0.55], scale: [0.96, 1.12, 0.96] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="absolute border rounded-full pointer-events-none -inset-2 border-vault-red/60"
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="absolute inset-0 border rounded-full border-vault-gold/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.05, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Image
            src="/images/logo-symbol.png"
            alt="Open Merrill Vault Assistant"
            width={34}
            height={34}
            className="relative z-10 object-contain h-9 w-9"
          />
        </motion.button>
      </DialogTrigger>

      <DialogContent
        className="chat-widget-surface fixed inset-0 z-50 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-none bg-vault-surface-elevated p-0 text-vault-text-light data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-[100%] data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-[100%] sm:bottom-6 sm:left-auto sm:right-6 sm:top-auto sm:h-[85vh] sm:w-[440px] sm:rounded-2xl sm:border sm:border-vault-border-accent sm:data-[state=closed]:slide-out-to-left-0 sm:data-[state=closed]:slide-out-to-top-[100%] sm:data-[state=open]:slide-in-from-left-0 sm:data-[state=open]:slide-in-from-top-[100%] [&>button]:hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/images/merril_vault.png"
            alt="Merrill Vault Assistant background"
            fill
            sizes="100vw"
            className={`object-cover object-center opacity-35 transition-all duration-300 ${
              isDynamicFormActive ? 'scale-105 blur-md' : 'scale-100 blur-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#11284A]/88 via-[#0D2241]/90 to-[#08172F]/94 dark:from-[#0B1426]/84 dark:via-[#0B1426]/88 dark:to-[#0B1426]/94" />
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${isDynamicFormActive ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-0 bg-vault-black/65" />
            <div
              className="absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(255,255,255,0.08) 0.7px, transparent 0.7px), radial-gradient(rgba(0,0,0,0.16) 0.8px, transparent 0.8px)',
                backgroundPosition: '0 0, 1.5px 1.5px',
                backgroundSize: '3px 3px, 4px 4px',
              }}
            />
          </div>
        </div>

        <DialogHeader className="relative z-10 px-4 py-3 text-left border-b border-vault-border-accent bg-vault-black/55 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-display text-vault-text-light">{CHAT_NAME}</DialogTitle>
              <DialogDescription className="text-xs font-body text-vault-text-muted">
                {voiceMode
                  ? (voice.status === 'connecting'
                    ? 'Retrieving voice agent...'
                    : 'Voice session active — seamless context enabled')
                  : MODE_META[mode].subtitle}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              {mode !== 'appraisal' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoiceMode}
                  className={`h-8 w-8 ${voiceMode ? 'text-vault-gold' : 'text-vault-text-light'} hover:bg-vault-surface`}
                  aria-label={voiceMode ? 'Switch to text mode' : 'Switch to voice mode'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0M12 18v3m-4 0h8" />
                  </svg>
                </Button>
              )}
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-vault-text-light hover:bg-vault-surface"
                  onClick={() => {
                    if (voiceMode) {
                      voice.disconnect();
                      mergeVoiceTranscriptsIntoChat();
                      setVoiceMode(false);
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </DialogClose>
            </div>
          </div>

          <div
            className="grid gap-1 p-1 mt-3 border rounded-lg border-vault-border bg-vault-surface/80 backdrop-blur-sm"
            style={{ gridTemplateColumns: `repeat(${visibleModes.length}, minmax(0, 1fr))` }}
          >
            {visibleModes.map((modeOption) => {
              return (
                <Button
                  key={modeOption}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(modeOption)}
                  className={`h-8 rounded-md text-xs font-semibold ${
                    mode === modeOption
                      ? 'bg-vault-red text-white hover:bg-vault-red'
                      : 'text-vault-text-muted hover:bg-vault-surface-elevated hover:text-vault-text-light'
                  }`}
                >
                  <span className="mr-1">{MODE_META[modeOption].icon}</span>
                  {MODE_META[modeOption].label}
                </Button>
              );
            })}
          </div>

          {mode === 'appraisal' && (
            <div className="p-3 mt-3 border rounded-lg border-vault-border bg-vault-surface/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-wide uppercase text-vault-text-muted">
                  Guided Progress
                </p>
                <p className="text-xs text-vault-text-light">{Math.round(appraisalProgress)}%</p>
              </div>
              <Progress value={appraisalProgress} className="h-2 bg-vault-black" />
            </div>
          )}
        </DialogHeader>

        <div className={`relative z-10 flex-1 overflow-hidden ${isAppraisalResultView ? 'px-2 py-2 sm:px-4 sm:py-4' : 'px-5 py-6 md:px-10 md:py-10'}`}>
          {isAppraisalResultView && (
            <div className="absolute inset-0 pointer-events-none bg-vault-black/68 backdrop-blur-2xl" />
          )}
          {!isAppraisalResultView && (
            <>
              <motion.div
                className="absolute left-[8%] top-[12%] h-64 w-64 rounded-full bg-vault-gold/16 blur-3xl"
                animate={{ x: [0, 30, -10, 0], y: [0, -20, 25, 0], scale: [1, 1.05, 0.96, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute right-[10%] top-[26%] h-72 w-72 rounded-full bg-[#4A90D9]/18 blur-3xl"
                animate={{ x: [0, -35, 15, 0], y: [0, 18, -20, 0], scale: [1, 0.96, 1.08, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute bottom-[14%] left-1/2 h-48 w-[60%] -translate-x-1/2 rounded-full bg-vault-red/10 blur-3xl"
                animate={{ opacity: [0.18, 0.33, 0.18] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </>
          )}

          <div className="relative flex flex-col h-full text-center">
            {isAppraisalResultView ? (
              <div className="mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-2xl border border-vault-gold/35 bg-gradient-to-b from-vault-surface-elevated/95 via-vault-surface/95 to-vault-black/90 p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.48)] sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vault-gold">AI Appraisal Result</p>
                    <h3 className="mt-2 text-2xl font-bold leading-tight font-display text-vault-text-light sm:text-3xl">Appraisal complete. Your result card</h3>
                  </div>
                  <span className="rounded-full bg-vault-success/20 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide text-vault-success">Completed</span>
                </div>

                <Tabs defaultValue="summary" className="w-full mt-1">
                  <TabsList className="grid w-full h-auto grid-cols-2 p-1 bg-vault-black/35">
                    <TabsTrigger
                      value="summary"
                      className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-vault-text-muted data-[state=active]:bg-vault-red data-[state=active]:text-white"
                    >
                      Summary
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-vault-text-muted data-[state=active]:bg-vault-red data-[state=active]:text-white"
                    >
                      Appraisal Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-3">
                    <div className="p-4 border rounded-xl border-vault-border bg-vault-black/35">
                      <p className="text-xs uppercase tracking-[0.12em] text-vault-text-muted">Estimated Range</p>
                      <p className="mt-2 font-mono text-4xl font-bold text-vault-gold sm:text-5xl">${appraisal.result?.valueRange ?? 'N/A'}</p>
                      <p className="mt-2 text-sm text-vault-text-muted">Midpoint estimate: <span className="font-mono text-base font-semibold text-vault-text-light">${appraisal.result?.estimatedValue?.toLocaleString?.() ?? 'N/A'}</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="p-3 border rounded-lg border-vault-border bg-vault-surface/65">
                        <p className="text-[10px] uppercase tracking-wide text-vault-text-muted">Category</p>
                        <p className="mt-1 text-sm font-semibold text-vault-text-light sm:text-base">{appraisal.category}</p>
                      </div>
                      <div className="p-3 border rounded-lg border-vault-border bg-vault-surface/65">
                        <p className="text-[10px] uppercase tracking-wide text-vault-text-muted">Photos Used</p>
                        <p className="mt-1 text-sm font-semibold text-vault-text-light sm:text-base">{appraisal.photos.length}</p>
                      </div>
                    </div>

                    {appraisal.result?.nextSteps && (
                      <div className="p-3 border rounded-lg border-vault-red/25 bg-vault-red/10">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-vault-red font-semibold">Next Step</p>
                        <p className="mt-1 text-sm leading-relaxed text-vault-text-light sm:text-base">{appraisal.result.nextSteps}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes">
                    <div className="p-4 border rounded-xl border-vault-border bg-vault-surface/55">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-vault-gold">Appraisal Notes</p>
                      <p className="text-sm leading-7 whitespace-pre-wrap text-vault-text-light/95 sm:text-base">
                        {appraisal.result?.explanation ?? 'No additional notes available.'}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <p className="mt-3 text-center text-[11px] leading-relaxed text-vault-text-muted sm:text-xs">
                  AI appraisal estimates are guidance only and all offers are subject to in-store inspection and USA Pawn Holdings discretion.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 sm:gap-3">
                  <Button
                    variant="outline"
                    className="w-full border-vault-gold/40 bg-vault-surface/75 text-vault-text-light hover:bg-vault-surface-elevated"
                    onClick={handleScheduleFromAppraisal}
                  >
                    Schedule
                  </Button>
                  <Button className="w-full text-white bg-vault-red hover:bg-vault-red-hover" onClick={resetAppraisalFlow}>
                    Start New Appraisal
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`flex min-h-0 flex-1 flex-col items-center pb-5 ${
                    isDynamicFormActive ? 'justify-start pt-2' : 'justify-center'
                  }`}
                >
                  <p className="mb-4 text-xs font-mono uppercase tracking-[0.32em] text-vault-gold/85">
                    {mode === 'appraisal' ? 'Guided Appraisal Surface' : mode === 'ops' ? 'Operations Messaging Surface' : 'Agent Messaging Surface'}
                  </p>

                  <div className="w-full max-w-6xl rounded-2xl bg-vault-black/38 px-4 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md md:px-6 md:py-5">
                    <h2
                      className={`text-balance font-display font-black drop-shadow-[0_12px_28px_rgba(0,0,0,0.9)] ${
                        isDynamicFormActive ? 'line-clamp-2 whitespace-normal' : 'whitespace-pre-wrap'
                      }`}
                      style={{
                        ...heroTextStyle,
                        opacity: heroVisible ? 1 : 0,
                        paddingTop: '0.06em',
                        transition: `${heroTextStyle.transition}, ${heroOpacityTransition}`,
                      }}
                    >
                      {typedHeroTokens}
                      {shouldTypewriter && <span aria-hidden="true" className="hero-typewriter-caret" />}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col items-center w-full gap-4 pb-3 mt-auto">
                  {latestVisualImageUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="overflow-hidden rounded-xl border border-vault-gold/30 bg-vault-black/50 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.4)]"
                    >
                      <button
                        type="button"
                        onClick={handleLatestVisualImageClick}
                        disabled={voiceMode}
                        className="relative block w-64 h-36 sm:h-44 sm:w-80 disabled:cursor-default"
                        aria-label="Open product card"
                      >
                        <Image
                          src={latestVisualImageUrl}
                          alt="Inventory result"
                          fill
                          unoptimized
                          className="object-cover rounded-lg"
                        />
                      </button>
                    </motion.div>
                  )}

                  {!voiceMode && latestVisualImageUrl && (
                    <p className="text-[11px] uppercase tracking-[0.12em] text-vault-text-muted">
                      {isResolvingProductCard
                        ? 'Loading product card...'
                        : productCardError || 'Tap image for full product card'}
                    </p>
                  )}

                  {latestUserMessage?.content && (
                    <p className="max-w-2xl text-sm text-vault-text-muted">
                      You said: {latestUserMessage.content}
                    </p>
                  )}

                  {!voiceMode && mode === 'general' && inventoryHighlights.length > 0 && (
                    <div className="w-full max-w-3xl px-4 py-3 text-left border rounded-xl border-vault-gold/25 bg-vault-black/45 backdrop-blur-sm">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-vault-gold/90">
                        Top Matches
                      </p>
                      <div className="space-y-1.5">
                        {inventoryHighlights.map((entry, index) => (
                          <p key={`${entry}-${index}`} className="text-xs text-vault-text-light/95">
                            {entry}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {isStreaming && (
                    <div className="flex items-center gap-2 rounded-full border border-vault-gold/35 bg-vault-black/45 px-4 py-2 text-xs text-vault-text-light backdrop-blur-sm shadow-[0_0_35px_rgba(201,168,76,0.22)]">
                      <span className="w-2 h-2 rounded-full animate-bounce bg-vault-gold" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce bg-vault-gold" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce bg-vault-gold" style={{ animationDelay: '300ms' }} />
                      <span className="ml-1 uppercase tracking-[0.14em]">Agent composing</span>
                    </div>
                  )}

                  {voiceMode && (
                    <div className="rounded-full border border-vault-gold/30 bg-vault-black/45 px-4 py-2 text-xs uppercase tracking-[0.14em] text-vault-text-light backdrop-blur-sm">
                      {voice.status === 'connecting'
                        ? 'Connecting voice'
                        : voice.isUserSpeaking
                          ? 'Listening'
                          : voice.isSpeaking
                            ? 'Assistant speaking'
                            : 'Voice ready'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {mode === 'appraisal' && !isAppraisalResultView && (
          <div className="relative z-10 p-4 border-t border-vault-border-accent bg-vault-black/65 backdrop-blur-sm">
            {appraisal.step === 1 && (
              <div className="space-y-3">
                <Label className="text-xs tracking-wide uppercase text-vault-text-muted">Item Category</Label>
                <Select
                  value={appraisal.category}
                  onValueChange={(value) => setAppraisal((prev) => ({ ...prev, category: value, lastError: '' }))}
                >
                  <SelectTrigger className="border-vault-input-border bg-vault-input-bg text-vault-text-light">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="border-vault-border bg-vault-surface text-vault-text-light">
                    {APPRAISAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full text-white bg-vault-red hover:bg-vault-red-hover"
                  onClick={() => {
                    if (!appraisal.category) {
                      setAppraisal((prev) => ({ ...prev, lastError: 'Please choose a category first.' }));
                      return;
                    }
                    moveAppraisalStep(2);
                  }}
                >
                  Continue
                </Button>
              </div>
            )}

            {appraisal.step === 2 && (
              <div className="space-y-3">
                <Label className="text-xs tracking-wide uppercase text-vault-text-muted">Description</Label>
                <Textarea
                  value={appraisal.description}
                  onChange={(event) => setAppraisal((prev) => ({ ...prev, description: event.target.value, lastError: '' }))}
                  placeholder="Example: 14k gold rope chain, 22 inches, light wear, no broken links"
                  className="min-h-20 border-vault-input-border bg-vault-input-bg text-vault-text-light placeholder:text-vault-text-muted"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="border-vault-border text-vault-text-light" onClick={() => moveAppraisalStep(1)}>
                    Back
                  </Button>
                  <Button className="text-white bg-vault-red hover:bg-vault-red-hover" onClick={() => moveAppraisalStep(3)}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {appraisal.step === 3 && (
              <div className="space-y-3">
                <Label className="text-xs tracking-wide uppercase text-vault-text-muted">Upload Photos (up to 6)</Label>
                <input
                  ref={appraisalImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    addAppraisalPhotos(event.target.files);
                    event.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full border-vault-border bg-vault-surface text-vault-text-light hover:bg-vault-surface-elevated"
                  onClick={() => appraisalImageInputRef.current?.click()}
                >
                  Add Photos
                </Button>
                {appraisal.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {appraisal.photos.map((photo, index) => (
                      <div key={photo.id} className="relative p-1 border rounded-md border-vault-border bg-vault-surface">
                        <Image
                          src={photo.preview}
                          alt={photo.label}
                          width={320}
                          height={80}
                          unoptimized
                          className="object-cover w-full h-20 rounded"
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded bg-vault-black/70 px-1.5 text-xs text-white"
                          onClick={() => {
                            setAppraisal((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((candidate) => candidate.id !== photo.id),
                            }));
                          }}
                        >
                          ×
                        </button>
                        <p className="mt-1 truncate text-[10px] text-vault-text-muted">{PHOTO_LABELS[index] ?? photo.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="border-vault-border text-vault-text-light" onClick={() => moveAppraisalStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="text-white bg-vault-red hover:bg-vault-red-hover"
                    onClick={() => {
                      if (appraisal.photos.length === 0) {
                        setAppraisal((prev) => ({ ...prev, lastError: 'Upload at least one photo to continue.' }));
                        return;
                      }
                      moveAppraisalStep(4);
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {appraisal.step === 4 && (
              <div className="space-y-3 text-sm">
                <div className="p-3 border rounded-lg border-vault-border bg-vault-surface">
                  <p><span className="text-vault-text-muted">Category:</span> {appraisal.category}</p>
                  <p><span className="text-vault-text-muted">Photos:</span> {appraisal.photos.length}</p>
                  <p className="mt-1 line-clamp-3 text-vault-text-muted">
                    {appraisal.description || 'No description provided'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="border-vault-border text-vault-text-light" onClick={() => moveAppraisalStep(3)}>
                    Back
                  </Button>
                  <Button
                    className="text-white bg-vault-red hover:bg-vault-red-hover"
                    disabled={appraisal.submitting}
                    onClick={submitGuidedAppraisal}
                  >
                    {appraisal.submitting ? 'Analyzing…' : 'Submit Appraisal'}
                  </Button>
                </div>
              </div>
            )}

            {appraisal.lastError && (
              <p className="mt-3 text-xs text-vault-danger">{appraisal.lastError}</p>
            )}
          </div>
        )}

        {activeForm && mode !== 'appraisal' && (
          <DynamicFormPanel
            formSpec={activeForm}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setActiveForm(null);
              voice.clearActiveForm();
            }}
          />
        )}

        {showQuickReplies && !voiceMode && (
          <div className="relative z-10 flex flex-wrap gap-2 px-4 py-2 border-t border-vault-border bg-vault-surface/70 backdrop-blur-sm">
            {QUICK_REPLIES[mode].map((reply) => (
              <Button
                key={reply}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto rounded-full border-vault-border bg-vault-surface px-3 py-1.5 text-xs text-vault-text-light hover:bg-vault-red/20"
                onClick={() => {
                  if (reply === 'Browse Inventory') {
                    setOpen(false);
                    router.push('/inventory');
                    return;
                  }
                  sendChatMessage(reply);
                }}
              >
                {reply}
              </Button>
            ))}
          </div>
        )}

        {showTextInput && !voiceMode && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendChatMessage(input);
            }}
            className="relative z-10 flex items-end gap-2 p-3 border-t border-vault-border-accent bg-vault-surface-elevated/85 backdrop-blur-sm"
          >
            <input
              ref={quickImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQuickImageUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-lg bg-vault-surface text-vault-text-light hover:bg-vault-red/20"
              onClick={() => quickImageInputRef.current?.click()}
              disabled={isStreaming}
              aria-label="Upload image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </Button>

            <Input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === 'ops' ? 'Ask an operations question…' : 'Ask a question…'}
              disabled={isStreaming}
              className="flex-1 border-vault-input-border bg-vault-input-bg text-vault-text-light placeholder:text-vault-text-muted"
            />

            <Button
              type="submit"
              size="icon"
              disabled={isStreaming || !input.trim()}
              className="w-10 h-10 text-white rounded-lg bg-vault-red hover:bg-vault-red-hover"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </form>
        )}
      </DialogContent>

      <ProductCardDialog
        open={Boolean(selectedProductCard)}
        onOpenChange={(openState) => {
          if (!openState) setSelectedProductCard(null);
        }}
        product={selectedProductCard}
      />
    </Dialog>
  );
}
