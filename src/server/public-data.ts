import "server-only";

import { CodeLanguage, Difficulty, Role, SubmissionState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const problemDetailBaseSelect = {
  id: true,
  title: true,
  slug: true,
  difficulty: true,
  problemStatement: true,
  examples: true,
  constraints: true,
  hints: true,
  editorial: true,
  similarProblemSlugs: true,
  roleFocus: true,
  frequency: true,
  estimatedMinutes: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  topic: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  companyTags: {
    select: {
      id: true,
      frequency: true,
      role: true,
      notes: true,
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

const problemWorkspaceSelect = {
  codeExecutionEnabled: true,
  starterCode: true,
  starterLanguage: true,
  testCases: {
    where: { isHidden: false },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      label: true,
      input: true,
      expectedOutput: true,
      isHidden: true,
      sortOrder: true,
    },
  },
} as const;

function getPrismaErrorDetails(error: unknown) {
  return {
    code:
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "",
    message: error instanceof Error ? error.message : String(error ?? ""),
  };
}

function isApprovalWorkflowSchemaError(error: unknown) {
  const { code, message } = getPrismaErrorDetails(error);

  return (
    code === "P2021" ||
    code === "P2022" ||
    /RoadmapItem|ChangeRequest|isArchived|archivedAt/i.test(message)
  );
}

function isProblemWorkspaceSchemaError(error: unknown) {
  const { code, message } = getPrismaErrorDetails(error);

  return (
    code === "P2021" ||
    code === "P2022" ||
    /ProblemTestCase|CodeDraft|CodeSubmission|codeExecutionEnabled|starterCode|starterLanguage/i.test(message)
  );
}

function getFallbackProblemWorkspaceState() {
  return {
    codeExecutionEnabled: false,
    starterCode: null,
    starterLanguage: CodeLanguage.TYPESCRIPT,
    testCases: [],
  };
}

function buildRoadmapGroups<T extends { level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" }>(items: T[]) {
  return {
    BEGINNER: items.filter((item) => item.level === "BEGINNER"),
    INTERMEDIATE: items.filter((item) => item.level === "INTERMEDIATE"),
    ADVANCED: items.filter((item) => item.level === "ADVANCED"),
  };
}

async function getFallbackRoadmapData() {
  const topics = await prisma.topic.findMany({
    include: {
      problems: {
        select: { id: true },
      },
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });

  return buildRoadmapGroups(
    topics.map((topic) => ({
      id: topic.id,
      title: topic.name,
      slug: topic.slug,
      level: topic.level,
      summary: topic.conceptSummary,
      details: topic.notes,
      sortOrder: topic.sortOrder,
      topic: {
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        estimatedHours: topic.estimatedHours,
        problems: topic.problems,
      },
    })),
  );
}

async function fetchProblemRecord(input: {
  id: string;
  supportsArchiveFilter: boolean;
  supportsWorkspace: boolean;
}) {
  const problem = await prisma.problem.findFirst({
    where: input.supportsArchiveFilter ? { id: input.id, isArchived: false } : { id: input.id },
    select: input.supportsWorkspace
      ? {
          ...problemDetailBaseSelect,
          ...problemWorkspaceSelect,
        }
      : problemDetailBaseSelect,
  });

  if (!problem) {
    return null;
  }

  if (!input.supportsWorkspace) {
    return {
      ...problem,
      ...getFallbackProblemWorkspaceState(),
    };
  }

  return problem;
}

async function getProblemRecord(id: string) {
  try {
    const problem = await fetchProblemRecord({
      id,
      supportsArchiveFilter: true,
      supportsWorkspace: true,
    });

    return {
      problem,
      workspaceSchemaAvailable: true,
      archiveSchemaAvailable: true,
    };
  } catch (error) {
    if (!isProblemWorkspaceSchemaError(error) && !isApprovalWorkflowSchemaError(error)) {
      throw error;
    }

    const supportsArchiveFilter = !isApprovalWorkflowSchemaError(error);
    const supportsWorkspace = !isProblemWorkspaceSchemaError(error);

    try {
      const fallbackProblem = await fetchProblemRecord({
        id,
        supportsArchiveFilter,
        supportsWorkspace,
      });

      return {
        problem: fallbackProblem,
        workspaceSchemaAvailable: supportsWorkspace,
        archiveSchemaAvailable: supportsArchiveFilter,
      };
    } catch (retryError) {
      if (!supportsWorkspace || !isProblemWorkspaceSchemaError(retryError)) {
        throw retryError;
      }

      const fallbackProblem = await fetchProblemRecord({
        id,
        supportsArchiveFilter,
        supportsWorkspace: false,
      });

      return {
        problem: fallbackProblem,
        workspaceSchemaAvailable: false,
        archiveSchemaAvailable: supportsArchiveFilter,
      };
    }
  }
}

async function getCodeWorkspaceRecords(input: {
  userId?: string;
  problemId: string;
  workspaceSchemaAvailable: boolean;
}) {
  if (!input.userId || !input.workspaceSchemaAvailable) {
    return {
      codeDrafts: [],
      codeSubmissions: [],
    };
  }

  try {
    const [codeDrafts, codeSubmissions] = await Promise.all([
      prisma.codeDraft.findMany({
        where: { userId: input.userId, problemId: input.problemId },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.codeSubmission.findMany({
        where: { userId: input.userId, problemId: input.problemId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      codeDrafts,
      codeSubmissions,
    };
  } catch (error) {
    if (!isProblemWorkspaceSchemaError(error)) {
      throw error;
    }

    return {
      codeDrafts: [],
      codeSubmissions: [],
    };
  }
}

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
  try {
    const items = await prisma.roadmapItem.findMany({
      where: { isArchived: false },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            slug: true,
            estimatedHours: true,
            problems: {
              where: { isArchived: false },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    });

    return buildRoadmapGroups(items);
  } catch (error) {
    if (!isApprovalWorkflowSchemaError(error)) {
      throw error;
    }

    return getFallbackRoadmapData();
  }
}

export async function getTopicsList() {
  try {
    return await prisma.topic.findMany({
      where: { isArchived: false },
      include: {
        problems: {
          where: { isArchived: false },
        },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    });
  } catch (error) {
    if (!isApprovalWorkflowSchemaError(error)) {
      throw error;
    }

    return prisma.topic.findMany({
      include: {
        problems: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    });
  }
}

export async function getTopicBySlug(slug: string) {
  try {
    return await prisma.topic.findFirst({
      where: { slug, isArchived: false },
      include: {
        problems: {
          where: { isArchived: false },
          include: {
            companyTags: { include: { company: true } },
          },
          orderBy: [{ difficulty: "asc" }, { frequency: "desc" }],
        },
      },
    });
  } catch (error) {
    if (!isApprovalWorkflowSchemaError(error)) {
      throw error;
    }

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
}

export async function getProblemsList(filters?: {
  topic?: string;
  company?: string;
  difficulty?: Difficulty;
  role?: string;
}) {
  const baseWhere = {
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
  };

  try {
    return await prisma.problem.findMany({
      where: {
        ...baseWhere,
        isArchived: false,
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
  } catch (error) {
    if (!isApprovalWorkflowSchemaError(error)) {
      throw error;
    }

    return prisma.problem.findMany({
      where: baseWhere,
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
}

export async function getProblemById(id: string, userId?: string) {
  const [{ problem, workspaceSchemaAvailable, archiveSchemaAvailable }, submission, bookmark, revision] =
    await Promise.all([
    getProblemRecord(id),
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
    ]);

  if (!problem) {
    return null;
  }

  const normalizedProblem = {
    ...getFallbackProblemWorkspaceState(),
    ...problem,
  };

  const { codeDrafts, codeSubmissions } = await getCodeWorkspaceRecords({
    userId,
    problemId: id,
    workspaceSchemaAvailable,
  });

  const similarProblems = normalizedProblem.similarProblemSlugs.length
    ? await prisma.problem.findMany({
        where: {
          ...(archiveSchemaAvailable ? { isArchived: false } : {}),
          slug: { in: normalizedProblem.similarProblemSlugs },
        },
        select: {
          id: true,
          title: true,
          topic: {
            select: {
              name: true,
            },
          },
        },
      })
    : [];

  return {
    problem: normalizedProblem,
    similarProblems,
    submissionStatus: submission ?? null,
    isBookmarked: Boolean(bookmark),
    inRevisionQueue: Boolean(revision),
    codeDrafts,
    latestCodeSubmissions: codeSubmissions.reduce<Array<(typeof codeSubmissions)[number]>>(
      (accumulator, submissionItem) => {
        if (!accumulator.some((existing) => existing.language === submissionItem.language)) {
          accumulator.push(submissionItem);
        }

        return accumulator;
      },
      [],
    ),
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
    prisma.topic
      .findMany({ where: { isArchived: false }, orderBy: { sortOrder: "asc" } })
      .catch((error) => {
        if (!isApprovalWorkflowSchemaError(error)) {
          throw error;
        }

        return prisma.topic.findMany({ orderBy: { sortOrder: "asc" } });
      }),
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
