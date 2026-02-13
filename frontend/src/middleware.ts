import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = new Set(["/", "/appraise", "/inventory", "/info", "/login"]);

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true;
  }

  if (pathname === "/staff/clockin" || pathname.startsWith("/staff/clockin/")) {
    return false;
  }

  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    return true;
  }

  return false;
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return true;
  }

  return PUBLIC_ROUTES.has(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("vault_auth")?.value;
  if (authCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/staff/:path*"],
};
