import "server-only";

import { addDays, format, startOfDay, subDays } from "date-fns";

import { ChangeRequestStatus, Role, SubmissionState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

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

export async function getDashboardData(userId: string, role: Role) {
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
        include: { author: true, company: true, topic: true },
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
              targetCompanies: { include: { company: true } },
              weakTopics: { include: { topic: true } },
            },
          },
          streak: true,
          userBadges: { include: { badge: true } },
        },
      }),
      prisma.bookmark.findMany({
        where: { userId },
        include: { problem: { include: { topic: true } } },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.revisionQueue.findMany({
        where: { userId },
        include: { problem: { include: { topic: true } } },
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
        include: { topic: true },
        orderBy: { completionPercentage: "asc" },
      }),
      prisma.submissionStatus.findMany({
        where: { userId },
        include: {
          problem: {
            include: {
              topic: true,
              companyTags: { include: { company: true } },
            },
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
    include: {
      topic: true,
      companyTags: { include: { company: true } },
    },
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
}

export async function getProfileData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          targetCompanies: { include: { company: true } },
          weakTopics: { include: { topic: true } },
        },
      },
      mentorProfile: { include: { company: true, mentorPosts: true, followers: true } },
      ownedCompany: { include: { roles: true, contents: true } },
      streak: true,
      userBadges: { include: { badge: true } },
      bookmarks: { include: { problem: { include: { topic: true } } }, take: 8 },
    },
  });
}

export async function getCompanyPortalData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedCompany: {
        include: {
          roles: true,
          contents: { orderBy: { createdAt: "desc" } },
          problemTags: { include: { problem: { include: { topic: true } } } },
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
}

export async function getAdminPanelData() {
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
    prisma.problem.findMany({ include: { topic: true }, take: 10 }),
    prisma.topic.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.badge.findMany({ orderBy: { pointValue: "desc" } }),
    prisma.communityPost.findMany({
      where: { isReported: true },
      include: { author: true, topic: true, company: true },
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
}
