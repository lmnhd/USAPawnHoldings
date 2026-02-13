import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as authLib from '@/lib/auth';

const COOKIE_NAME = 'vault_auth';
const TTL_SECONDS = 24 * 60 * 60;
const auth = authLib as unknown as Record<string, (...args: any[]) => any>;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: TTL_SECONDS,
  path: '/',
};

type SessionPayload = {
  role: 'owner' | 'staff';
  expires_at: string;
};

function signingSecret(): string {
  return process.env.AUTH_TOKEN_SECRET ?? process.env.DAILY_QR_TOKEN_SECRET ?? 'vault-secret';
}

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', signingSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) {
    return null;
  }
  const [body, sig] = token.split('.');
  const expected = createHmac('sha256', signingSecret()).update(body).digest('base64url');
  if (sig !== expected) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (new Date(parsed.expires_at).getTime() <= Date.now()) {
      return null;
    }
    if (parsed.role !== 'owner' && parsed.role !== 'staff') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function isPasswordValid(password: string): Promise<boolean> {
  if (typeof auth.checkPassword === 'function') {
    const result = await auth.checkPassword(password);
    return Boolean(result);
  }
  return password === (process.env.DEMO_AUTH_PASSWORD ?? '12345');
}

function getAction(request: NextRequest, body?: any): 'login' | 'logout' | 'check' | null {
  const path = request.nextUrl.pathname;
  if (path.endsWith('/login')) return 'login';
  if (path.endsWith('/logout')) return 'logout';
  if (path.endsWith('/check')) return 'check';

  const actionQuery = request.nextUrl.searchParams.get('action');
  if (actionQuery === 'login' || actionQuery === 'logout' || actionQuery === 'check') {
    return actionQuery;
  }

  const actionBody = body?.action;
  if (actionBody === 'login' || actionBody === 'logout' || actionBody === 'check') {
    return actionBody;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = getAction(request, body);

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }

    if (action !== 'login') {
      return NextResponse.json({ error: 'Unsupported auth action' }, { status: 400 });
    }

    const password = String(body?.password ?? '');
    const role = body?.role === 'staff' ? 'staff' : 'owner';
    const valid = await isPasswordValid(password);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    const expires = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
    const token = encodeSession({ role, expires_at: expires });
    const response = NextResponse.json({ success: true, role, expires_at: expires });
    response.cookies.set(COOKIE_NAME, token, cookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Auth request failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const action = getAction(request);
    if (action !== 'check' && action !== null) {
      return NextResponse.json({ error: 'Unsupported auth action' }, { status: 400 });
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = decodeSession(token);
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      role: session.role,
      expires_at: session.expires_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Session check failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
