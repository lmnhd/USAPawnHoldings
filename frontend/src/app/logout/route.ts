import { NextResponse } from 'next/server';

const COOKIE_NAME = 'vault_auth';

function buildLoginRedirect(request: Request) {
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}

function clearCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const response = buildLoginRedirect(request);
  clearCookie(response);
  return response;
}

export async function POST(request: Request) {
  const response = buildLoginRedirect(request);
  clearCookie(response);
  return response;
}