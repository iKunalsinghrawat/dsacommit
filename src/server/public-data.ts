import "server-only";

import { Difficulty, Role, SubmissionState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function getLandingPageData() {
  const [featuredCompanies, featuredMentors, topStudents, featuredChallenges, wallPosts] =
    await Promise.all([
      prisma.companyProfile.findMany({
        where: { featured: true },
        orderBy: { name: "asc" },
        take: 6,
      }),
      prisma.mentorProfile.findMany({
        where: { featured: true, user: { role: Role.MENTOR } },
        include: {
          user: true,
          company: true,
          followers: true,
          mentorPosts: { take: 2, orderBy: { createdAt: "desc" } },
        },
        take: 4,
      }),
      prisma.user.findMany({
        where: { role: Role.STUDENT },
        include: {
          studentProfile: true,
          streak: true,
        },
        orderBy: {
          studentProfile: {
            commitmentScore: "desc",
          },
        },
        take: 6,
      }),
      prisma.challenge.findMany({
        where: { isFeatured: true },
        orderBy: { durationDays: "asc" },
        take: 2,
      }),
      prisma.commitmentPost.findMany({
        where: { isPublic: true },
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    featuredCompanies,
    featuredMentors,
    topStudents,
    featuredChallenges,
    wallPosts,
  };
}

export async function getRoadmapData() {
  const topics = await prisma.topic.findMany({
    include: {
      problems: { select: { id: true } },
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });

  const grouped = {
    BEGINNER: topics.filter((topic) => topic.level === "BEGINNER"),
    INTERMEDIATE: topics.filter((topic) => topic.level === "INTERMEDIATE"),
    ADVANCED: topics.filter((topic) => topic.level === "ADVANCED"),
  };

  return grouped;
}

export async function getTopicsList() {
  return prisma.topic.findMany({
    include: {
      problems: true,
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getTopicBySlug(slug: string) {
  return prisma.topic.findUnique({
    where: { slug },
    include: {
      problems: {
        include: {
          companyTags: { include: { company: true } },
        },
        orderBy: [{ difficulty: "asc" }, { frequency: "desc" }],
      },
    },
  });
}

export async function getProblemsList(filters?: {
  topic?: string;
  company?: string;
  difficulty?: Difficulty;
  role?: string;
}) {
  return prisma.problem.findMany({
    where: {
      topic: filters?.topic ? { slug: filters.topic } : undefined,
      difficulty: filters?.difficulty,
      roleFocus: filters?.role ?? undefined,
      companyTags: filters?.company
        ? {
            some: {
              company: {
                slug: filters.company,
              },
            },
          }
        : undefined,
    },
    include: {
      topic: true,
      companyTags: {
        include: {
          company: true,
        },
      },
    },
    orderBy: [{ frequency: "desc" }, { difficulty: "asc" }, { title: "asc" }],
  });
}

export async function getProblemById(id: string, userId?: string) {
  const [problem, submission, bookmark, revision, latestCodeSubmission] = await Promise.all([
    prisma.problem.findUnique({
      where: { id },
      include: {
        topic: true,
        companyTags: { include: { company: true } },
        testCases: {
          where: { isHidden: false },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    userId
      ? prisma.submissionStatus.findUnique({
          where: { userId_problemId: { userId, problemId: id } },
        })
      : null,
    userId
      ? prisma.bookmark.findUnique({
          where: { userId_problemId: { userId, problemId: id } },
        })
      : null,
    userId
      ? prisma.revisionQueue.findUnique({
          where: { userId_problemId: { userId, problemId: id } },
        })
      : null,
    userId
      ? prisma.codeSubmission.findFirst({
          where: { userId, problemId: id },
          orderBy: { createdAt: "desc" },
        })
      : null,
  ]);

  if (!problem) {
    return null;
  }

  const similarProblems = problem.similarProblemSlugs.length
    ? await prisma.problem.findMany({
        where: {
          slug: { in: problem.similarProblemSlugs },
        },
        include: { topic: true },
      })
    : [];

  return {
    problem,
    similarProblems,
    submissionStatus: submission ?? null,
    isBookmarked: Boolean(bookmark),
    inRevisionQueue: Boolean(revision),
    latestCodeSubmission,
  };
}

export async function getCompaniesList() {
  return prisma.companyProfile.findMany({
    include: {
      mentors: {
        where: {
          user: {
            role: Role.MENTOR,
          },
        },
        include: { user: true },
      },
      problemTags: { include: { problem: true } },
      roles: true,
      contents: true,
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
}

export async function getCompanyBySlug(slug: string) {
  return prisma.companyProfile.findUnique({
    where: { slug },
    include: {
      mentors: {
        where: {
          user: {
            role: Role.MENTOR,
          },
        },
        include: {
          user: true,
        },
      },
      problemTags: {
        include: {
          problem: {
            include: {
              topic: true,
            },
          },
        },
        orderBy: { frequency: "desc" },
      },
      roles: true,
      contents: true,
    },
  });
}

export async function getMentorsList() {
  return prisma.mentorProfile.findMany({
    where: {
      user: {
        role: Role.MENTOR,
      },
    },
    include: {
      user: true,
      company: true,
      followers: true,
      mentorPosts: {
        orderBy: { createdAt: "desc" },
        take: 2,
      },
    },
    orderBy: [{ featured: "desc" }, { experienceYears: "desc" }],
  });
}

export async function getMentorBySlug(slug: string, studentId?: string) {
  const mentor = await prisma.mentorProfile.findFirst({
    where: {
      user: {
        role: Role.MENTOR,
        slug,
      },
    },
    include: {
      user: true,
      company: true,
      followers: true,
      mentorPosts: {
        orderBy: { createdAt: "desc" },
      },
      questions: {
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!mentor) {
    return null;
  }

  const isFollowing = studentId
    ? await prisma.mentorFollower.findFirst({
        where: { mentorId: mentor.userId, studentId },
      })
    : null;

  const recommendedProblems = mentor.mentorPosts.length
    ? await prisma.problem.findMany({
        where: {
          slug: {
            in: mentor.mentorPosts.flatMap((post) => post.recommendedProblemSlugs),
          },
        },
        include: {
          topic: true,
          companyTags: { include: { company: true } },
        },
      })
    : [];

  return {
    mentor,
    isFollowing: Boolean(isFollowing),
    recommendedProblems,
  };
}

export async function getCommunityFeed() {
  return prisma.communityPost.findMany({
    include: {
      author: true,
      topic: true,
      company: true,
      comments: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCatalogMeta() {
  const [topics, companies] = await Promise.all([
    prisma.topic.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.companyProfile.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { topics, companies };
}

export async function getLeaderboard() {
  return prisma.user.findMany({
    where: { role: Role.STUDENT },
    include: {
      studentProfile: true,
      streak: true,
    },
    orderBy: [
      { studentProfile: { commitmentScore: "desc" } },
      { studentProfile: { weeklyConsistencyScore: "desc" } },
      { studentProfile: { questionsSolvedCount: "desc" } },
    ],
    take: 12,
  });
}

export async function getStudentProblemState(userId: string) {
  const states = await prisma.submissionStatus.findMany({
    where: { userId },
  });

  return {
    solved: new Set(
      states.filter((state) => state.status === SubmissionState.SOLVED).map((state) => state.problemId),
    ),
    attempted: new Set(
      states.filter((state) => state.status === SubmissionState.ATTEMPTED).map((state) => state.problemId),
    ),
  };
}
