"use server";

import { CareerTarget, Role, StudentLevel, UserStatus } from "@/generated/prisma/enums";
import { getDefaultAccessGrants } from "@/lib/access-control";
import { getAuthRuntimeSummary } from "@/lib/auth-config";
import { authSessionUserSelect, buildSessionPayload, getHomeForRole } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  isMissingAuthConfigurationError,
  isMissingDatabaseConfigurationError,
  isRecoverableRuntimeError,
  logServerError,
} from "@/lib/runtime-guards";
import { createSession, clearSession } from "@/lib/session";
import { splitCsv, signInSchema, signUpSchema } from "@/lib/validators/auth";
import { slugify } from "@/lib/utils";
import { redirect } from "next/navigation";

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function uniqueUserSlug(base: string) {
  let candidate = slugify(base);
  let suffix = 1;

  while (await prisma.user.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${slugify(base)}-${suffix}`;
  }

  return candidate;
}

async function uniqueCompanySlug(base: string) {
  let candidate = slugify(base);
  let suffix = 1;

  while (await prisma.companyProfile.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${slugify(base)}-${suffix}`;
  }

  return candidate;
}

async function findOrCreateCompanyByName(companyName: string, ownerId?: string) {
  const normalizedSlug = slugify(companyName);
  const existing = await prisma.companyProfile.findFirst({
    where: {
      OR: [{ slug: normalizedSlug }, { name: companyName }],
    },
  });

  if (existing) {
    if (ownerId && !existing.ownerId) {
      return prisma.companyProfile.update({
        where: { id: existing.id },
        data: { ownerId },
      });
    }

    return existing;
  }

  return prisma.companyProfile.create({
    data: {
      ownerId,
      name: companyName,
      slug: await uniqueCompanySlug(companyName),
      overview: `${companyName} joined DSA Commit to publish preparation guidance and discover disciplined student talent.`,
      industry: "Technology",
      website: "",
      hiringFocusAreas: ["Arrays", "Trees", "Graphs"],
      commonFocusTopics: ["arrays", "trees", "graph"],
      rolePreferences: ["Intern", "Software Engineer"],
      oaPattern: ["Online assessment with DSA fundamentals and implementation questions"],
      interviewRounds: ["Technical coding round", "Manager discussion"],
      preparationTips: [
        "Stay consistent on medium-level problems.",
        "Practice aloud before timed interviews.",
      ],
      recommendedRoadmap: ["arrays", "binary-search", "trees", "graph"],
      featured: false,
    },
  });
}

export async function signInAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: {
        ...authSessionUserSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      return { error: "No account found for that email address." };
    }

    const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordMatches) {
      return { error: "Incorrect password. Try again." };
    }

    if (user.status === UserStatus.BLOCKED) {
      return { error: "This account has been blocked by an admin. Contact support if you think this is a mistake." };
    }

    if (user.status === UserStatus.DEACTIVATED) {
      return { error: "This account has been deactivated. Reach out to the platform admin to restore access." };
    }

    if (user.status === UserStatus.DELETED) {
      return { error: "This account is no longer available." };
    }

    await createSession(
      buildSessionPayload({
        ...user,
        accessGrants: user.accessGrants.length ? user.accessGrants : getDefaultAccessGrants(user.role),
      }),
    );

    if (user.passwordResetRequired) {
      redirect("/profile?passwordReset=required");
    }

    redirect(getHomeForRole(user.role, user.accessGrants));
  } catch (error) {
    logServerError("signInAction", error, {
      email: parsed.data.email.toLowerCase(),
      runtime: getAuthRuntimeSummary(),
    });

    if (isMissingAuthConfigurationError(error)) {
      return {
        error: "Sign in is unavailable until the authentication secret is configured on the server.",
      };
    }

    if (isMissingDatabaseConfigurationError(error)) {
      return {
        error: "Sign in is unavailable until the database connection is configured on the server.",
      };
    }

    if (isRecoverableRuntimeError(error)) {
      return { error: "Sign in is temporarily unavailable. Check your runtime configuration and try again." };
    }

    throw error;
  }
}

export async function signUpAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role"),
    currentLevel: formData.get("currentLevel") || undefined,
    target: formData.get("target") || undefined,
    dailyAvailableHours: formData.get("dailyAvailableHours") || undefined,
    targetCompanies: formData.getAll("targetCompanies").map(String),
    weakTopics: formData.getAll("weakTopics").map(String),
    preferredLanguage: formData.get("preferredLanguage") || undefined,
    companyName: formData.get("companyName") || undefined,
    roleTitle: formData.get("roleTitle") || undefined,
    experienceYears: formData.get("experienceYears") || undefined,
    expertiseTags: formData.get("expertiseTags") || undefined,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const slug = await uniqueUserSlug(parsed.data.name);

    if (parsed.data.role === Role.STUDENT) {
      const targetCompanies = await prisma.companyProfile.findMany({
        where: { slug: { in: parsed.data.targetCompanies } },
        select: { id: true, slug: true },
      });
      const weakTopics = await prisma.topic.findMany({
        where: { slug: { in: parsed.data.weakTopics } },
        select: { id: true, slug: true },
      });

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: parsed.data.name,
          slug,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          accessGrants: getDefaultAccessGrants(Role.STUDENT),
          headline: "Just committed to a structured DSA journey.",
          bio: "New student account created through the onboarding flow.",
          isOnboarded: true,
          studentProfile: {
            create: {
              currentLevel: parsed.data.currentLevel ?? StudentLevel.BEGINNER,
              target: parsed.data.target ?? CareerTarget.PLACEMENT,
              dailyAvailableHours: parsed.data.dailyAvailableHours ?? 2,
              preferredLanguage: parsed.data.preferredLanguage ?? "C++",
              about: "Focused on building daily discipline with a roadmap-first approach.",
              targetCompanies: {
                create: targetCompanies.map((company) => ({
                  companyId: company.id,
                })),
              },
              weakTopics: {
                create: weakTopics.map((topic) => ({
                  topicId: topic.id,
                })),
              },
            },
          },
        },
        select: authSessionUserSelect,
      });

      await createSession(buildSessionPayload(user));
      redirect(getHomeForRole(user.role, user.accessGrants));
    }

    if (parsed.data.role === Role.MENTOR) {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: parsed.data.name,
          slug,
          role: Role.MENTOR,
          status: UserStatus.ACTIVE,
          accessGrants: getDefaultAccessGrants(Role.MENTOR),
          headline: "Mentor profile on DSA Commit.",
          bio: "Shares guidance, structure, and company-facing preparation advice.",
          isOnboarded: true,
          isVerified: true,
        },
        select: authSessionUserSelect,
      });

      const company = await findOrCreateCompanyByName(parsed.data.companyName ?? "Independent Mentor");
      await prisma.mentorProfile.create({
        data: {
          userId: user.id,
          companyId: company.id,
          roleTitle: parsed.data.roleTitle ?? "Software Engineer",
          experienceYears: parsed.data.experienceYears ?? 2,
          bio: `Mentor from ${company.name} helping students move from random practice to disciplined execution.`,
          expertiseTags: splitCsv(parsed.data.expertiseTags).slice(0, 6),
          verifiedBadge: true,
          officeHours: "Weekend office hours coming soon",
          recommendedSetTitle: "Starter mentor set",
          recommendedSetSummary: "A practical set focused on consistency before complexity.",
        },
      });

      await createSession(buildSessionPayload(user));
      redirect(getHomeForRole(user.role, user.accessGrants));
    }

    if (parsed.data.role === Role.COMPANY) {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: parsed.data.name,
          slug,
          role: Role.COMPANY,
          status: UserStatus.ACTIVE,
          accessGrants: getDefaultAccessGrants(Role.COMPANY),
          headline: "Company portal owner on DSA Commit.",
          bio: "Publishes hiring focus areas, challenges, and company preparation content.",
          isOnboarded: true,
          isVerified: true,
        },
        select: authSessionUserSelect,
      });

      await findOrCreateCompanyByName(parsed.data.companyName ?? `${parsed.data.name} Labs`, user.id);

      await createSession(buildSessionPayload(user));
      redirect(getHomeForRole(user.role, user.accessGrants));
    }

    return { error: "Unsupported role selection." };
  } catch (error) {
    logServerError("signUpAction", error, {
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      runtime: getAuthRuntimeSummary(),
    });

    if (isMissingAuthConfigurationError(error)) {
      return {
        error: "Sign up is unavailable until the authentication secret is configured on the server.",
      };
    }

    if (isMissingDatabaseConfigurationError(error)) {
      return {
        error: "Sign up is unavailable until the database connection is configured on the server.",
      };
    }

    if (isRecoverableRuntimeError(error)) {
      return { error: "Sign up is temporarily unavailable. Check your runtime configuration and try again." };
    }

    throw error;
  }
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}
