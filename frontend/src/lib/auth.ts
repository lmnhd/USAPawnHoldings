import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "vault_auth";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

function hashForComparison(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function checkPassword(password: string): boolean {
  const expected = process.env.DEMO_AUTH_PASSWORD ?? "12345";
  const inputHash = hashForComparison(password);
  const expectedHash = hashForComparison(expected);
  return timingSafeEqual(inputHash, expectedHash);
}

export function setAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "authenticated",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME);
  return Boolean(cookie?.value);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
