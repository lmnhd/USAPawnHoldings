'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IconRobot,
  IconDiamond,
  IconWand,
  IconShieldCheck,
  IconSpeakerphone,
  IconAdjustments,
  IconDeviceFloppy,
  IconRefresh,
  IconEye,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconPhone,
} from '@tabler/icons-react';

/* ──────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────── */
interface AgentConfigValue {
  value: string;
  updated_at: string;
  updated_by?: string;
}

type AgentConfig = Record<string, AgentConfigValue>;

/* ──────────────────────────────────────────────────────
   Default System Prompts (read-only reference)
   ────────────────────────────────────────────────────── */
const DEFAULT_CHAT_PROMPT = `You are the AI assistant for USA Pawn Holdings in Jacksonville, FL.

CONVERSATION STYLE (CRITICAL):
- Keep every response SHORT: max 1-2 sentences
- Sound like you're texting a friend, not a guide
- Be warm and conversational, not formal
- Use natural language (contractions OK, casual tone)
- Only give detailed info if they ask for it
- Light humor/puns are fine but don't force it

PHOTO APPRAISAL IN CHAT:
- This chat widget supports ONE photo upload only
- When user uploads a photo, give a quick estimate based on what you see + current spot prices
- For DETAILED multi-photo appraisals, direct them to /appraise page
- Never ask for more photos in this chat — instead offer: quick estimate now OR full appraisal on /appraise

Store Info:
- Address: 6132 Merrill Rd Ste 1, Jacksonville, FL 32277
- Phone: (904) 744-5611
- Hours: Mon-Fri 9 AM - 6 PM, Sat 9 AM - 5 PM, Sun Closed

What You Can Do:
- Quick photo appraisals (one photo)
- Schedule in-store visits
- Check inventory
- Loan info (25% interest, 30 days, usually 25-33% of resale value)
- Spot prices (gold/silver/platinum)

Rules:
- ALWAYS use function tools when applicable
- NEVER invent prices — use spot price API + weight estimate
- Escalate items >$500 to staff
- Be upfront about loan terms
- If user wants multi-photo appraisal, point them to /appraise`;

const DEFAULT_APPRAISAL_PROMPT = `You are an expert appraiser for USA Pawn Holdings. Analyze items from photos for pawn shop appraisal.

For each item, identify:
- Item type, brand/model
- Condition (excellent/good/fair/poor)
- Approximate weight (if jewelry/precious metal)
- Materials and construction quality
- Retail value estimate range

Be specific and thorough. When uncertain, state your confidence level.
Always consider current market conditions and resale potential.`;

const DEFAULT_VOICE_ADDENDUM = `VOICE CHANNEL INSTRUCTIONS (you are on a phone call, not text chat):
- You are answering the phone. Speak naturally as if having a real conversation.
- Keep responses SHORT — 1-2 sentences max. Long monologues are painful on the phone.
- Do NOT reference web links, URLs, or "/appraise" pages — the caller can't click.
- Instead, say "text a photo of the item to this number" for appraisals.
- If someone wants to schedule a visit, take their name and preferred day/time.
- If asked about something you can't help with, offer to take a message (name + number).

GREETING (first thing you say):
"Thanks for calling USA Pawn Holdings! We're currently closed, but I'm the after-hours AI assistant and I'd be happy to help. What can I do for you?"

CLOSING:
When wrapping up, say: "Thanks for calling! Remember, you can text a photo of any item to this number for an instant estimate. Have a great night!"`;

/* ──────────────────────────────────────────────────────
   Section Components
   ────────────────────────────────────────────────────── */

function ConfigTextarea({
  label,
  description,
  value,
  onChange,
  placeholder,
  rows = 4,
  mono = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-vault-text-light font-body">{label}</label>
        <span className="text-[10px] font-mono text-vault-text-muted uppercase tracking-wider">
          {value.length > 0 ? `${value.length} chars` : 'empty'}
        </span>
      </div>
      <p className="text-xs text-vault-text-muted font-body leading-relaxed">{description}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-lg border border-vault-input-border bg-vault-input-bg px-4 py-3 text-sm text-vault-text-light placeholder:text-vault-text-muted/50 focus:outline-none focus:ring-2 focus:ring-vault-gold/40 focus:border-vault-gold/50 transition-all resize-y ${
          mono ? 'font-mono text-xs leading-relaxed' : 'font-body'
        }`}
      />
    </div>
  );
}

function ConfigSelect({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; description?: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-vault-text-light font-body">{label}</label>
      <p className="text-xs text-vault-text-muted font-body leading-relaxed">{description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`group relative rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
              value === opt.value
                ? 'border-vault-gold bg-vault-gold/10 ring-1 ring-vault-gold/30'
                : 'border-vault-input-border bg-vault-input-bg hover:border-vault-gold/30 hover:bg-vault-hover-overlay'
            }`}
          >
            <span
              className={`text-xs font-semibold block ${
                value === opt.value ? 'text-vault-gold' : 'text-vault-text-light'
              }`}
            >
              {opt.label}
            </span>
            {opt.description && (
              <span className="text-[10px] text-vault-text-muted mt-0.5 block">{opt.description}</span>
            )}
            {value === opt.value && (
              <motion.div
                layoutId="config-select-indicator"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-vault-gold flex items-center justify-center"
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              >
                <IconCheck className="w-2.5 h-2.5 text-white" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function DefaultPromptViewer({
  title,
  prompt,
  isOverridden,
}: {
  title: string;
  prompt: string;
  isOverridden: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-vault-border bg-vault-surface/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-vault-hover-overlay transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconEye className="w-4 h-4 text-vault-text-muted" />
          <span className="text-xs font-semibold text-vault-text-muted font-body">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverridden && (
            <Badge className="bg-vault-warning/15 text-vault-warning border-vault-warning/30 text-[10px] px-1.5 py-0">
              Overridden
            </Badge>
          )}
          <span className="text-[10px] text-vault-text-muted">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Separator className="bg-vault-border" />
            <pre className="px-4 py-3 text-[11px] font-mono text-vault-text-muted leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {prompt}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Main AgentConfigPanel
   ────────────────────────────────────────────────────── */
export default function AgentConfigPanel() {
  const [config, setConfig] = useState<AgentConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Track local edits
  const [edits, setEdits] = useState<Record<string, string>>({});

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent-config');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfig(data.config ?? {});
      setEdits({});
      setDirty(false);
    } catch (err) {
      console.error('Failed to fetch agent config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Get the current value (edit override or config)
  const getValue = (key: string): string => {
    if (key in edits) return edits[key];
    return config[key]?.value ?? '';
  };

  // Set a local edit
  const setValue = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveStatus('idle');
  };

  // Save all edits
  const handleSave = async () => {
    if (!dirty || Object.keys(edits).length === 0) return;

    setSaving(true);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: edits }),
      });

      if (!res.ok) throw new Error('Save failed');

      const data = await res.json();
      setLastSaved(data.updated_at);
      setSaveStatus('success');
      setDirty(false);

      // Refresh config
      await fetchConfig();

      // Clear success after 3s
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Reset local edits
  const handleReset = () => {
    setEdits({});
    setDirty(false);
    setSaveStatus('idle');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <IconRobot className="w-8 h-8 text-vault-gold/50" />
        </motion.div>
        <span className="ml-3 text-sm text-vault-text-muted font-body">Loading agent configuration…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Save Bar ─── */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="sticky top-0 z-20 flex items-center justify-between rounded-xl border border-vault-warning/30 bg-vault-surface-elevated/95 backdrop-blur-md px-5 py-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="w-4 h-4 text-vault-warning" />
              <span className="text-sm text-vault-warning font-semibold font-body">
                Unsaved changes
              </span>
              <span className="text-xs text-vault-text-muted font-mono">
                ({Object.keys(edits).length} field{Object.keys(edits).length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-vault-border px-3 py-1.5 text-xs font-semibold text-vault-text-muted hover:bg-vault-hover-overlay transition-colors font-body"
              >
                <IconRefresh className="w-3.5 h-3.5" />
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-vault-gold px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 font-body"
              >
                <IconDeviceFloppy className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save All Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save Status ─── */}
      <AnimatePresence>
        {saveStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg border border-vault-success/30 bg-vault-success/10 px-4 py-2.5"
          >
            <IconCheck className="w-4 h-4 text-vault-success" />
            <span className="text-sm text-vault-success font-semibold font-body">
              Configuration saved successfully
            </span>
            {lastSaved && (
              <span className="text-[10px] text-vault-text-muted font-mono ml-auto">
                {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
          </motion.div>
        )}
        {saveStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg border border-vault-danger/30 bg-vault-danger/10 px-4 py-2.5"
          >
            <IconAlertTriangle className="w-4 h-4 text-vault-danger" />
            <span className="text-sm text-vault-danger font-semibold font-body">
              Failed to save — please try again
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Agent Tabs ─── */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="w-full bg-vault-surface border border-vault-border rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger
            value="chat"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-vault-gold/15 data-[state=active]:text-vault-gold data-[state=active]:border-vault-gold/30 data-[state=active]:border data-[state=active]:shadow-sm text-vault-text-muted font-body transition-all"
          >
            <IconRobot className="w-4 h-4" />
            Chat Agent
          </TabsTrigger>
          <TabsTrigger
            value="appraisal"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-vault-gold/15 data-[state=active]:text-vault-gold data-[state=active]:border-vault-gold/30 data-[state=active]:border data-[state=active]:shadow-sm text-vault-text-muted font-body transition-all"
          >
            <IconDiamond className="w-4 h-4" />
            Appraisal Agent
          </TabsTrigger>
          <TabsTrigger
            value="voice"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-vault-gold/15 data-[state=active]:text-vault-gold data-[state=active]:border-vault-gold/30 data-[state=active]:border data-[state=active]:shadow-sm text-vault-text-muted font-body transition-all"
          >
            <IconPhone className="w-4 h-4" />
            Voice Agent
          </TabsTrigger>
        </TabsList>

        {/* ━━━━━━━━━━ Chat Agent ━━━━━━━━━━ */}
        <TabsContent value="chat" className="mt-6 space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-vault-gold/20 bg-vault-gold/5 px-4 py-3">
            <IconInfoCircle className="w-5 h-5 text-vault-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-vault-text-light font-semibold font-body">Chat Agent Configuration</p>
              <p className="text-xs text-vault-text-muted font-body mt-0.5 leading-relaxed">
                These settings control how the AI chat assistant behaves on the website and via SMS.
                Custom instructions are <strong className="text-vault-text-light">appended</strong> to the default system prompt unless you provide a full override.
              </p>
            </div>
          </div>

          {/* Default Prompt Viewer */}
          <DefaultPromptViewer
            title="View Default System Prompt (read-only)"
            prompt={DEFAULT_CHAT_PROMPT}
            isOverridden={getValue('agent_chat_system_prompt').length > 0}
          />

          {/* Tone & Behavior */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconWand className="w-4 h-4 text-vault-gold" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Tone & Behavior</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigSelect
                label="Conversation Tone"
                description="Sets the overall personality of chat responses."
                value={getValue('agent_chat_tone')}
                onChange={(v) => setValue('agent_chat_tone', v)}
                options={[
                  { value: 'casual', label: 'Casual', description: 'Friendly, texting vibe' },
                  { value: 'professional', label: 'Professional', description: 'Formal, business tone' },
                  { value: 'friendly', label: 'Friendly', description: 'Warm & approachable' },
                  { value: 'firm', label: 'Firm', description: 'Direct & authoritative' },
                ]}
              />

              <ConfigSelect
                label="Response Length"
                description="How wordy should the AI be?"
                value={getValue('agent_chat_max_response_length')}
                onChange={(v) => setValue('agent_chat_max_response_length', v)}
                options={[
                  { value: 'short', label: 'Short', description: '1-2 sentences' },
                  { value: 'medium', label: 'Medium', description: '2-4 sentences' },
                  { value: 'long', label: 'Detailed', description: 'Full explanations' },
                ]}
              />

              <ConfigTextarea
                label="Custom Greeting"
                description="Override the initial greeting when a customer first opens the chat widget. Leave empty for default."
                value={getValue('agent_chat_greeting')}
                onChange={(v) => setValue('agent_chat_greeting', v)}
                placeholder='e.g. "Hey there! 👋 Desiree and the team are here to help. Got something to sell or pawn?"'
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Rules & Restrictions */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconShieldCheck className="w-4 h-4 text-vault-gold" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Rules & Restrictions</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigTextarea
                label="Additional Rules"
                description="Extra instructions the chat agent must follow. These are injected alongside the default rules."
                value={getValue('agent_chat_rules')}
                onChange={(v) => setValue('agent_chat_rules', v)}
                placeholder={'e.g.\n- Never discuss competitor pricing\n- Always mention our Saturday sale\n- Do not give values over the phone for firearms'}
                rows={5}
                mono
              />

              <ConfigTextarea
                label="Escalation Threshold"
                description="Dollar amount above which the AI flags the conversation for staff review."
                value={getValue('agent_chat_escalation_threshold')}
                onChange={(v) => setValue('agent_chat_escalation_threshold', v)}
                placeholder="500"
                rows={1}
              />
            </CardContent>
          </Card>

          {/* Special Info / Announcements */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconSpeakerphone className="w-4 h-4 text-vault-red" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Special Info & Announcements</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigTextarea
                label="Special Information"
                description="Temporary info the AI should know about — promotions, closures, events, seasonal notes. The AI will reference this when relevant."
                value={getValue('agent_chat_special_info')}
                onChange={(v) => setValue('agent_chat_special_info', v)}
                placeholder={'e.g.\n- Running a Valentine\'s Day gold promo: 10% extra on gold jewelry through Feb 16\n- Store closed next Monday for Presidents Day\n- We just got a shipment of DeWalt power tools'}
                rows={5}
                mono
              />
            </CardContent>
          </Card>

          {/* Full System Prompt Override */}
          <Card className="rounded-xl border-vault-danger/20 bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconAdjustments className="w-4 h-4 text-vault-danger" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">
                Advanced: Full Prompt Override
              </CardTitle>
              <Badge className="ml-auto bg-vault-danger/15 text-vault-danger border-vault-danger/30 text-[10px]">
                Expert
              </Badge>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-vault-warning/20 bg-vault-warning/5 px-4 py-3">
                <IconAlertTriangle className="w-4 h-4 text-vault-warning mt-0.5 shrink-0" />
                <p className="text-xs text-vault-text-muted font-body leading-relaxed">
                  This <strong className="text-vault-warning">completely replaces</strong> the default system prompt.
                  Only use this if you know what you&apos;re doing. When set, tone/length/rules above are still appended as supplementary instructions.
                </p>
              </div>

              <ConfigTextarea
                label="System Prompt Override"
                description="Leave empty to use the default prompt. When set, this replaces the entire base prompt."
                value={getValue('agent_chat_system_prompt')}
                onChange={(v) => setValue('agent_chat_system_prompt', v)}
                placeholder="Leave empty to use the default system prompt…"
                rows={10}
                mono
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━━━━━━ Appraisal Agent ━━━━━━━━━━ */}
        <TabsContent value="appraisal" className="mt-6 space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-vault-gold/20 bg-vault-gold/5 px-4 py-3">
            <IconInfoCircle className="w-5 h-5 text-vault-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-vault-text-light font-semibold font-body">Appraisal Agent Configuration</p>
              <p className="text-xs text-vault-text-muted font-body mt-0.5 leading-relaxed">
                These settings control the AI vision model that analyzes photos on the <strong className="text-vault-text-light">/appraise</strong> page.
                Adjustments here affect how conservative or generous appraisal estimates are.
              </p>
            </div>
          </div>

          {/* Default Prompt Viewer */}
          <DefaultPromptViewer
            title="View Default Appraisal Prompt (read-only)"
            prompt={DEFAULT_APPRAISAL_PROMPT}
            isOverridden={getValue('agent_appraisal_system_prompt').length > 0}
          />

          {/* Appraisal Behavior */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconAdjustments className="w-4 h-4 text-vault-gold" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Appraisal Behavior</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigSelect
                label="Pricing Conservatism"
                description="Controls how aggressively the AI estimates pawn value. Conservative = lower offers (safer margins), Generous = higher offers (more competitive)."
                value={getValue('agent_appraisal_conservatism')}
                onChange={(v) => setValue('agent_appraisal_conservatism', v)}
                options={[
                  { value: 'conservative', label: 'Conservative', description: 'Lower, safer offers' },
                  { value: 'moderate', label: 'Moderate', description: 'Balanced estimates' },
                  { value: 'generous', label: 'Generous', description: 'Higher, competitive' },
                ]}
              />

              {/* Haircut */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-vault-text-light font-body">Haircut</label>
                  {Number(getValue('agent_appraisal_haircut') || '0') > 0 && (
                    <Badge className="bg-vault-gold/15 text-vault-gold border-vault-gold/30 text-[10px] px-1.5 py-0">
                      −${Number(getValue('agent_appraisal_haircut')).toLocaleString()} off every quote
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-vault-text-muted font-body leading-relaxed">
                  Subtract a flat dollar amount from every appraisal shown to the customer. Gives you <strong className="text-vault-text-light">breathing room</strong> to negotiate up from the AI quote.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-vault-text-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={getValue('agent_appraisal_haircut') || '0'}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      setValue('agent_appraisal_haircut', String(v));
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-vault-input-border bg-vault-input-bg pl-8 pr-4 py-3 text-sm font-mono text-vault-text-light placeholder:text-vault-text-muted/50 focus:outline-none focus:ring-2 focus:ring-vault-gold/40 focus:border-vault-gold/50 transition-all"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  {[0, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setValue('agent_appraisal_haircut', String(preset))}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-mono font-semibold transition-all ${
                        Number(getValue('agent_appraisal_haircut') || '0') === preset
                          ? 'bg-vault-gold/15 text-vault-gold border border-vault-gold/30'
                          : 'bg-vault-surface text-vault-text-muted border border-vault-border hover:border-vault-gold/30 hover:text-vault-gold'
                      }`}
                    >
                      {preset === 0 ? 'Off' : `−$${preset}`}
                    </button>
                  ))}
                </div>
              </div>

              <ConfigTextarea
                label="Priority Categories"
                description="Comma-separated categories to prioritize. The AI will pay extra attention to these item types."
                value={getValue('agent_appraisal_focus_categories')}
                onChange={(v) => setValue('agent_appraisal_focus_categories', v)}
                placeholder="e.g. Jewelry, Firearms, Electronics, Rolex, Power Tools"
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Rules & Market Notes */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconShieldCheck className="w-4 h-4 text-vault-gold" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Rules & Market Notes</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigTextarea
                label="Appraisal Rules"
                description="Additional guidelines for the Vision AI during photo appraisals."
                value={getValue('agent_appraisal_rules')}
                onChange={(v) => setValue('agent_appraisal_rules', v)}
                placeholder={'e.g.\n- Always ask about hallmarks on gold items\n- Deduct 15% for items without original packaging\n- Firearms must include serial number visibility'}
                rows={5}
                mono
              />

              <ConfigTextarea
                label="Market Notes & Seasonal Info"
                description="Current market conditions, seasonal demand shifts, or special buying priorities."
                value={getValue('agent_appraisal_special_info')}
                onChange={(v) => setValue('agent_appraisal_special_info', v)}
                placeholder={'e.g.\n- Gold spot is volatile this week — be conservative on gold\n- High demand for PlayStation 5 consoles\n- Tax season: expect more electronics pawns'}
                rows={5}
                mono
              />
            </CardContent>
          </Card>

          {/* Full System Prompt Override */}
          <Card className="rounded-xl border-vault-danger/20 bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconAdjustments className="w-4 h-4 text-vault-danger" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">
                Advanced: Full Prompt Override
              </CardTitle>
              <Badge className="ml-auto bg-vault-danger/15 text-vault-danger border-vault-danger/30 text-[10px]">
                Expert
              </Badge>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-vault-warning/20 bg-vault-warning/5 px-4 py-3">
                <IconAlertTriangle className="w-4 h-4 text-vault-warning mt-0.5 shrink-0" />
                <p className="text-xs text-vault-text-muted font-body leading-relaxed">
                  This <strong className="text-vault-warning">completely replaces</strong> the default appraisal prompt.
                  The Vision model will use only this text when analyzing photos.
                </p>
              </div>

              <ConfigTextarea
                label="Appraisal System Prompt Override"
                description="Leave empty to use the default. When set, this replaces the entire base appraisal prompt."
                value={getValue('agent_appraisal_system_prompt')}
                onChange={(v) => setValue('agent_appraisal_system_prompt', v)}
                placeholder="Leave empty to use the default appraisal prompt…"
                rows={10}
                mono
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ━━━━━━━━━━ Voice Agent ━━━━━━━━━━ */}
        <TabsContent value="voice" className="mt-6 space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-vault-gold/20 bg-vault-gold/5 px-4 py-3">
            <IconInfoCircle className="w-5 h-5 text-vault-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-vault-text-light font-semibold font-body">Voice Agent Configuration</p>
              <p className="text-xs text-vault-text-muted font-body mt-0.5 leading-relaxed">
                The voice agent answers phone calls after hours using the <strong className="text-vault-text-light">OpenAI Realtime API</strong>.
                It <strong className="text-vault-text-light">inherits the Chat Agent&apos;s base prompt</strong> (rules, tone, special info) and layers
                phone-specific instructions on top. Changes to the Chat Agent flow through here automatically.
              </p>
            </div>
          </div>

          {/* Inheritance Info */}
          <div className="flex items-start gap-3 rounded-lg border border-vault-info/20 bg-vault-info/5 px-4 py-3">
            <IconRobot className="w-5 h-5 text-vault-info mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-vault-text-light font-semibold font-body">How the prompt is built:</p>
              <ol className="text-xs text-vault-text-muted font-body leading-relaxed list-decimal list-inside space-y-0.5">
                <li>Chat Agent base prompt (or your Chat override)</li>
                <li>+ Voice Addendum below (phone-specific rules)</li>
                <li>+ Chat tone, rules, and special info</li>
                <li>+ Voice-specific rules</li>
              </ol>
              <p className="text-[10px] text-vault-text-muted font-mono mt-1">
                Config refreshes every 5 minutes — no redeployment needed.
              </p>
            </div>
          </div>

          {/* Default Voice Addendum Viewer */}
          <DefaultPromptViewer
            title="View Default Voice Addendum (read-only)"
            prompt={DEFAULT_VOICE_ADDENDUM}
            isOverridden={getValue('agent_voice_addendum').length > 0}
          />

          {/* Voice & Personality */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconPhone className="w-4 h-4 text-vault-gold" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Voice & Personality</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigSelect
                label="AI Voice"
                description="The voice the AI uses when speaking on the phone. Each has a unique personality."
                value={getValue('agent_voice_voice') || 'alloy'}
                onChange={(v) => setValue('agent_voice_voice', v)}
                options={[
                  { value: 'alloy', label: 'Alloy', description: 'Neutral, balanced' },
                  { value: 'echo', label: 'Echo', description: 'Warm, male' },
                  { value: 'fable', label: 'Fable', description: 'Expressive, storytelling' },
                  { value: 'onyx', label: 'Onyx', description: 'Deep, authoritative' },
                  { value: 'nova', label: 'Nova', description: 'Warm, female' },
                  { value: 'shimmer', label: 'Shimmer', description: 'Bright, friendly' },
                ]}
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-vault-text-light font-body">Temperature</label>
                <p className="text-xs text-vault-text-muted font-body leading-relaxed">
                  Controls creativity/randomness. Lower = more predictable, higher = more natural/varied.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={getValue('agent_voice_temperature') || '0.8'}
                    onChange={(e) => setValue('agent_voice_temperature', e.target.value)}
                    className="flex-1 accent-vault-gold"
                  />
                  <span className="text-sm font-mono text-vault-gold min-w-[2.5rem] text-center">
                    {getValue('agent_voice_temperature') || '0.8'}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-vault-text-muted font-mono px-1">
                  <span>Predictable</span>
                  <span>Natural</span>
                </div>
              </div>

              <ConfigTextarea
                label="Custom Greeting"
                description="Override the greeting the AI says when it first answers the phone. Leave empty for default."
                value={getValue('agent_voice_greeting')}
                onChange={(v) => setValue('agent_voice_greeting', v)}
                placeholder={`e.g. "Hey, you've reached USA Pawn Holdings! We're closed right now but I can help. What's up?"`}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Phone-Specific Instructions */}
          <Card className="rounded-xl border-vault-border bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconShieldCheck className="w-4 h-4 text-vault-gold" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">Phone-Specific Instructions</CardTitle>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-5">
              <ConfigTextarea
                label="Voice Addendum Override"
                description="Replaces the default phone-specific instructions. These are layered on top of the Chat Agent's base prompt. Leave empty to use the default."
                value={getValue('agent_voice_addendum')}
                onChange={(v) => setValue('agent_voice_addendum', v)}
                placeholder="Leave empty to use the default voice addendum…"
                rows={8}
                mono
              />

              <ConfigTextarea
                label="Additional Voice Rules"
                description="Extra rules only for phone conversations. These are added on top of everything else."
                value={getValue('agent_voice_rules')}
                onChange={(v) => setValue('agent_voice_rules', v)}
                placeholder={'e.g.\n- Never mention competitor pawn shops by name\n- If they ask about firearms, always say "come in during business hours"\n- Mention the Saturday special if they ask about gold'}
                rows={5}
                mono
              />
            </CardContent>
          </Card>

          {/* Full System Prompt Override */}
          <Card className="rounded-xl border-vault-danger/20 bg-vault-surface-elevated">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pt-5 pb-3 space-y-0">
              <IconAdjustments className="w-4 h-4 text-vault-danger" />
              <CardTitle className="font-display text-base font-bold text-vault-text-light">
                Advanced: Full Prompt Override
              </CardTitle>
              <Badge className="ml-auto bg-vault-danger/15 text-vault-danger border-vault-danger/30 text-[10px]">
                Expert
              </Badge>
            </CardHeader>
            <Separator className="bg-vault-border" />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-vault-warning/20 bg-vault-warning/5 px-4 py-3">
                <IconAlertTriangle className="w-4 h-4 text-vault-warning mt-0.5 shrink-0" />
                <p className="text-xs text-vault-text-muted font-body leading-relaxed">
                  This <strong className="text-vault-warning">completely replaces everything</strong> — the chat base prompt,
                  voice addendum, all rules, and special info. The voice agent will use ONLY this text.
                  Chat Agent changes will <strong className="text-vault-warning">no longer flow through</strong>.
                </p>
              </div>

              <ConfigTextarea
                label="Voice System Prompt Override"
                description="Leave empty to use the assembled prompt (recommended). When set, this is the ONLY instruction the voice AI receives."
                value={getValue('agent_voice_system_prompt')}
                onChange={(v) => setValue('agent_voice_system_prompt', v)}
                placeholder="Leave empty to use the assembled chat + voice prompt…"
                rows={10}
                mono
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Metadata Footer ─── */}
      <div className="flex items-center justify-between pt-2 border-t border-vault-border">
        <p className="text-[10px] text-vault-text-muted font-mono">
          Config stored in DynamoDB &middot; USA_Pawn_Store_Config
        </p>
        {config.agent_chat_tone?.updated_at && (
          <p className="text-[10px] text-vault-text-muted font-mono">
            Last modified: {new Date(config.agent_chat_tone.updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
