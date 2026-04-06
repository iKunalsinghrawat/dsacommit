"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

import { CareerTarget, Role, StudentLevel, UserPortal, UserStatus } from "@/generated/prisma/enums";
import { normalizeAccessGrants } from "@/lib/access-control";
import { buildSessionPayload, requireRole, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import {
  adminChangeUserStatusSchema,
  adminManageUserSchema,
  adminRemoveUserSchema,
  adminResetUserPasswordSchema,
  selfPasswordUpdateSchema,
} from "@/lib/validators/platform";
import { slugify } from "@/lib/utils";

type TransactionClient = Prisma.TransactionClient;

export type UserManagementActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  userId?: string;
};

function readOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function splitCsv(input?: string) {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function ensureUniqueUserEmail(email: string, userId: string) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.id !== userId) {
    throw new Error("Another account already uses that email address.");
  }
}

async function ensureUniqueUserSlug(slug: string, userId: string) {
  const existing = await prisma.user.findUnique({ where: { slug } });

  if (existing && existing.id !== userId) {
    throw new Error("That profile handle is already taken.");
  }
}

async function ensureUniqueCompanyName(name: string, companyId?: string | null) {
  const existing = await prisma.companyProfile.findUnique({
    where: { name },
  });

  if (existing && existing.id !== companyId) {
    throw new Error("Another company profile already uses that name.");
  }
}

async function uniqueCompanySlug(base: string, companyId?: string | null) {
  let candidate = slugify(base);
  let suffix = 1;

  while (true) {
    const existing = await prisma.companyProfile.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === companyId) {
      return candidate;
    }

    suffix += 1;
    candidate = `${slugify(base)}-${suffix}`;
  }
}

async function syncStudentSelections(
  tx: TransactionClient,
  userId: string,
  targetCompanyIds: string[],
  weakTopicIds: string[],
) {
  await tx.studentTargetCompany.deleteMany({ where: { studentId: userId } });
  await tx.studentWeakTopic.deleteMany({ where: { studentId: userId } });

  if (targetCompanyIds.length) {
    await tx.studentTargetCompany.createMany({
      data: targetCompanyIds.map((companyId) => ({ studentId: userId, companyId })),
      skipDuplicates: true,
    });
  }

  if (weakTopicIds.length) {
    await tx.studentWeakTopic.createMany({
      data: weakTopicIds.map((topicId) => ({ studentId: userId, topicId })),
      skipDuplicates: true,
    });
  }
}

async function revalidateUserManagementPaths() {
  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/community");
  revalidatePath("/companies");
  revalidatePath("/mentors");
}

async function updateRoleSpecificProfiles(
  tx: TransactionClient,
  userId: string,
  values: {
    role: Role;
    studentCurrentLevel?: StudentLevel;
    studentTarget?: CareerTarget;
    studentDailyAvailableHours?: number;
    studentPreferredLanguage?: string;
    studentAbout?: string;
    studentTargetCompanyIds: string[];
    studentWeakTopicIds: string[];
    mentorCompanyId?: string;
    mentorRoleTitle?: string;
    mentorExperienceYears?: number;
    mentorBio?: string;
    mentorExpertiseTags?: string;
    mentorOfficeHours?: string;
    companyName?: string;
    companyIndustry?: string;
    companyWebsite?: string;
    companyOverview?: string;
    userName: string;
  },
) {
  if (values.role === Role.STUDENT) {
    await tx.studentProfile.upsert({
      where: { userId },
      update: {
        currentLevel: values.studentCurrentLevel!,
        target: values.studentTarget!,
        dailyAvailableHours: values.studentDailyAvailableHours!,
        preferredLanguage: values.studentPreferredLanguage!,
        about: values.studentAbout,
      },
      create: {
        userId,
        currentLevel: values.studentCurrentLevel!,
        target: values.studentTarget!,
        dailyAvailableHours: values.studentDailyAvailableHours!,
        preferredLanguage: values.studentPreferredLanguage!,
        about: values.studentAbout,
      },
    });

    await syncStudentSelections(
      tx,
      userId,
      values.studentTargetCompanyIds,
      values.studentWeakTopicIds,
    );
  }

  if (values.role === Role.MENTOR) {
    await tx.mentorProfile.upsert({
      where: { userId },
      update: {
        companyId: values.mentorCompanyId,
        roleTitle: values.mentorRoleTitle!,
        experienceYears: values.mentorExperienceYears!,
        bio: values.mentorBio!,
        expertiseTags: splitCsv(values.mentorExpertiseTags),
        officeHours: values.mentorOfficeHours,
        verifiedBadge: true,
      },
      create: {
        userId,
        companyId: values.mentorCompanyId,
        roleTitle: values.mentorRoleTitle!,
        experienceYears: values.mentorExperienceYears!,
        bio: values.mentorBio!,
        expertiseTags: splitCsv(values.mentorExpertiseTags),
        verifiedBadge: true,
        officeHours: values.mentorOfficeHours,
        recommendedSetTitle: "Mentor curated set",
        recommendedSetSummary: "Guided practice set aligned with current company expectations.",
      },
    });
  }

  const existingOwnedCompany = await tx.companyProfile.findFirst({
    where: { ownerId: userId },
    select: { id: true, slug: true },
  });

  if (values.role === Role.COMPANY) {
    const companyName = values.companyName ?? `${values.userName} Labs`;
    await ensureUniqueCompanyName(companyName, existingOwnedCompany?.id);

    if (existingOwnedCompany) {
      await tx.companyProfile.update({
        where: { id: existingOwnedCompany.id },
        data: {
          ownerId: userId,
          name: companyName,
          industry: values.companyIndustry,
          website: values.companyWebsite,
          overview:
            values.companyOverview ??
            `${companyName} uses DSA Commit to share hiring focus and disciplined preparation guidance.`,
        },
      });
    } else {
      await tx.companyProfile.create({
        data: {
          ownerId: userId,
          name: companyName,
          slug: await uniqueCompanySlug(companyName),
          overview:
            values.companyOverview ??
            `${companyName} uses DSA Commit to share hiring focus and disciplined preparation guidance.`,
          industry: values.companyIndustry,
          website: values.companyWebsite,
          hiringFocusAreas: ["Arrays", "Trees", "Graphs"],
          commonFocusTopics: ["arrays", "trees", "graph"],
          rolePreferences: ["Intern", "Software Engineer"],
          oaPattern: ["Timed coding assessment"],
          interviewRounds: ["Online assessment", "Technical interview"],
          preparationTips: ["Focus on consistent medium-level problem solving."],
          recommendedRoadmap: ["arrays", "binary-search", "trees", "graph"],
        },
      });
    }
  } else if (existingOwnedCompany) {
    await tx.companyProfile.update({
      where: { id: existingOwnedCompany.id },
      data: {
        ownerId: null,
      },
    });
  }
}

async function saveManagedUser(
  actorId: string,
  targetUserId: string,
  values: Parameters<typeof updateRoleSpecificProfiles>[2] & {
    name: string;
    email: string;
    slug: string;
    status: UserStatus;
    accessGrants: UserPortal[];
    headline?: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    isVerified: boolean;
    isFeatured: boolean;
  },
) {
  const currentUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      studentProfile: true,
      mentorProfile: true,
      ownedCompany: true,
    },
  });

  if (!currentUser) {
    throw new Error("The selected user could not be found.");
  }

  if (currentUser.status === UserStatus.DELETED) {
    throw new Error("Removed accounts cannot be edited.");
  }

  if (
    actorId === targetUserId &&
    (currentUser.role !== values.role ||
      currentUser.status !== values.status ||
      JSON.stringify([...currentUser.accessGrants].sort()) !== JSON.stringify([...values.accessGrants].sort()))
  ) {
    throw new Error("Use your own profile settings for personal edits. Admin role, status, and access cannot be changed on your own account here.");
  }

  await ensureUniqueUserEmail(values.email, targetUserId);
  await ensureUniqueUserSlug(values.slug, targetUserId);

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        name: values.name,
        email: values.email,
        slug: values.slug,
        role: values.role,
        status: values.status,
        accessGrants: normalizeAccessGrants(values.role, values.accessGrants),
        headline: values.headline,
        bio: values.bio,
        location: values.location,
        avatarUrl: values.avatarUrl,
        githubUrl: values.githubUrl,
        linkedinUrl: values.linkedinUrl,
        portfolioUrl: values.portfolioUrl,
        isVerified: values.isVerified,
        isFeatured: values.isFeatured,
        sessionVersion: { increment: 1 },
        deletedAt: values.status === UserStatus.DELETED ? new Date() : null,
      },
    });

    await updateRoleSpecificProfiles(tx, targetUserId, {
      role: values.role,
      studentCurrentLevel: values.studentCurrentLevel,
      studentTarget: values.studentTarget,
      studentDailyAvailableHours: values.studentDailyAvailableHours,
      studentPreferredLanguage: values.studentPreferredLanguage,
      studentAbout: values.studentAbout,
      studentTargetCompanyIds: values.studentTargetCompanyIds,
      studentWeakTopicIds: values.studentWeakTopicIds,
      mentorCompanyId: values.mentorCompanyId,
      mentorRoleTitle: values.mentorRoleTitle,
      mentorExperienceYears: values.mentorExperienceYears,
      mentorBio: values.mentorBio,
      mentorExpertiseTags: values.mentorExpertiseTags,
      mentorOfficeHours: values.mentorOfficeHours,
      companyName: values.companyName,
      companyIndustry: values.companyIndustry,
      companyWebsite: values.companyWebsite,
      companyOverview: values.companyOverview,
      userName: values.name,
    });

    return tx.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        accessGrants: true,
        passwordResetRequired: true,
        sessionVersion: true,
      },
    });
  });

  if (!updatedUser) {
    throw new Error("The updated user could not be loaded.");
  }

  await revalidateUserManagementPaths();
  return updatedUser;
}

export async function updateManagedUserAction(formData: FormData): Promise<UserManagementActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = adminManageUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    slug: formData.get("slug"),
    role: formData.get("role"),
    status: formData.get("status"),
    accessGrants: formData.getAll("accessGrants").map(String),
    headline: readOptionalFormValue(formData, "headline"),
    bio: readOptionalFormValue(formData, "bio"),
    location: readOptionalFormValue(formData, "location"),
    avatarUrl: readOptionalFormValue(formData, "avatarUrl"),
    githubUrl: readOptionalFormValue(formData, "githubUrl"),
    linkedinUrl: readOptionalFormValue(formData, "linkedinUrl"),
    portfolioUrl: readOptionalFormValue(formData, "portfolioUrl"),
    isVerified: formData.get("isVerified"),
    isFeatured: formData.get("isFeatured"),
    studentCurrentLevel: formData.get("studentCurrentLevel"),
    studentTarget: formData.get("studentTarget"),
    studentDailyAvailableHours: formData.get("studentDailyAvailableHours"),
    studentPreferredLanguage: readOptionalFormValue(formData, "studentPreferredLanguage"),
    studentAbout: readOptionalFormValue(formData, "studentAbout"),
    studentTargetCompanyIds: formData.getAll("studentTargetCompanyIds").map(String),
    studentWeakTopicIds: formData.getAll("studentWeakTopicIds").map(String),
    mentorCompanyId: readOptionalFormValue(formData, "mentorCompanyId"),
    mentorRoleTitle: readOptionalFormValue(formData, "mentorRoleTitle"),
    mentorExperienceYears: formData.get("mentorExperienceYears"),
    mentorBio: readOptionalFormValue(formData, "mentorBio"),
    mentorExpertiseTags: readOptionalFormValue(formData, "mentorExpertiseTags"),
    mentorOfficeHours: readOptionalFormValue(formData, "mentorOfficeHours"),
    companyName: readOptionalFormValue(formData, "companyName"),
    companyIndustry: readOptionalFormValue(formData, "companyIndustry"),
    companyWebsite: readOptionalFormValue(formData, "companyWebsite"),
    companyOverview: readOptionalFormValue(formData, "companyOverview"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await saveManagedUser(admin.id, parsed.data.userId, {
      ...parsed.data,
      userName: parsed.data.name,
    });

    return {
      ok: true,
      message: "User account updated successfully.",
      userId: parsed.data.userId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update this user.",
    };
  }
}

export async function setManagedUserStatusAction(formData: FormData): Promise<UserManagementActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = adminChangeUserStatusSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid status update request." };
  }

  if (admin.id === parsed.data.userId && parsed.data.status !== UserStatus.ACTIVE) {
    return { ok: false, error: "You cannot block or deactivate your own admin account." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, status: true },
  });

  if (!targetUser) {
    return { ok: false, error: "The selected user could not be found." };
  }

  if (targetUser.status === UserStatus.DELETED) {
    return { ok: false, error: "Removed accounts cannot be reconfigured here." };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      status: parsed.data.status,
      deletedAt: parsed.data.status === UserStatus.DELETED ? new Date() : null,
      sessionVersion: { increment: 1 },
    },
  });

  await revalidateUserManagementPaths();

  return {
    ok: true,
    message:
      parsed.data.status === UserStatus.ACTIVE
        ? "User access restored."
        : parsed.data.status === UserStatus.BLOCKED
          ? "User blocked successfully."
          : "User account deactivated.",
    userId: parsed.data.userId,
  };
}

export async function removeManagedUserAction(formData: FormData): Promise<UserManagementActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = adminRemoveUserSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid remove request." };
  }

  if (admin.id === parsed.data.userId) {
    return { ok: false, error: "You cannot remove your own admin account." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    include: {
      ownedCompany: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!targetUser) {
    return { ok: false, error: "The selected user could not be found." };
  }

  const removedSuffix = `${Date.now()}-${targetUser.id.slice(-6)}`;

  await prisma.$transaction(async (tx) => {
    if (targetUser.ownedCompany) {
      await tx.companyProfile.update({
        where: { id: targetUser.ownedCompany.id },
        data: { ownerId: null },
      });
    }

    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        email: `removed+${removedSuffix}@dsacommit.local`,
        slug: `removed-${removedSuffix}`,
        name: "Removed User",
        role: targetUser.role,
        status: UserStatus.DELETED,
        accessGrants: [],
        headline: "Account removed by admin.",
        bio: null,
        location: null,
        avatarUrl: null,
        githubUrl: null,
        linkedinUrl: null,
        portfolioUrl: null,
        isVerified: false,
        isFeatured: false,
        passwordResetRequired: false,
        deletedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
  });

  await revalidateUserManagementPaths();

  return {
    ok: true,
    message: "User removed safely.",
    userId: parsed.data.userId,
  };
}

export async function resetManagedUserPasswordAction(formData: FormData): Promise<UserManagementActionState> {
  const admin = await requireRole([Role.ADMIN]);
  const parsed = adminResetUserPasswordSchema.safeParse({
    userId: formData.get("userId"),
    temporaryPassword: formData.get("temporaryPassword"),
    forcePasswordReset: formData.get("forcePasswordReset"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please use a stronger temporary password.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (admin.id === parsed.data.userId) {
    return { ok: false, error: "Use the profile settings page to change your own password." };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      passwordHash: await hashPassword(parsed.data.temporaryPassword),
      passwordResetRequired: parsed.data.forcePasswordReset,
      sessionVersion: { increment: 1 },
    },
  });

  await revalidateUserManagementPaths();

  return {
    ok: true,
    message: parsed.data.forcePasswordReset
      ? "Temporary password saved and password reset is required on next login."
      : "Temporary password saved successfully.",
    userId: parsed.data.userId,
  };
}

export async function updateOwnProfileAction(formData: FormData): Promise<UserManagementActionState> {
  const user = await requireUser();
  const parsed = adminManageUserSchema.safeParse({
    userId: user.id,
    name: formData.get("name"),
    email: user.email,
    slug: formData.get("slug"),
    role: user.role,
    status: user.status,
    accessGrants: user.accessGrants,
    headline: readOptionalFormValue(formData, "headline"),
    bio: readOptionalFormValue(formData, "bio"),
    location: readOptionalFormValue(formData, "location"),
    avatarUrl: readOptionalFormValue(formData, "avatarUrl"),
    githubUrl: readOptionalFormValue(formData, "githubUrl"),
    linkedinUrl: readOptionalFormValue(formData, "linkedinUrl"),
    portfolioUrl: readOptionalFormValue(formData, "portfolioUrl"),
    isVerified: user.isVerified ? "true" : "false",
    isFeatured: user.isFeatured ? "true" : "false",
    studentCurrentLevel: formData.get("studentCurrentLevel"),
    studentTarget: formData.get("studentTarget"),
    studentDailyAvailableHours: formData.get("studentDailyAvailableHours"),
    studentPreferredLanguage: readOptionalFormValue(formData, "studentPreferredLanguage"),
    studentAbout: readOptionalFormValue(formData, "studentAbout"),
    studentTargetCompanyIds: formData.getAll("studentTargetCompanyIds").map(String),
    studentWeakTopicIds: formData.getAll("studentWeakTopicIds").map(String),
    mentorCompanyId: readOptionalFormValue(formData, "mentorCompanyId"),
    mentorRoleTitle: readOptionalFormValue(formData, "mentorRoleTitle"),
    mentorExperienceYears: formData.get("mentorExperienceYears"),
    mentorBio: readOptionalFormValue(formData, "mentorBio"),
    mentorExpertiseTags: readOptionalFormValue(formData, "mentorExpertiseTags"),
    mentorOfficeHours: readOptionalFormValue(formData, "mentorOfficeHours"),
    companyName: readOptionalFormValue(formData, "companyName"),
    companyIndustry: readOptionalFormValue(formData, "companyIndustry"),
    companyWebsite: readOptionalFormValue(formData, "companyWebsite"),
    companyOverview: readOptionalFormValue(formData, "companyOverview"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await ensureUniqueUserSlug(parsed.data.slug, user.id);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          headline: parsed.data.headline,
          bio: parsed.data.bio,
          location: parsed.data.location,
          avatarUrl: parsed.data.avatarUrl,
          githubUrl: parsed.data.githubUrl,
          linkedinUrl: parsed.data.linkedinUrl,
          portfolioUrl: parsed.data.portfolioUrl,
        },
      });

      await updateRoleSpecificProfiles(tx, user.id, {
        role: user.role,
        studentCurrentLevel: parsed.data.studentCurrentLevel,
        studentTarget: parsed.data.studentTarget,
        studentDailyAvailableHours: parsed.data.studentDailyAvailableHours,
        studentPreferredLanguage: parsed.data.studentPreferredLanguage,
        studentAbout: parsed.data.studentAbout,
        studentTargetCompanyIds: parsed.data.studentTargetCompanyIds,
        studentWeakTopicIds: parsed.data.studentWeakTopicIds,
        mentorCompanyId: parsed.data.mentorCompanyId,
        mentorRoleTitle: parsed.data.mentorRoleTitle,
        mentorExperienceYears: parsed.data.mentorExperienceYears,
        mentorBio: parsed.data.mentorBio,
        mentorExpertiseTags: parsed.data.mentorExpertiseTags,
        mentorOfficeHours: parsed.data.mentorOfficeHours,
        companyName: parsed.data.companyName,
        companyIndustry: parsed.data.companyIndustry,
        companyWebsite: parsed.data.companyWebsite,
        companyOverview: parsed.data.companyOverview,
        userName: parsed.data.name,
      });
    });

    await revalidateUserManagementPaths();

    return {
      ok: true,
      message: "Profile updated successfully.",
      userId: user.id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save your profile right now.",
    };
  }
}

export async function updateOwnPasswordAction(formData: FormData): Promise<UserManagementActionState> {
  const user = await requireUser();
  const parsed = selfPasswordUpdateSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the password form.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      passwordHash: true,
      accessGrants: true,
      passwordResetRequired: true,
      sessionVersion: true,
    },
  });

  if (!currentUser) {
    return { ok: false, error: "Your account could not be loaded." };
  }

  const passwordMatches = await verifyPassword(parsed.data.currentPassword, currentUser.passwordHash);

  if (!passwordMatches) {
    return {
      ok: false,
      fieldErrors: {
        currentPassword: ["That password does not match your current account password."],
      },
      error: "Current password is incorrect.",
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      passwordResetRequired: false,
      sessionVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      accessGrants: true,
      passwordResetRequired: true,
      sessionVersion: true,
    },
  });

  await createSession(buildSessionPayload(updatedUser));
  await revalidateUserManagementPaths();

  return {
    ok: true,
    message: "Password updated successfully.",
    userId: user.id,
  };
}
