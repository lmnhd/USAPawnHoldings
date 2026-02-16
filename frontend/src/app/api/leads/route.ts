import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as dynamodbLib from '@/lib/dynamodb';

type LeadRecord = {
  lead_id: string;
  customer_name: string;
  phone: string;
  item_description: string;
  estimated_value: number;
  source: string;
  status: string;
  priority: string;
  timestamp: string;
  updated_at: string;
  notes?: string;
  [key: string]: unknown;
};

const LEADS_TABLE = 'USA_Pawn_Leads';
const dynamodb = dynamodbLib as unknown as Record<string, (...args: any[]) => Promise<any>>;

async function scanLeads(): Promise<LeadRecord[]> {
  if (typeof dynamodb.scanItems === 'function') {
    return (await dynamodb.scanItems(LEADS_TABLE)) ?? [];
  }
  if (typeof dynamodb.getAllItems === 'function') {
    return (await dynamodb.getAllItems(LEADS_TABLE)) ?? [];
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

    let leads = await scanLeads();

    if (status) {
      leads = leads.filter((lead) => String(lead.status).toLowerCase() === status.toLowerCase());
    }
    if (source) {
      leads = leads.filter((lead) => String(lead.source).toLowerCase() === source.toLowerCase());
    }

    leads = applyDateRange(leads, dateRange);
    leads.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

    if (!body?.customer_name || !body?.phone || !body?.item_description || body?.estimated_value == null || !body?.source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lead: LeadRecord = {
      lead_id: randomUUID(),
      customer_name: String(body.customer_name),
      phone: String(body.phone),
      item_description: String(body.item_description),
      estimated_value: Number(body.estimated_value),
      source: String(body.source),
      status: 'new',
      priority: String(body.priority ?? 'normal'),
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

    if (body.status) {
      updates.status = String(body.status);
    }
    if (body.notes !== undefined) {
      updates.notes = String(body.notes);
    }
    if (body.priority) {
      updates.priority = String(body.priority);
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
