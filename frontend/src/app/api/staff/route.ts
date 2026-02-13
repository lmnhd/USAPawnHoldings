import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import * as dynamodbLib from '@/lib/dynamodb';

type StaffMember = {
  name: string;
  pin: string;
  role?: string;
  phone?: string;
  email?: string;
  hired_date?: string;
};

type StaffConfig = {
  config_key: string;
  value: string;
  updated_at: string;
};

const STORE_CONFIG_TABLE = 'USA_Pawn_Store_Config';
const STAFF_CONFIG_KEY = 'staff_records';

const dynamodb = dynamodbLib as unknown as Record<string, (...args: any[]) => Promise<any>>;

async function getStaffConfig(): Promise<StaffMember[]> {
  try {
    if (typeof dynamodb.getItem === 'function') {
      const result = await dynamodb.getItem(STORE_CONFIG_TABLE, { config_key: STAFF_CONFIG_KEY });
      if (result && result.value) {
        const parsed = JSON.parse(result.value);
        return Array.isArray(parsed.staff) ? parsed.staff : [];
      }
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch staff config:', err);
    return [];
  }
}

async function saveStaffConfig(staff: StaffMember[]): Promise<void> {
  const config: StaffConfig = {
    config_key: STAFF_CONFIG_KEY,
    value: JSON.stringify({ staff }),
    updated_at: new Date().toISOString(),
  };

  if (typeof dynamodb.putItem === 'function') {
    await dynamodb.putItem(STORE_CONFIG_TABLE, config);
  }
}

function generatePIN(): string {
  return randomBytes(2).toString('hex').substring(0, 4);
}

/**
 * GET /api/staff
 * Returns all staff members
 */
export async function GET() {
  try {
    const staff = await getStaffConfig();
    return NextResponse.json({ staff, count: staff.length });
  } catch (err) {
    console.error('Failed to fetch staff:', err);
    return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 });
  }
}

/**
 * POST /api/staff
 * Add a new staff member
 * Body: { name: string, role?: string, phone?: string, email?: string, pin?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }

    const staff = await getStaffConfig();

    // Check for duplicate name
    if (staff.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'Staff member with this name already exists' }, { status: 409 });
    }

    const newMember: StaffMember = {
      name,
      pin: body?.pin || generatePIN(),
      role: body?.role || 'Staff',
      phone: body?.phone || undefined,
      email: body?.email || undefined,
      hired_date: new Date().toISOString().slice(0, 10),
    };

    staff.push(newMember);
    await saveStaffConfig(staff);

    return NextResponse.json({ staff: newMember, message: 'Staff member added successfully' }, { status: 201 });
  } catch (err) {
    console.error('Failed to add staff:', err);
    return NextResponse.json({ error: 'Failed to add staff member' }, { status: 500 });
  }
}

/**
 * PATCH /api/staff
 * Update an existing staff member
 * Body: { current_name: string, updates: Partial<StaffMember> }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const currentName = String(body?.current_name ?? '').trim();
    const updates = body?.updates || {};

    if (!currentName) {
      return NextResponse.json({ error: 'current_name is required' }, { status: 400 });
    }

    const staff = await getStaffConfig();
    const index = staff.findIndex((s) => s.name.toLowerCase() === currentName.toLowerCase());

    if (index === -1) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Update fields
    if (updates.name) staff[index].name = String(updates.name);
    if (updates.pin) staff[index].pin = String(updates.pin);
    if (updates.role) staff[index].role = String(updates.role);
    if (updates.phone !== undefined) staff[index].phone = updates.phone ? String(updates.phone) : undefined;
    if (updates.email !== undefined) staff[index].email = updates.email ? String(updates.email) : undefined;

    await saveStaffConfig(staff);

    return NextResponse.json({ staff: staff[index], message: 'Staff member updated successfully' });
  } catch (err) {
    console.error('Failed to update staff:', err);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}

/**
 * DELETE /api/staff?name=<staff_name>
 * Remove a staff member
 */
export async function DELETE(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const name = params.get('name')?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }

    const staff = await getStaffConfig();
    const filtered = staff.filter((s) => s.name.toLowerCase() !== name.toLowerCase());

    if (filtered.length === staff.length) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    await saveStaffConfig(filtered);

    return NextResponse.json({ message: 'Staff member removed successfully', name });
  } catch (err) {
    console.error('Failed to delete staff:', err);
    return NextResponse.json({ error: 'Failed to remove staff member' }, { status: 500 });
  }
}
