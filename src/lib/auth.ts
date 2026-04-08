import "server-only";

import { Role, UserPortal, UserStatus } from "@/generated/prisma/enums";
import { getHomeForAccess, hasPortalAccess, isRestrictedStatus, normalizeAccessGrants } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { isRecoverableRuntimeError, logServerError } from "@/lib/runtime-guards";
import { clearSession, getSession, type SessionPayload } from "@/lib/session";
import { redirect } from "next/navigation";

const authTopicSummarySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

const authCompanySummarySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

export const authSessionUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  accessGrants: true,
  passwordResetRequired: true,
  sessionVersion: true,
} as const;

const authCurrentUserSelect = {
  ...authSessionUserSelect,
  slug: true,
  avatarUrl: true,
  headline: true,
  bio: true,
  location: true,
  githubUrl: true,
  linkedinUrl: true,
  portfolioUrl: true,
  isVerified: true,
  isFeatured: true,
  isOnboarded: true,
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
  studentProfile: {
    include: {
      targetCompanies: {
        include: {
          company: {
            select: authCompanySummarySelect,
          },
        },
      },
      weakTopics: {
        include: {
          topic: {
            select: authTopicSummarySelect,
          },
        },
      },
      mentorFollows: true,
    },
  },
  mentorProfile: {
    include: {
      company: {
        select: authCompanySummarySelect,
      },
      followers: true,
    },
  },
  ownedCompany: {
    select: authCompanySummarySelect,
  },
  streak: true,
  userBadges: { include: { badge: true } },
} as const;

export function buildSessionPayload(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  accessGrants: UserPortal[];
  passwordResetRequired: boolean;
  sessionVersion: number;
}): SessionPayload {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    accessGrants: normalizeAccessGrants(user.role, user.accessGrants),
    passwordResetRequired: user.passwordResetRequired,
    sessionVersion: user.sessionVersion,
  };
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  let user;

  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: authCurrentUserSelect,
    });
  } catch (error) {
    logServerError("getCurrentUser", error, { userId: session.userId });

    if (isRecoverableRuntimeError(error)) {
      await clearSession();
      return null;
    }

    throw error;
  }

  if (!user) {
    await clearSession();
    return null;
  }

  if (user.sessionVersion !== session.sessionVersion || isRestrictedStatus(user.status)) {
    await clearSession();
    return null;
  }

  return {
    ...user,
    accessGrants: normalizeAccessGrants(user.role, user.accessGrants),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect(getHomeForAccess(user.role, user.accessGrants));
  }

  return user;
}

export async function requirePortalAccess(portal: UserPortal) {
  const user = await requireUser();

  if (!hasPortalAccess(user, portal)) {
    redirect(getHomeForAccess(user.role, user.accessGrants));
  }

  return user;
}

export async function requireRoleAndPortal(roles: Role[], portal: UserPortal) {
  const user = await requireUser();

  if (!roles.includes(user.role) || !hasPortalAccess(user, portal)) {
    redirect(getHomeForAccess(user.role, user.accessGrants));
  }

  return user;
}

export function getHomeForRole(role: Role, accessGrants?: UserPortal[] | null) {
  return getHomeForAccess(role, accessGrants);
}
