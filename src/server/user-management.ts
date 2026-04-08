import "server-only";

import { Role, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isRecoverableRuntimeError, logServerError } from "@/lib/runtime-guards";

type UserManagementFilters = {
  search?: string;
  role?: Role | "ALL";
  status?: UserStatus | "ALL";
  userId?: string;
};

const managementTopicSummarySelect = {
  id: true,
  name: true,
  slug: true,
  level: true,
  sortOrder: true,
} as const;

const managementCompanySummarySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

export async function getAdminUserManagementData(filters: UserManagementFilters) {
  const search = filters.search?.trim();

  try {
    const where = {
      role: filters.role && filters.role !== "ALL" ? filters.role : undefined,
      status: filters.status && filters.status !== "ALL" ? filters.status : undefined,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ]
        : undefined,
    };

    const [users, totalUsers, activeUsers, blockedUsers, deactivatedUsers, removedUsers, topics, companies] =
      await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,
            role: true,
            status: true,
            headline: true,
            isVerified: true,
            isFeatured: true,
            accessGrants: true,
            passwordResetRequired: true,
            createdAt: true,
            lastActiveAt: true,
            studentProfile: {
              select: {
                currentLevel: true,
                target: true,
              },
            },
            mentorProfile: {
              select: {
                roleTitle: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            ownedCompany: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.user.count(),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.BLOCKED } }),
        prisma.user.count({ where: { status: UserStatus.DEACTIVATED } }),
        prisma.user.count({ where: { status: UserStatus.DELETED } }),
        prisma.topic.findMany({
          orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
          select: managementTopicSummarySelect,
        }),
        prisma.companyProfile.findMany({ orderBy: { name: "asc" } }),
      ]);

    const selectedUserId =
      filters.userId && users.some((user) => user.id === filters.userId)
        ? filters.userId
        : users[0]?.id;

    const selectedUser = selectedUserId
      ? await prisma.user.findUnique({
          where: { id: selectedUserId },
          include: {
            studentProfile: {
              include: {
                targetCompanies: {
                  include: {
                    company: {
                      select: managementCompanySummarySelect,
                    },
                  },
                },
                weakTopics: {
                  include: {
                    topic: {
                      select: managementTopicSummarySelect,
                    },
                  },
                },
              },
            },
            mentorProfile: {
              include: {
                company: {
                  select: managementCompanySummarySelect,
                },
              },
            },
            ownedCompany: {
              select: {
                ...managementCompanySummarySelect,
                overview: true,
                industry: true,
                website: true,
              },
            },
          },
        })
      : null;

    return {
      users,
      selectedUser,
      topics,
      companies,
      filters: {
        search: filters.search ?? "",
        role: filters.role ?? "ALL",
        status: filters.status ?? "ALL",
        userId: selectedUserId ?? null,
      },
      totals: {
        totalUsers,
        activeUsers,
        blockedUsers,
        deactivatedUsers,
        removedUsers,
      },
    };
  } catch (error) {
    logServerError("getAdminUserManagementData", error, filters);

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return {
      users: [],
      selectedUser: null,
      topics: [],
      companies: [],
      filters: {
        search: filters.search ?? "",
        role: filters.role ?? "ALL",
        status: filters.status ?? "ALL",
        userId: null,
      },
      totals: {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        deactivatedUsers: 0,
        removedUsers: 0,
      },
    };
  }
}
