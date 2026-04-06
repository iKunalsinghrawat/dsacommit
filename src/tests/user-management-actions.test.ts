/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CareerTarget,
  Role,
  StudentLevel,
  UserPortal,
  UserStatus,
} from "@/generated/prisma/enums";

const requireRole = vi.fn();
const requireUser = vi.fn();
const buildSessionPayload = vi.fn((user) => user);
const createSession = vi.fn();
const revalidatePath = vi.fn();
const hashPassword = vi.fn(async (password: string) => `hashed:${password}`);
const verifyPassword = vi.fn(async () => true);

const prisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  companyProfile: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  studentProfile: {
    upsert: vi.fn(),
  },
  mentorProfile: {
    upsert: vi.fn(),
  },
  studentTargetCompany: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  studentWeakTopic: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
} as const;

vi.mock("@/lib/auth", () => ({
  requireRole,
  requireUser,
  buildSessionPayload,
}));

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("@/lib/session", () => ({
  createSession,
}));

vi.mock("@/lib/password", () => ({
  hashPassword,
  verifyPassword,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

const {
  removeManagedUserAction,
  resetManagedUserPasswordAction,
  setManagedUserStatusAction,
  updateManagedUserAction,
  updateOwnPasswordAction,
  updateOwnProfileAction,
} = await import("@/lib/actions/user-management-actions");

describe("user management actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    prisma.companyProfile.findFirst.mockResolvedValue(null);
    prisma.companyProfile.findUnique.mockResolvedValue(null);
    prisma.studentTargetCompany.deleteMany.mockResolvedValue({ count: 0 });
    prisma.studentTargetCompany.createMany.mockResolvedValue({ count: 0 });
    prisma.studentWeakTopic.deleteMany.mockResolvedValue({ count: 0 });
    prisma.studentWeakTopic.createMany.mockResolvedValue({ count: 0 });
    prisma.studentProfile.upsert.mockResolvedValue({});
    prisma.mentorProfile.upsert.mockResolvedValue({});
    prisma.companyProfile.update.mockResolvedValue({});
    prisma.companyProfile.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
  });

  it("lets an admin edit a user and persist role-safe access grants", async () => {
    requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        accessGrants: [UserPortal.DASHBOARD],
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user-1",
        email: "user-1@dsacommit.dev",
        name: "Updated Student",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        accessGrants: [UserPortal.DASHBOARD, UserPortal.PROBLEMS, UserPortal.PROFILE],
        passwordResetRequired: false,
        sessionVersion: 1,
      });

    const formData = new FormData();
    formData.set("userId", "user-1");
    formData.set("name", "Updated Student");
    formData.set("email", "user-1@dsacommit.dev");
    formData.set("slug", "updated-student");
    formData.set("role", Role.STUDENT);
    formData.set("status", UserStatus.ACTIVE);
    formData.set("studentCurrentLevel", StudentLevel.INTERMEDIATE);
    formData.set("studentTarget", CareerTarget.PLACEMENT);
    formData.set("studentDailyAvailableHours", "3");
    formData.set("studentPreferredLanguage", "TypeScript");
    formData.append("accessGrants", UserPortal.DASHBOARD);
    formData.append("accessGrants", UserPortal.PROBLEMS);
    formData.append("accessGrants", UserPortal.PROFILE);

    const result = await updateManagedUserAction(formData);

    expect(result.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          role: Role.STUDENT,
          accessGrants: [UserPortal.DASHBOARD, UserPortal.PROBLEMS, UserPortal.PROFILE],
        }),
      }),
    );
  });

  it("rejects invalid permission escalation in the validator", async () => {
    requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });

    const formData = new FormData();
    formData.set("userId", "user-2");
    formData.set("name", "Student Two");
    formData.set("email", "student-two@dsacommit.dev");
    formData.set("slug", "student-two");
    formData.set("role", Role.STUDENT);
    formData.set("status", UserStatus.ACTIVE);
    formData.set("studentCurrentLevel", StudentLevel.BEGINNER);
    formData.set("studentTarget", CareerTarget.INTERNSHIP);
    formData.set("studentDailyAvailableHours", "2");
    formData.set("studentPreferredLanguage", "Python");
    formData.append("accessGrants", UserPortal.ADMIN_PORTAL);

    const result = await updateManagedUserAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/highlighted fields/i);
    expect(result.fieldErrors?.accessGrants?.[0]).toMatch(/admin portal/i);
  });

  it("blocks non-admin access to admin actions", async () => {
    requireRole.mockRejectedValue(new Error("forbidden"));

    const formData = new FormData();
    formData.set("userId", "user-3");
    formData.set("status", UserStatus.BLOCKED);

    await expect(setManagedUserStatusAction(formData)).rejects.toThrow("forbidden");
  });

  it("allows an admin to block and later reactivate a user", async () => {
    requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    prisma.user.findUnique.mockResolvedValue({ id: "user-4", status: UserStatus.ACTIVE });

    const blockForm = new FormData();
    blockForm.set("userId", "user-4");
    blockForm.set("status", UserStatus.BLOCKED);

    const unblockForm = new FormData();
    unblockForm.set("userId", "user-4");
    unblockForm.set("status", UserStatus.ACTIVE);

    const blockResult = await setManagedUserStatusAction(blockForm);
    const unblockResult = await setManagedUserStatusAction(unblockForm);

    expect(blockResult.ok).toBe(true);
    expect(unblockResult.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ status: UserStatus.BLOCKED }),
      }),
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ status: UserStatus.ACTIVE }),
      }),
    );
  });

  it("soft-removes a user and clears identifying access", async () => {
    requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-5",
      role: Role.MENTOR,
      ownedCompany: { id: "company-1" },
    });

    const formData = new FormData();
    formData.set("userId", "user-5");

    const result = await removeManagedUserAction(formData);

    expect(result.ok).toBe(true);
    expect(prisma.companyProfile.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { ownerId: null },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UserStatus.DELETED,
          accessGrants: [],
          passwordResetRequired: false,
        }),
      }),
    );
  });

  it("stores a temporary password reset for a managed user", async () => {
    requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });

    const formData = new FormData();
    formData.set("userId", "user-6");
    formData.set("temporaryPassword", "TempPass1");
    formData.set("forcePasswordReset", "true");

    const result = await resetManagedUserPasswordAction(formData);

    expect(result.ok).toBe(true);
    expect(hashPassword).toHaveBeenCalledWith("TempPass1");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: "hashed:TempPass1",
          passwordResetRequired: true,
        }),
      }),
    );
  });

  it("lets a user update their own profile without changing protected fields", async () => {
    requireUser.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      email: "student-1@dsacommit.dev",
      status: UserStatus.ACTIVE,
      accessGrants: [UserPortal.PROFILE, UserPortal.DASHBOARD],
      isVerified: false,
      isFeatured: false,
    });
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("name", "Self Updated");
    formData.set("slug", "self-updated");
    formData.set("bio", "Focused on fixing recursion and graph confidence.");
    formData.set("studentCurrentLevel", StudentLevel.INTERMEDIATE);
    formData.set("studentTarget", CareerTarget.SWITCH);
    formData.set("studentDailyAvailableHours", "4");
    formData.set("studentPreferredLanguage", "Java");
    formData.set("role", Role.ADMIN);
    formData.append("accessGrants", UserPortal.ADMIN_PORTAL);

    const result = await updateOwnProfileAction(formData);

    expect(result.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Self Updated",
          bio: "Focused on fixing recursion and graph confidence.",
        }),
      }),
    );
    expect(prisma.user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: Role.ADMIN,
        }),
      }),
    );
  });

  it("updates the signed-in user's password and refreshes their session", async () => {
    requireUser.mockResolvedValue({ id: "student-2" });
    prisma.user.findUnique.mockResolvedValue({
      id: "student-2",
      email: "student-2@dsacommit.dev",
      name: "Student Two",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash: "old-hash",
      accessGrants: [UserPortal.PROFILE, UserPortal.DASHBOARD],
      passwordResetRequired: true,
      sessionVersion: 0,
    });
    prisma.user.update.mockResolvedValue({
      id: "student-2",
      email: "student-2@dsacommit.dev",
      name: "Student Two",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      accessGrants: [UserPortal.PROFILE, UserPortal.DASHBOARD],
      passwordResetRequired: false,
      sessionVersion: 1,
    });

    const formData = new FormData();
    formData.set("currentPassword", "OldPass1");
    formData.set("newPassword", "NewPass1");
    formData.set("confirmPassword", "NewPass1");

    const result = await updateOwnPasswordAction(formData);

    expect(result.ok).toBe(true);
    expect(hashPassword).toHaveBeenCalledWith("NewPass1");
    expect(createSession).toHaveBeenCalled();
    expect(buildSessionPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordResetRequired: false,
        sessionVersion: 1,
      }),
    );
  });
});
