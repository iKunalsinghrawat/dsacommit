/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role, UserPortal, UserStatus } from "@/generated/prisma/enums";

const getSession = vi.fn();
const clearSession = vi.fn();
const prisma = {
  user: {
    findUnique: vi.fn(),
  },
} as const;

vi.mock("@/lib/session", () => ({
  getSession,
  clearSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { getCurrentUser } = await import("@/lib/auth");

describe("auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the session when the persisted user is blocked", async () => {
    getSession.mockResolvedValue({
      userId: "user-1",
      name: "Blocked User",
      email: "blocked@dsacommit.dev",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      accessGrants: [UserPortal.DASHBOARD],
      passwordResetRequired: false,
      sessionVersion: 0,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.STUDENT,
      status: UserStatus.BLOCKED,
      accessGrants: [UserPortal.DASHBOARD],
      sessionVersion: 0,
    });

    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(clearSession).toHaveBeenCalled();
  });

  it("clears the session when the session version is stale", async () => {
    getSession.mockResolvedValue({
      userId: "user-2",
      name: "Version Drift",
      email: "drift@dsacommit.dev",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      accessGrants: [UserPortal.PROFILE],
      passwordResetRequired: false,
      sessionVersion: 0,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      accessGrants: [UserPortal.PROFILE],
      sessionVersion: 2,
    });

    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(clearSession).toHaveBeenCalled();
  });
});
