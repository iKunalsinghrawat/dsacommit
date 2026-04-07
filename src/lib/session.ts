import "server-only";

import { Role, UserPortal, UserStatus } from "@/generated/prisma/enums";
import { normalizeAccessGrants } from "@/lib/access-control";
import { AUTH_COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/constants";
import { isMissingAuthConfigurationError, logServerError } from "@/lib/runtime-guards";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  accessGrants: UserPortal[];
  passwordResetRequired: boolean;
  sessionVersion: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
      .sign(getSecret());

    const cookieStore = await cookies();

    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  } catch (error) {
    logServerError("createSession", error);
    throw error;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as unknown as Partial<SessionPayload>;

    if (!session.userId || !session.name || !session.email || !session.role) {
      return null;
    }

    return {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      status: session.status ?? UserStatus.ACTIVE,
      accessGrants: normalizeAccessGrants(session.role, session.accessGrants),
      passwordResetRequired: session.passwordResetRequired ?? false,
      sessionVersion: session.sessionVersion ?? 0,
    } satisfies SessionPayload;
  } catch (error) {
    if (isMissingAuthConfigurationError(error)) {
      logServerError("getSession", error);
    }

    return null;
  }
}
