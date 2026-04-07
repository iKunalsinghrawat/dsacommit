import "server-only";

import { addDays, format, startOfDay, subDays } from "date-fns";

import { ChangeRequestStatus, Role, SubmissionState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isRecoverableRuntimeError, logServerError } from "@/lib/runtime-guards";

function isApprovalWorkflowSchemaError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    code === "P2021" ||
    code === "P2022" ||
    /ChangeRequest|RoadmapItem|isArchived|archivedAt/i.test(message)
  );
}

function buildHeatmap(checkins: Array<{ date: Date; minutesCommitted: number; solvedCount: number }>) {
  const byDate = new Map(
    checkins.map((checkin) => [
      format(startOfDay(checkin.date), "yyyy-MM-dd"),
      checkin,
    ]),
  );

  return Array.from({ length: 35 }, (_, index) => {
    const date = addDays(subDays(startOfDay(new Date()), 34), index);
    const key = format(date, "yyyy-MM-dd");
    const checkin = byDate.get(key);
    const intensity = checkin
      ? checkin.minutesCommitted >= 180
        ? 4
        : checkin.minutesCommitted >= 120
          ? 3
          : checkin.minutesCommitted >= 60
            ? 2
            : 1
      : 0;

    return {
      date,
      intensity,
      minutesCommitted: checkin?.minutesCommitted ?? 0,
      solvedCount: checkin?.solvedCount ?? 0,
    };
  });
}

const dashboardProblemSummarySelect = {
  id: true,
  title: true,
  slug: true,
  difficulty: true,
  estimatedMinutes: true,
  topic: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

const dashboardProblemWithCompanyTagsSelect = {
  ...dashboardProblemSummarySelect,
  companyTags: {
    select: {
      id: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} as const;

const appTopicSummarySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

const appCompanySummarySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

const appCommunityAuthorSelect = {
  id: true,
  name: true,
  email: true,
  slug: true,
  role: true,
  headline: true,
  isVerified: true,
} as const;

export async function getDashboardData(userId: string, role: Role) {
  try {
    if (role === Role.MENTOR) {
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          mentorProfile: {
            include: {
              company: true,
              followers: true,
              mentorPosts: { orderBy: { createdAt: "desc" } },
              questions: {
                include: {
                  student: {
                    include: {
                      user: true,
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });
    }

    if (role === Role.COMPANY) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownedCompany: {
            include: {
              roles: true,
              contents: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      });

      if (!user?.ownedCompany) {
        return user;
      }

      const topStudents = await prisma.user.findMany({
        where: {
          role: Role.STUDENT,
          studentProfile: {
            targetCompanies: {
              some: {
                companyId: user.ownedCompany.id,
              },
            },
          },
        },
        include: {
          studentProfile: true,
          streak: true,
        },
        orderBy: {
          studentProfile: {
            commitmentScore: "desc",
          },
        },
        take: 8,
      });

      return { ...user, topStudents };
    }

    if (role === Role.ADMIN) {
      const [users, companies, mentors, problems, reportedPosts] = await Promise.all([
        prisma.user.count(),
        prisma.companyProfile.count(),
        prisma.mentorProfile.count(),
        prisma.problem.count(),
        prisma.communityPost.findMany({
          where: { isReported: true },
          include: {
            author: {
              select: appCommunityAuthorSelect,
            },
            company: {
              select: appCompanySummarySelect,
            },
            topic: {
              select: appTopicSummarySelect,
            },
          },
        }),
      ]);

      return { users, companies, mentors, problems, reportedPosts };
    }

    const [user, bookmarks, revisionQueue, participations, checkins, progress, submissions] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            studentProfile: {
              include: {
                targetCompanies: {
                  include: {
                    company: {
                      select: appCompanySummarySelect,
                    },
                  },
                },
                weakTopics: {
                  include: {
                    topic: {
                      select: appTopicSummarySelect,
                    },
                  },
                },
              },
            },
            streak: true,
            userBadges: { include: { badge: true } },
          },
        }),
        prisma.bookmark.findMany({
          where: { userId },
          select: {
            id: true,
            problemId: true,
            problem: {
              select: dashboardProblemSummarySelect,
            },
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.revisionQueue.findMany({
          where: { userId },
          select: {
            id: true,
            problemId: true,
            reason: true,
            problem: {
              select: dashboardProblemSummarySelect,
            },
          },
          take: 8,
          orderBy: { remindOn: "asc" },
        }),
        prisma.challengeParticipation.findMany({
          where: { userId },
          include: { challenge: true },
          orderBy: { joinedAt: "desc" },
        }),
        prisma.dailyCheckin.findMany({
          where: {
            userId,
            date: { gte: subDays(startOfDay(new Date()), 34) },
          },
          orderBy: { date: "asc" },
        }),
        prisma.progress.findMany({
          where: { userId },
          include: {
            topic: {
              select: appTopicSummarySelect,
            },
          },
          orderBy: { completionPercentage: "asc" },
        }),
        prisma.submissionStatus.findMany({
          where: { userId },
          select: {
            id: true,
            problemId: true,
            status: true,
            problem: {
              select: dashboardProblemWithCompanyTagsSelect,
            },
          },
        }),
      ]);

    if (!user?.studentProfile) {
      return null;
    }

    const solvedProblemIds = new Set(
      submissions
        .filter((submission) => submission.status === SubmissionState.SOLVED)
        .map((submission) => submission.problemId),
    );

    const recommendedProblems = await prisma.problem.findMany({
      where: {
        topicId: {
          in: user.studentProfile.weakTopics.map((weakTopic) => weakTopic.topicId),
        },
        id: { notIn: [...solvedProblemIds] },
      },
      select: dashboardProblemWithCompanyTagsSelect,
      orderBy: [{ frequency: "desc" }, { difficulty: "asc" }],
      take: 6,
    });

    const targetCompanyTracker = user.studentProfile.targetCompanies.map((targetCompany) => {
      const taggedProblems = submissions.filter((submission) =>
        submission.problem.companyTags.some((tag) => tag.companyId === targetCompany.companyId),
      );
      const solved = taggedProblems.filter((submission) => submission.status === SubmissionState.SOLVED).length;

      return {
        company: targetCompany.company,
        solved,
        total: taggedProblems.length,
      };
    });

    const nextTopic = progress.find((topicProgress) => topicProgress.completionPercentage < 100);

    return {
      user,
      bookmarks,
      revisionQueue,
      participations,
      heatmap: buildHeatmap(checkins),
      progress,
      submissions,
      recommendedProblems,
      targetCompanyTracker,
      todayTask: recommendedProblems[0] ?? bookmarks[0]?.problem ?? null,
      nextTopic: nextTopic?.topic ?? null,
    };
  } catch (error) {
    logServerError("getDashboardData", error, { userId, role });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    if (role === Role.ADMIN) {
      return { users: 0, companies: 0, mentors: 0, problems: 0, reportedPosts: [] };
    }

    if (role === Role.MENTOR) {
      return { mentorProfile: null };
    }

    if (role === Role.COMPANY) {
      return { ownedCompany: null, topStudents: [] };
    }

    return null;
  }
}

export async function getProfileData(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            targetCompanies: {
              include: {
                company: {
                  select: appCompanySummarySelect,
                },
              },
            },
            weakTopics: {
              include: {
                topic: {
                  select: appTopicSummarySelect,
                },
              },
            },
          },
        },
        mentorProfile: {
          include: {
            company: {
              select: appCompanySummarySelect,
            },
            mentorPosts: true,
            followers: true,
          },
        },
        ownedCompany: { include: { roles: true, contents: true } },
        streak: true,
        userBadges: { include: { badge: true } },
        bookmarks: {
          take: 8,
          select: {
            id: true,
            problemId: true,
            problem: {
              select: dashboardProblemSummarySelect,
            },
          },
        },
      },
    });
  } catch (error) {
    logServerError("getProfileData", error, { userId });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return null;
  }
}

export async function getCompanyPortalData(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedCompany: {
          include: {
            roles: true,
            contents: { orderBy: { createdAt: "desc" } },
            problemTags: {
              select: {
                id: true,
                frequency: true,
                role: true,
                notes: true,
                problem: {
                  select: dashboardProblemSummarySelect,
                },
              },
            },
          },
        },
      },
    });

    if (!user?.ownedCompany) {
      return null;
    }

    const topStudents = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        studentProfile: {
          targetCompanies: {
            some: { companyId: user.ownedCompany.id },
          },
        },
      },
      include: {
        studentProfile: true,
        streak: true,
      },
      orderBy: {
        studentProfile: {
          commitmentScore: "desc",
        },
      },
      take: 10,
    });

    return { company: user.ownedCompany, topStudents };
  } catch (error) {
    logServerError("getCompanyPortalData", error, { userId });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return null;
  }
}

export async function getAdminPanelData() {
  try {
    const [users, mentors, companies, problems, topics, badges, reportedPosts, pendingChangeRequests] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.mentorProfile.findMany({
        where: {
          user: {
            role: Role.MENTOR,
          },
        },
        include: { user: true, company: true },
        take: 8,
      }),
      prisma.companyProfile.findMany({ take: 8 }),
      prisma.problem.findMany({ select: dashboardProblemSummarySelect, take: 10 }),
      prisma.topic.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          level: true,
          sortOrder: true,
        },
      }),
      prisma.badge.findMany({ orderBy: { pointValue: "desc" } }),
      prisma.communityPost.findMany({
        where: { isReported: true },
        include: {
          author: {
            select: appCommunityAuthorSelect,
          },
          topic: {
            select: appTopicSummarySelect,
          },
          company: {
            select: appCompanySummarySelect,
          },
        },
      }),
      prisma.changeRequest
        .count({
          where: { status: ChangeRequestStatus.PENDING },
        })
        .catch((error) => {
          if (!isApprovalWorkflowSchemaError(error)) {
            throw error;
          }

          return 0;
        }),
    ]);

    return { users, mentors, companies, problems, topics, badges, reportedPosts, pendingChangeRequests };
  } catch (error) {
    logServerError("getAdminPanelData", error);

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return {
      users: [],
      mentors: [],
      companies: [],
      problems: [],
      topics: [],
      badges: [],
      reportedPosts: [],
      pendingChangeRequests: 0,
    };
  }
}
