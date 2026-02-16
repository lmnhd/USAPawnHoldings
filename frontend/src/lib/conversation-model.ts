type RawMessage = {
  role?: unknown;
  content?: unknown;
  timestamp?: unknown;
  image_url?: unknown;
  media_url?: unknown;
};

export type InteractionSource = "web_chat" | "sms" | "mms" | "voice" | "appraise" | "unknown";

export type ConversationMessage = {
  role: string;
  content: string;
  timestamp: string;
  image_url?: string;
  media_url?: string;
};

export type UnifiedConversationRecord = {
  conversation_id: string;
  channel: "web" | "sms" | "voice" | "appraise";
  source: InteractionSource;
  customer_id?: string;
  phone?: string;
  email?: string;
  session_id?: string;
  identity_tokens: string[];
  customer_key: string;
  case_key: string;
  intent_key: string;
  intent_title: string;
  explicit_case_key?: string;
  messages: ConversationMessage[];
  message_count: number;
  started_at: string;
  ended_at?: string;
  metadata?: Record<string, unknown>;
  source_metadata?: Record<string, unknown>;
};

export type ConversationCase = {
  case_key: string;
  case_title: string;
  sources: InteractionSource[];
  last_activity_at: string;
  first_activity_at: string;
  message_count: number;
  conversation_count: number;
  preview: string;
  conversations: UnifiedConversationRecord[];
};

export type CustomerConversationGroup = {
  customer_key: string;
  customer_label: string;
  customer_id?: string;
  phone?: string;
  source_count: number;
  message_count: number;
  conversation_count: number;
  last_activity_at: string;
  first_activity_at: string;
  sources: InteractionSource[];
  cases: ConversationCase[];
};

const intentRules: Array<{ key: string; pattern: RegExp; title: string }> = [
  { key: "schedule_visit", pattern: /schedule|appointment|book|visit|come in/i, title: "Appointment" },
  { key: "appraisal", pattern: /apprais|estimate|value|worth|photo/i, title: "Appraisal" },
  { key: "inventory", pattern: /in stock|inventory|available|have any|looking for/i, title: "Inventory Inquiry" },
  { key: "hours", pattern: /open|hours|today|close|closed/i, title: "Store Hours" },
  { key: "support", pattern: /help|question|info|contact/i, title: "General Support" },
];

const CASE_WINDOW_HOURS_DEFAULT = 72;

function normalizeIso(raw: unknown, fallback: string): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const textParts = value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const text = (part as Record<string, unknown>).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean);
    return textParts.join(" ").trim();
  }
  if (value == null) return "";
  return String(value).trim();
}

function normalizeMessage(raw: RawMessage, fallbackTime: string): ConversationMessage | null {
  const content = textFromUnknown(raw.content);
  if (!content) return null;

  const imageUrl = typeof raw.image_url === "string" ? raw.image_url : undefined;
  const mediaUrl = typeof raw.media_url === "string" ? raw.media_url : undefined;

  return {
    role: typeof raw.role === "string" ? raw.role : "system",
    content,
    timestamp: normalizeIso(raw.timestamp, fallbackTime),
    image_url: imageUrl,
    media_url: mediaUrl,
  };
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function normalizePhone(raw: unknown): string | undefined {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return undefined;
}

function normalizeEmail(raw: unknown): string | undefined {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return undefined;
  return value;
}

function extractEmailFromMessages(messages: ConversationMessage[]): string | undefined {
  const matcher = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  for (const message of messages) {
    const match = message.content.match(matcher);
    if (match?.[0]) {
      const normalized = normalizeEmail(match[0]);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

function sanitizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function inferIntent(messages: ConversationMessage[], metadata?: Record<string, unknown>): { key: string; title: string } {
  const metadataEvent = typeof metadata?.event === "string" ? metadata.event : "";
  if (metadataEvent.includes("voice_schedule_visit")) {
    return { key: "schedule_visit", title: "Appointment" };
  }

  const combined = messages
    .filter((message) => message.role === "user" || message.role === "system")
    .map((message) => message.content)
    .join(" ");

  for (const rule of intentRules) {
    if (rule.pattern.test(combined)) {
      return { key: rule.key, title: rule.title };
    }
  }

  return { key: "general", title: "General" };
}

function inferSource(raw: Record<string, unknown>): InteractionSource {
  const explicit = typeof raw.source === "string" ? raw.source.toLowerCase() : "";
  if (explicit === "web_chat" || explicit === "sms" || explicit === "mms" || explicit === "voice" || explicit === "appraise") {
    return explicit;
  }

  const channel = typeof raw.channel === "string" ? raw.channel.toLowerCase() : "";
  if (channel === "web") return "web_chat";
  if (channel === "sms") return "sms";
  if (channel === "voice") return "voice";

  const conversationId = typeof raw.conversation_id === "string" ? raw.conversation_id.toLowerCase() : "";
  if (conversationId.startsWith("sms_")) return "sms";
  if (conversationId.startsWith("voice_booking_")) return "voice";
  if (conversationId.startsWith("appraise_")) return "appraise";

  return "unknown";
}

function inferChannel(source: InteractionSource, rawChannel: unknown): "web" | "sms" | "voice" | "appraise" {
  const channel = typeof rawChannel === "string" ? rawChannel.toLowerCase() : "";
  if (channel === "web" || channel === "sms" || channel === "voice" || channel === "appraise") {
    return channel;
  }

  if (source === "sms" || source === "mms") return "sms";
  if (source === "voice") return "voice";
  if (source === "appraise") return "appraise";
  return "web";
}

function customerKeyFrom(raw: {
  customer_id?: unknown;
  phone?: unknown;
  email?: unknown;
  session_id?: unknown;
  conversation_id: string;
}): {
  customerKey: string;
  customerId?: string;
  phone?: string;
  email?: string;
  sessionId?: string;
  identityTokens: string[];
} {
  const customerId = typeof raw.customer_id === "string" && raw.customer_id.trim().length > 0
    ? raw.customer_id.trim()
    : undefined;
  const phone = normalizePhone(raw.phone);
  const email = normalizeEmail(raw.email);
  const sessionId = typeof raw.session_id === "string" && raw.session_id.trim().length > 0
    ? raw.session_id.trim()
    : undefined;

  const identityTokens = [
    customerId ? `customer_id:${sanitizeKey(customerId)}` : undefined,
    phone ? `phone:${sanitizeKey(phone)}` : undefined,
    email ? `email:${sanitizeKey(email)}` : undefined,
    sessionId ? `session:${sanitizeKey(sessionId)}` : undefined,
  ].filter((token): token is string => Boolean(token));

  if (customerId) {
    return {
      customerKey: `customer:${sanitizeKey(customerId)}`,
      customerId,
      phone,
      email,
      sessionId,
      identityTokens,
    };
  }
  if (phone) {
    return {
      customerKey: `phone:${sanitizeKey(phone)}`,
      customerId,
      phone,
      email,
      sessionId,
      identityTokens,
    };
  }
  if (email) {
    return {
      customerKey: `email:${sanitizeKey(email)}`,
      customerId,
      phone,
      email,
      sessionId,
      identityTokens,
    };
  }
  if (sessionId) {
    return {
      customerKey: `session:${sanitizeKey(sessionId)}`,
      customerId,
      phone,
      email,
      sessionId,
      identityTokens,
    };
  }

  const suffix = sanitizeKey(raw.conversation_id).slice(0, 18) || "anon";
  return {
    customerKey: `anon:${suffix}`,
    customerId,
    phone,
    email,
    sessionId,
    identityTokens,
  };
}

export function toUnifiedConversationRecord(raw: Record<string, unknown>): UnifiedConversationRecord | null {
  const now = new Date().toISOString();
  const conversationIdRaw = typeof raw.conversation_id === "string" ? raw.conversation_id.trim() : "";
  if (!conversationIdRaw) {
    return null;
  }

  const source = inferSource(raw);
  const channel = inferChannel(source, raw.channel);
  const startedAt = normalizeIso(raw.started_at, now);
  const endedAt = raw.ended_at ? normalizeIso(raw.ended_at, startedAt) : undefined;

  const rawMessages = Array.isArray(raw.messages) ? (raw.messages as RawMessage[]) : [];
  const messages = rawMessages
    .map((message) => normalizeMessage(message, startedAt))
    .filter((message): message is ConversationMessage => Boolean(message));

  const fallbackMessage = messages.length === 0
    ? [{ role: "system", content: "(no messages)", timestamp: startedAt }]
    : messages;

  const metadata = raw.metadata && typeof raw.metadata === "object"
    ? (raw.metadata as Record<string, unknown>)
    : undefined;

  const sourceMetadata = raw.source_metadata && typeof raw.source_metadata === "object"
    ? (raw.source_metadata as Record<string, unknown>)
    : undefined;

  const phone = normalizePhone(firstString([
    raw.phone,
    raw.customer_phone,
    raw.customerPhone,
    (raw.metadata as Record<string, unknown> | undefined)?.phone,
    metadata?.phone,
    sourceMetadata?.phone,
    sourceMetadata?.from,
  ]));

  const sessionId = firstString([
    raw.session_id,
    raw.sessionId,
    metadata?.session_id,
    metadata?.sessionId,
    sourceMetadata?.session_id,
    sourceMetadata?.sessionId,
  ]);

  const directEmail = normalizeEmail(firstString([
    raw.email,
    metadata?.email,
    sourceMetadata?.email,
  ]));

  const extractedEmail = extractEmailFromMessages(fallbackMessage);
  const email = directEmail ?? extractedEmail;

  const customer = customerKeyFrom({
    customer_id: raw.customer_id,
    phone,
    email,
    session_id: sessionId,
    conversation_id: conversationIdRaw,
  });

  const intent = inferIntent(fallbackMessage, metadata);
  const explicitCase = typeof raw.case_key === "string" ? raw.case_key.trim() : "";
  const caseKey = explicitCase || `${customer.customerKey}:${sanitizeKey(intent.key)}`;

  return {
    conversation_id: conversationIdRaw,
    channel,
    source,
    customer_id: customer.customerId,
    phone: customer.phone,
    email: customer.email,
    session_id: customer.sessionId,
    identity_tokens: customer.identityTokens,
    customer_key: customer.customerKey,
    case_key: caseKey,
    intent_key: intent.key,
    intent_title: intent.title,
    explicit_case_key: explicitCase || undefined,
    messages: fallbackMessage,
    message_count: Number(raw.message_count) > 0 ? Number(raw.message_count) : fallbackMessage.length,
    started_at: startedAt,
    ended_at: endedAt,
    metadata,
    source_metadata: sourceMetadata,
  };
}

function latestTimestamp(record: UnifiedConversationRecord): string {
  return record.ended_at ?? record.started_at;
}

function getPreview(record: UnifiedConversationRecord): string {
  const userMessage = record.messages.find((message) => message.role === "user");
  const message = userMessage ?? record.messages[0];
  return message?.content?.slice(0, 120) || "(no messages)";
}

function caseTitle(caseKey: string): string {
  const suffix = caseKey.split(":").pop() || "general";
  const normalized = suffix.replace(/-/g, " ");
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildConversationGroups(
  records: UnifiedConversationRecord[],
  options?: { caseWindowHours?: number },
): CustomerConversationGroup[] {
  const tokenToCanonical = new Map<string, string>();

  const ensureCanonical = (record: UnifiedConversationRecord): string => {
    const availableCanonicals = record.identity_tokens
      .map((token) => tokenToCanonical.get(token))
      .filter((value): value is string => Boolean(value));

    const canonical = availableCanonicals[0] ?? record.customer_key;

    for (const token of record.identity_tokens) {
      tokenToCanonical.set(token, canonical);
    }

    return canonical;
  };

  const customers = new Map<string, CustomerConversationGroup>();

  const enriched = records.map((record) => ({
    ...record,
    canonical_customer_key: ensureCanonical(record),
  }));

  for (const record of enriched) {
    const customerKey = record.canonical_customer_key;

    const existingCustomer = customers.get(customerKey);
    if (!existingCustomer) {
      customers.set(customerKey, {
        customer_key: customerKey,
        customer_label: record.customer_id || record.phone || record.email || customerKey,
        customer_id: record.customer_id,
        phone: record.phone,
        source_count: 0,
        message_count: 0,
        conversation_count: 0,
        first_activity_at: record.started_at,
        last_activity_at: latestTimestamp(record),
        sources: [],
        cases: [],
      });
    }

    const customer = customers.get(customerKey)!;

    customer.message_count += record.message_count;
    customer.conversation_count += 1;

    if (!customer.customer_id && record.customer_id) {
      customer.customer_id = record.customer_id;
      customer.customer_label = record.customer_id;
    }
    if (!customer.phone && record.phone) {
      customer.phone = record.phone;
      if (!customer.customer_id) customer.customer_label = record.phone;
    }

    if (new Date(record.started_at).getTime() < new Date(customer.first_activity_at).getTime()) {
      customer.first_activity_at = record.started_at;
    }

    if (new Date(latestTimestamp(record)).getTime() > new Date(customer.last_activity_at).getTime()) {
      customer.last_activity_at = latestTimestamp(record);
    }

    if (!customer.sources.includes(record.source)) {
      customer.sources.push(record.source);
    }
  }

  const windowHours = Math.max(1, Math.min(24 * 14, options?.caseWindowHours ?? CASE_WINDOW_HOURS_DEFAULT));
  const caseWindowMs = windowHours * 60 * 60 * 1000;

  for (const customer of customers.values()) {
    const customerRecords = enriched
      .filter((record) => record.canonical_customer_key === customer.customer_key)
      .sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime());

    for (const record of customerRecords) {
      const recordTime = new Date(record.started_at).getTime();

      if (record.explicit_case_key) {
        const explicitExisting = customer.cases.find((entry) => entry.case_key === record.explicit_case_key);
        if (explicitExisting) {
          explicitExisting.message_count += record.message_count;
          explicitExisting.conversation_count += 1;
          explicitExisting.preview = getPreview(record);
          explicitExisting.conversations.push(record);
          if (!explicitExisting.sources.includes(record.source)) explicitExisting.sources.push(record.source);
          if (recordTime < new Date(explicitExisting.first_activity_at).getTime()) explicitExisting.first_activity_at = record.started_at;
          if (new Date(latestTimestamp(record)).getTime() > new Date(explicitExisting.last_activity_at).getTime()) {
            explicitExisting.last_activity_at = latestTimestamp(record);
          }
          continue;
        }

        customer.cases.push({
          case_key: record.explicit_case_key,
          case_title: record.intent_title || caseTitle(record.explicit_case_key),
          sources: [record.source],
          first_activity_at: record.started_at,
          last_activity_at: latestTimestamp(record),
          message_count: record.message_count,
          conversation_count: 1,
          preview: getPreview(record),
          conversations: [record],
        });
        continue;
      }

      const matchingCase = customer.cases
        .filter((entry) => entry.case_key.startsWith(`${customer.customer_key}:${sanitizeKey(record.intent_key)}:`))
        .find((entry) => recordTime - new Date(entry.last_activity_at).getTime() <= caseWindowMs);

      if (matchingCase) {
        matchingCase.message_count += record.message_count;
        matchingCase.conversation_count += 1;
        matchingCase.preview = getPreview(record);
        matchingCase.conversations.push(record);
        if (!matchingCase.sources.includes(record.source)) matchingCase.sources.push(record.source);
        if (recordTime < new Date(matchingCase.first_activity_at).getTime()) matchingCase.first_activity_at = record.started_at;
        if (new Date(latestTimestamp(record)).getTime() > new Date(matchingCase.last_activity_at).getTime()) {
          matchingCase.last_activity_at = latestTimestamp(record);
        }
        continue;
      }

      const bucket = Math.floor(recordTime / caseWindowMs);
      const generatedCaseKey = `${customer.customer_key}:${sanitizeKey(record.intent_key)}:${bucket}`;
      customer.cases.push({
        case_key: generatedCaseKey,
        case_title: record.intent_title,
        sources: [record.source],
        first_activity_at: record.started_at,
        last_activity_at: latestTimestamp(record),
        message_count: record.message_count,
        conversation_count: 1,
        preview: getPreview(record),
        conversations: [record],
      });
    }
  }

  const grouped = Array.from(customers.values()).map((customer) => {
    const sortedCases = customer.cases
      .map((entry) => ({
        ...entry,
        conversations: [...entry.conversations].sort(
          (left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime(),
        ),
      }))
      .sort((left, right) => new Date(right.last_activity_at).getTime() - new Date(left.last_activity_at).getTime());

    return {
      ...customer,
      source_count: customer.sources.length,
      cases: sortedCases,
    };
  });

  return grouped.sort((left, right) => new Date(right.last_activity_at).getTime() - new Date(left.last_activity_at).getTime());
}

export function createUnifiedConversationRecord(input: {
  conversation_id: string;
  source: InteractionSource;
  channel?: "web" | "sms" | "voice" | "appraise";
  messages: Array<Record<string, unknown>>;
  customer_id?: string;
  phone?: string;
  started_at?: string;
  ended_at?: string;
  metadata?: Record<string, unknown>;
  source_metadata?: Record<string, unknown>;
  case_key?: string;
}): UnifiedConversationRecord {
  const base = toUnifiedConversationRecord({
    conversation_id: input.conversation_id,
    source: input.source,
    channel: input.channel,
    messages: input.messages,
    customer_id: input.customer_id,
    phone: input.phone,
    started_at: input.started_at,
    ended_at: input.ended_at,
    metadata: input.metadata,
    source_metadata: input.source_metadata,
    case_key: input.case_key,
    message_count: input.messages.length,
  });

  if (!base) {
    throw new Error("Invalid conversation input");
  }

  return base;
}
