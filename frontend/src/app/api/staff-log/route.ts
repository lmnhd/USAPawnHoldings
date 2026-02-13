import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as dynamodbLib from '@/lib/dynamodb';

type StaffLogRecord = {
  log_id: string;
  staff_name: string;
  event_type: 'in' | 'out';
  timestamp: string;
  shift_duration: number | null;
  compliance_flags: string[];
  location?: string;
  [key: string]: unknown;
};

const STAFF_LOG_TABLE = 'USA_Pawn_Staff_Log';
const STORE_CONFIG_TABLE = 'USA_Pawn_Store_Config';
const dynamodb = dynamodbLib as unknown as Record<string, (...args: any[]) => Promise<any>>;

async function scanTable<T = any>(table: string): Promise<T[]> {
  if (typeof dynamodb.scanItems === 'function') {
    return (await dynamodb.scanItems(table)) ?? [];
  }
  if (typeof dynamodb.getAllItems === 'function') {
    return (await dynamodb.getAllItems(table)) ?? [];
  }
  return [];
}

async function putLog(item: StaffLogRecord): Promise<void> {
  if (typeof dynamodb.putItem === 'function') {
    await dynamodb.putItem(STAFF_LOG_TABLE, item);
    return;
  }
  if (typeof dynamodb.createItem === 'function') {
    await dynamodb.createItem(STAFF_LOG_TABLE, item);
  }
}

function todayToken(): string {
  const dateString = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${dateString}-${process.env.DAILY_QR_TOKEN_SECRET ?? ''}`)
    .digest('hex')
    .substring(0, 16);
}

function getStaffRecords(configItems: any[]): Array<{ name: string; pin: string }> {
  const allCandidates = configItems.flatMap((item) => {
    const candidates: any[] = [];
    
    // Check direct properties
    if (Array.isArray(item?.staff)) candidates.push(...item.staff);
    if (Array.isArray(item?.staff_records)) candidates.push(...item.staff_records);
    if (Array.isArray(item?.staffMembers)) candidates.push(...item.staffMembers);
    
    // Check JSON-stringified value field
    if (item?.value && typeof item.value === 'string') {
      try {
        const parsed = JSON.parse(item.value);
        if (Array.isArray(parsed?.staff)) candidates.push(...parsed.staff);
        if (Array.isArray(parsed?.staff_records)) candidates.push(...parsed.staff_records);
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    return candidates;
  });

  return allCandidates
    .map((record) => ({ name: String(record?.name ?? record?.staff_name ?? ''), pin: String(record?.pin ?? '') }))
    .filter((record) => record.name && record.pin);
}

function pairShiftData(entries: StaffLogRecord[]): StaffLogRecord[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const openByStaff = new Map<string, StaffLogRecord>();
  const output: StaffLogRecord[] = [];

  for (const entry of sorted) {
    const key = entry.staff_name.toLowerCase();
    if (entry.event_type === 'in') {
      openByStaff.set(key, entry);
      output.push({ ...entry, shift_duration: null });
      continue;
    }

    const inEntry = openByStaff.get(key);
    if (inEntry) {
      const durationMs = new Date(entry.timestamp).getTime() - new Date(inEntry.timestamp).getTime();
      output.push({ ...entry, shift_duration: Math.max(0, Math.round(durationMs / 1000)) });
      openByStaff.delete(key);
    } else {
      output.push({ ...entry, shift_duration: null, compliance_flags: [...(entry.compliance_flags ?? []), 'clock_out_without_clock_in'] });
    }
  }

  return output.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const action = params.get('action');
    const date = params.get('date');
    const staffName = params.get('staff_name');

    // List available staff
    if (action === 'list-staff') {
      const configItems = await scanTable(STORE_CONFIG_TABLE);
      const staffRecords = getStaffRecords(configItems);
      return NextResponse.json({ staff: staffRecords });
    }

    // Get staff logs
    let logs = await scanTable<StaffLogRecord>(STAFF_LOG_TABLE);
    if (date) {
      logs = logs.filter((entry) => String(entry.timestamp).startsWith(date));
    }
    if (staffName) {
      const match = staffName.toLowerCase();
      logs = logs.filter((entry) => String(entry.staff_name).toLowerCase().includes(match));
    }

    const paired = pairShiftData(logs);
    return NextResponse.json({ logs: paired, count: paired.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch staff logs', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const staffName = String(body?.staff_name ?? '');
    const pin = String(body?.pin ?? '');
    const eventType = body?.event_type as 'in' | 'out' | undefined;
    const token = body?.token ? String(body.token) : null;
    const location = body?.location ? String(body.location) : undefined;

    if (!staffName || !pin || (eventType !== 'in' && eventType !== 'out')) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const complianceFlags: string[] = [];
    const configItems = await scanTable(STORE_CONFIG_TABLE);
    const staffRecords = getStaffRecords(configItems);
    const matchedStaff = staffRecords.find(
      (record) => record.name.toLowerCase() === staffName.toLowerCase() && record.pin === pin
    );

    if (!matchedStaff) {
      complianceFlags.push('pin_validation_failed');
    }

    if (eventType === 'in') {
      const expected = todayToken();
      if (!token || token !== expected) {
        complianceFlags.push('invalid_qr_token');
      }
    }

    const existing = await scanTable<StaffLogRecord>(STAFF_LOG_TABLE);
    const forStaff = existing
      .filter((entry) => String(entry.staff_name).toLowerCase() === staffName.toLowerCase())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const lastIn = [...forStaff].reverse().find((entry) => entry.event_type === 'in');
    const lastOut = [...forStaff].reverse().find((entry) => entry.event_type === 'out');
    const hasOpenShift = Boolean(lastIn && (!lastOut || new Date(lastIn.timestamp) > new Date(lastOut.timestamp)));

    if (eventType === 'in' && hasOpenShift) {
      complianceFlags.push('multiple_clock_ins_without_clock_out');
      if (lastIn) {
        const openMs = Date.now() - new Date(lastIn.timestamp).getTime();
        if (openMs > 12 * 60 * 60 * 1000) {
          complianceFlags.push('clock_in_without_clock_out_over_12h');
        }
      }
    }

    let shiftDuration: number | null = null;
    if (eventType === 'out' && hasOpenShift && lastIn) {
      shiftDuration = Math.max(0, Math.round((Date.now() - new Date(lastIn.timestamp).getTime()) / 1000));
    }

    const record: StaffLogRecord = {
      log_id: randomUUID(),
      staff_name: staffName,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      shift_duration: shiftDuration,
      compliance_flags: complianceFlags,
      location,
    };

    await putLog(record);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to write staff log', details: (error as Error).message },
      { status: 500 }
    );
  }
}
