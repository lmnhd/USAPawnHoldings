import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as dynamodbLib from '@/lib/dynamodb';

type LeadRecord = {
  lead_id: string;
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  item_description?: string;
  estimated_value?: number | string;
  source?: string;
  source_channel?: string;
  contact_method?: string;
  type?: string;
  appointment_id?: string;
  appointment_time?: string;
  preferred_time?: string;
  scheduled_time?: string;
  appraisal_id?: string;
  value_range?: string;
  item_category?: string;
  status?: string;
  priority?: string;
  timestamp: string;
  created_at?: string;
  updated_at?: string;
  photo_url?: string;
  notes?: string;
  [key: string]: unknown;
};

const LEADS_TABLE = 'USA_Pawn_Leads';
type AsyncUnknownFn = (...args: unknown[]) => Promise<unknown>;
const dynamodb = dynamodbLib as unknown as Record<string, AsyncUnknownFn>;

async function scanLeads(): Promise<LeadRecord[]> {
  if (typeof dynamodb.scanItems === 'function') {
    return ((await dynamodb.scanItems(LEADS_TABLE)) as LeadRecord[]) ?? [];
  }
  if (typeof dynamodb.getAllItems === 'function') {
    return ((await dynamodb.getAllItems(LEADS_TABLE)) as LeadRecord[]) ?? [];
  }
  return [];
}

async function deleteLead(leadId: string): Promise<void> {
  if (typeof dynamodb.deleteItem === 'function') {
    await dynamodb.deleteItem(LEADS_TABLE, { lead_id: leadId });
  }
}

async function putLead(item: LeadRecord): Promise<void> {
  if (typeof dynamodb.putItem === 'function') {
    await dynamodb.putItem(LEADS_TABLE, item);
    return;
  }
  if (typeof dynamodb.createItem === 'function') {
    await dynamodb.createItem(LEADS_TABLE, item);
  }
}

async function updateLead(leadId: string, updates: Partial<LeadRecord>): Promise<void> {
  if (typeof dynamodb.updateItem === 'function') {
    await dynamodb.updateItem(LEADS_TABLE, { lead_id: leadId }, updates);
    return;
  }

  const leads = await scanLeads();
  const target = leads.find((lead) => lead.lead_id === leadId);
  if (!target) {
    throw new Error('Lead not found');
  }
  await putLead({ ...target, ...updates });
}

function parseEstimatedValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function deriveMethod(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized.includes('sms') || normalized.includes('mms') || normalized.includes('text')) {
    return 'sms';
  }
  if (normalized.includes('voice') || normalized.includes('phone') || normalized.includes('call')) {
    return 'phone';
  }
  if (normalized.includes('chat')) {
    return 'chat';
  }
  return 'web';
}

function normalizeLead(record: LeadRecord): LeadRecord {
  const source = String(record.source ?? record.source_channel ?? 'web').toLowerCase();
  const appointmentTime =
    (record.scheduled_time as string | undefined) ??
    (record.appointment_time as string | undefined) ??
    (record.preferred_time as string | undefined);
  const timestamp = String(record.timestamp ?? record.created_at ?? new Date(0).toISOString());

  return {
    ...record,
    source,
    source_channel: String(record.source_channel ?? source),
    contact_method: String(record.contact_method ?? deriveMethod(source)),
    customer_name: String(record.customer_name ?? ''),
    phone: String(record.phone ?? record.customer_phone ?? ''),
    item_description: String(record.item_description ?? ''),
    estimated_value: parseEstimatedValue(record.estimated_value),
    status: String(record.status ?? 'new').toLowerCase(),
    priority: String(record.priority ?? 'normal').toLowerCase(),
    timestamp,
    created_at: String(record.created_at ?? timestamp),
    updated_at: String(record.updated_at ?? timestamp),
    appointment_time: appointmentTime,
    preferred_time: String(record.preferred_time ?? appointmentTime ?? ''),
    scheduled_time: String(record.scheduled_time ?? appointmentTime ?? ''),
  };
}

function applyDateRange(items: LeadRecord[], dateRange: string | null): LeadRecord[] {
  if (!dateRange) {
    return items;
  }

  const [start, end] = dateRange.split(',');
  const startDate = start ? new Date(start).getTime() : Number.NEGATIVE_INFINITY;
  const endDate = end ? new Date(end).getTime() : Number.POSITIVE_INFINITY;

  return items.filter((item) => {
    const time = new Date(item.timestamp).getTime();
    return time >= startDate && time <= endDate;
  });
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const status = params.get('status');
    const source = params.get('source');
    const dateRange = params.get('date_range');
    const limit = Math.max(1, Math.min(Number(params.get('limit') ?? '50'), 200));
    const cursor = Math.max(0, Number(params.get('cursor') ?? '0'));

    let leads = (await scanLeads()).map(normalizeLead);

    if (status) {
      leads = leads.filter((lead) => String(lead.status).toLowerCase() === status.toLowerCase());
    }
    if (source) {
      leads = leads.filter((lead) => String(lead.source).toLowerCase() === source.toLowerCase());
    }

    leads = applyDateRange(leads, dateRange);
    leads.sort((a, b) => {
      const aTime = new Date(String(a.created_at ?? a.timestamp)).getTime();
      const bTime = new Date(String(b.created_at ?? b.timestamp)).getTime();
      return bTime - aTime;
    });

    const paged = leads.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < leads.length ? cursor + limit : null;

    return NextResponse.json({
      leads: paged,
      count: leads.length,
      next_cursor: nextCursor,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    if (!body?.source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const source = String(body.source).toLowerCase();
    const lead: LeadRecord = {
      lead_id: randomUUID(),
      customer_name: body.customer_name ? String(body.customer_name) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      customer_phone: body.customer_phone ? String(body.customer_phone) : undefined,
      item_description: body.item_description ? String(body.item_description) : undefined,
      estimated_value: body.estimated_value != null ? Number(body.estimated_value) : undefined,
      source,
      source_channel: body.source_channel ? String(body.source_channel) : source,
      contact_method: body.contact_method ? String(body.contact_method) : deriveMethod(source),
      type: body.type ? String(body.type) : undefined,
      appointment_id: body.appointment_id ? String(body.appointment_id) : undefined,
      appointment_time: body.appointment_time ? String(body.appointment_time) : undefined,
      preferred_time: body.preferred_time ? String(body.preferred_time) : undefined,
      scheduled_time: body.scheduled_time ? String(body.scheduled_time) : undefined,
      appraisal_id: body.appraisal_id ? String(body.appraisal_id) : undefined,
      value_range: body.value_range ? String(body.value_range) : undefined,
      item_category: body.item_category ? String(body.item_category) : undefined,
      photo_url: body.photo_url ? String(body.photo_url) : undefined,
      status: body.status ? String(body.status).toLowerCase() : 'new',
      priority: String(body.priority ?? 'normal'),
      created_at: now,
      timestamp: now,
      updated_at: now,
      notes: body.notes ? String(body.notes) : undefined,
    };

    await putLead(lead);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create lead', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    const updates: Partial<LeadRecord> = {
      updated_at: new Date().toISOString(),
    };

    if (body.notes !== undefined) {
      updates.notes = String(body.notes);
    }
    if (body.priority) {
      updates.priority = String(body.priority);
    }
    if (body.contact_method) {
      updates.contact_method = String(body.contact_method);
    }
    if (body.status) {
      updates.status = String(body.status).toLowerCase();
    }

    await updateLead(String(body.lead_id), updates);
    return NextResponse.json({ success: true, lead_id: body.lead_id, ...updates });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update lead', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const clearAll = params.get('clear_all') === 'true';
    const leadId = params.get('lead_id');

    if (clearAll) {
      const leads = await scanLeads();
      let deleted = 0;
      for (const lead of leads) {
        await deleteLead(lead.lead_id);
        deleted++;
      }
      return NextResponse.json({ success: true, deleted, message: `Cleared ${deleted} leads` });
    }

    if (leadId) {
      await deleteLead(leadId);
      return NextResponse.json({ success: true, lead_id: leadId });
    }

    return NextResponse.json({ error: 'Provide lead_id or clear_all=true' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete leads', details: (error as Error).message },
      { status: 500 }
    );
  }
}
