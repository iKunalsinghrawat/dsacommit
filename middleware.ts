import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { Role, UserPortal, UserStatus } from "./src/generated/prisma/enums";
import { getHomeForAccess, hasPortalAccess, navigationItems } from "./src/lib/access-control";
import { AUTH_COOKIE_NAME, PROTECTED_ROUTE_PREFIXES } from "./src/lib/constants";

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    return verified.payload as {
      userId: string;
      name?: string;
      email?: string;
      role: Role;
      status?: UserStatus;
      accessGrants?: UserPortal[];
      passwordResetRequired?: boolean;
      sessionVersion?: number;
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);
  const isProtected = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup");
  const matchedPortalRoute = navigationItems.find((item) => pathname.startsWith(item.href));

  if (session?.status && session.status !== UserStatus.ACTIVE) {
    const response = NextResponse.redirect(new URL("/auth/signin", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (isAuthPage && session) {
    const nextUrl = session.passwordResetRequired
      ? "/profile?passwordReset=required"
      : getHomeForAccess(session.role, session.accessGrants);
    return NextResponse.redirect(new URL(nextUrl, request.url));
  }

  if (isProtected && !session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (
    session?.passwordResetRequired &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/api/health")
  ) {
    return NextResponse.redirect(new URL("/profile?passwordReset=required", request.url));
  }

  if (
    session &&
    matchedPortalRoute &&
    (!matchedPortalRoute.roles.includes(session.role) ||
      !hasPortalAccess({ role: session.role, accessGrants: session.accessGrants }, matchedPortalRoute.portal))
  ) {
    return NextResponse.redirect(new URL(getHomeForAccess(session.role, session.accessGrants), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
