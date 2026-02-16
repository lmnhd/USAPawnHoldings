import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as dynamodbLib from '@/lib/dynamodb';
import * as twilioLib from '@/lib/twilio';

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';

type AppointmentRecord = {
  lead_id: string;
  appointment_id: string;
  type: 'appointment';
  source: string;
  customer_name: string;
  phone: string;
  preferred_time: string;
  scheduled_time: string;
  item_description: string;
  estimated_value?: number;
  confirmation_code: string;
  status: AppointmentStatus;
  timestamp: string;
  updated_at: string;
  sms_sent: boolean;
  [key: string]: unknown;
};

const LEADS_TABLE = 'USA_Pawn_Leads';
const dynamodb = dynamodbLib as unknown as Record<string, (...args: any[]) => Promise<any>>;
const twilio = twilioLib as unknown as Record<string, (...args: any[]) => Promise<any>>;

async function scanAppointments(): Promise<AppointmentRecord[]> {
  let records: AppointmentRecord[] = [];
  if (typeof dynamodb.scanItems === 'function') {
    records = (await dynamodb.scanItems(LEADS_TABLE)) ?? [];
  } else if (typeof dynamodb.getAllItems === 'function') {
    records = (await dynamodb.getAllItems(LEADS_TABLE)) ?? [];
  }
  return records.filter((item) => item?.type === 'appointment');
}

async function putAppointment(item: AppointmentRecord): Promise<void> {
  if (typeof dynamodb.putItem === 'function') {
    await dynamodb.putItem(LEADS_TABLE, item);
    return;
  }
  if (typeof dynamodb.createItem === 'function') {
    await dynamodb.createItem(LEADS_TABLE, item);
  }
}

async function updateAppointment(
  appointmentId: string,
  updates: Partial<AppointmentRecord>
): Promise<AppointmentRecord> {
  const appointments = await scanAppointments();
  const target = appointments.find((item) => item.appointment_id === appointmentId);
  if (!target) {
    throw new Error('Appointment not found');
  }

  if (typeof dynamodb.updateItem === 'function') {
    await dynamodb.updateItem(LEADS_TABLE, { lead_id: target.lead_id }, updates);
    return { ...target, ...updates };
  }

  const merged = { ...target, ...updates };
  await putAppointment(merged);
  return merged;
}

function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendText(phone: string, message: string): Promise<boolean> {
  try {
    if (typeof twilio.sendSMS === 'function') {
      await twilio.sendSMS(phone, message);
      return true;
    }
    if (typeof twilio.sendMessage === 'function') {
      await twilio.sendMessage(phone, message);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function sameHour(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours()
  );
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const date = params.get('date');
    const status = params.get('status');

    let appointments = await scanAppointments();
    if (date) {
      appointments = appointments.filter((item) => String(item.scheduled_time).startsWith(date));
    }
    if (status) {
      appointments = appointments.filter(
        (item) => String(item.status).toLowerCase() === status.toLowerCase()
      );
    }

    appointments.sort(
      (a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );

    return NextResponse.json({ appointments, count: appointments.length });
  } catch (error) {
    console.error("Schedule GET error:", error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerName = String(body?.customer_name ?? '');
    const phone = String(body?.phone ?? '');
    const preferredTime = String(body?.preferred_time ?? '');
    const itemDescription = String(body?.item_description ?? '');

    if (!customerName || !phone || !preferredTime || !itemDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await scanAppointments();
    const hourlyCount = existing.filter(
      (item) => item.status !== 'cancelled' && item.status !== 'no-show' && sameHour(item.scheduled_time, preferredTime)
    ).length;

    if (hourlyCount >= 4) {
      const hourStart = new Date(preferredTime);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);
      return NextResponse.json(
        { error: 'Time slot full', suggest_next: hourEnd.toISOString() },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const appointment: AppointmentRecord = {
      lead_id: randomUUID(),
      appointment_id: randomUUID(),
      type: 'appointment',
      source: body?.source ?? 'voice', // Add source field (voice by default)
      customer_name: customerName,
      phone,
      preferred_time: preferredTime,
      scheduled_time: preferredTime,
      item_description: itemDescription,
      estimated_value: body?.estimated_value != null ? Number(body.estimated_value) : undefined,
      confirmation_code: generateConfirmationCode(),
      status: 'pending',
      timestamp: now,
      updated_at: now,
      sms_sent: false,
    };

    const smsSent = await sendText(
      appointment.phone,
      `USA Pawn appointment request received for ${appointment.scheduled_time}. Confirmation: ${appointment.confirmation_code}`
    );
    appointment.sms_sent = smsSent;

    await putAppointment(appointment);
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Schedule POST error:", error);
    return NextResponse.json(
      { error: 'Failed to create appointment', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const appointmentId = String(body?.appointment_id ?? '');
    const status = body?.status as AppointmentStatus | undefined;
    const validStatuses: AppointmentStatus[] = ['confirmed', 'completed', 'cancelled', 'no-show', 'pending'];

    if (!appointmentId || !status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid appointment update payload' }, { status: 400 });
    }

    const updated = await updateAppointment(appointmentId, {
      status,
      updated_at: new Date().toISOString(),
    });

    const smsSent = await sendText(
      String(updated.phone),
      `USA Pawn appointment ${appointmentId} status updated to: ${status}`
    );

    return NextResponse.json({ ...updated, sms_sent: smsSent });
  } catch (error) {
    console.error("Schedule PATCH error:", error);
    return NextResponse.json(
      { error: 'Failed to update appointment', details: (error as Error).message },
      { status: 500 }
    );
  }
}
