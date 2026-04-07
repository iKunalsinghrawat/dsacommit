import "server-only";

import type { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  ChangeRequestStatus,
  type CodeLanguage,
  type Difficulty,
  type RoadmapLevel,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  problemRequestDataSchema,
  roadmapItemRequestDataSchema,
  topicRequestDataSchema,
} from "@/lib/validators/platform";

type PrismaTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export type TopicChangeRequestData = z.infer<typeof topicRequestDataSchema>;
export type RoadmapItemChangeRequestData = z.infer<typeof roadmapItemRequestDataSchema>;
export type ProblemChangeRequestData = z.infer<typeof problemRequestDataSchema>;

type TopicSnapshot = TopicChangeRequestData & {
  id: string;
  isArchived: boolean;
};

type RoadmapItemSnapshot = RoadmapItemChangeRequestData & {
  id: string;
  isArchived: boolean;
};

type ProblemSnapshot = ProblemChangeRequestData & {
  id: string;
  isArchived: boolean;
};

function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function ensureTopicExists(tx: PrismaTransaction, topicId: string) {
  const topic = await tx.topic.findUnique({
    where: { id: topicId },
    select: { id: true, isArchived: true },
  });

  if (!topic || topic.isArchived) {
    throw new Error("The selected topic is not available in the live catalog.");
  }
}

async function ensureUniqueTopicSlug(tx: PrismaTransaction, slug: string, excludeId?: string) {
  const topic = await tx.topic.findFirst({
    where: {
      slug,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });

  if (topic) {
    throw new Error("Another live topic already uses this slug.");
  }
}

async function ensureUniqueRoadmapSlug(tx: PrismaTransaction, slug: string, excludeId?: string) {
  const item = await tx.roadmapItem.findFirst({
    where: {
      slug,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });

  if (item) {
    throw new Error("Another roadmap item already uses this slug.");
  }
}

async function ensureUniqueProblemSlug(tx: PrismaTransaction, slug: string, excludeId?: string) {
  const problem = await tx.problem.findFirst({
    where: {
      slug,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { id: true },
  });

  if (problem) {
    throw new Error("Another live problem already uses this slug.");
  }
}

function sortCompanyTags(
  companyTags: Array<{
    companyId: string;
    frequency: number;
    role: string | undefined;
    notes: string | undefined;
  }>,
) {
  return [...companyTags].sort((left, right) => {
    if (left.companyId === right.companyId) {
      return left.frequency - right.frequency;
    }

    return left.companyId.localeCompare(right.companyId);
  });
}

function sortTestCases(
  testCases: Array<{
    label: string | undefined;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    sortOrder: number;
  }>,
) {
  return [...testCases].sort((left, right) => left.sortOrder - right.sortOrder);
}

function serializeTopicRecord(record: {
  id: string;
  name: string;
  slug: string;
  level: RoadmapLevel;
  sortOrder: number;
  conceptSummary: string;
  notes: string;
  difficultyProgression: string[];
  revisionChecklist: string[];
  quiz: unknown;
  estimatedHours: number;
  icon: string;
  accentColor: string;
  isArchived: boolean;
}): TopicSnapshot {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    level: record.level,
    sortOrder: record.sortOrder,
    conceptSummary: record.conceptSummary,
    notes: record.notes,
    difficultyProgression: [...record.difficultyProgression],
    revisionChecklist: [...record.revisionChecklist],
    quiz: topicRequestDataSchema.shape.quiz.parse(record.quiz),
    estimatedHours: record.estimatedHours,
    icon: record.icon,
    accentColor: record.accentColor,
    isArchived: record.isArchived,
  };
}

function serializeRoadmapItemRecord(record: {
  id: string;
  title: string;
  slug: string;
  level: RoadmapLevel;
  summary: string;
  details: string;
  sortOrder: number;
  topicId: string | null;
  isArchived: boolean;
}): RoadmapItemSnapshot {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    level: record.level,
    summary: record.summary,
    details: record.details,
    sortOrder: record.sortOrder,
    topicId: record.topicId ?? undefined,
    isArchived: record.isArchived,
  };
}

function serializeProblemRecord(record: {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  topicId: string;
  problemStatement: string;
  examples: unknown;
  constraints: string[];
  hints: string[];
  editorial: string;
  similarProblemSlugs: string[];
  roleFocus: string | null;
  frequency: number;
  estimatedMinutes: number;
  codeExecutionEnabled: boolean;
  starterCode: string | null;
  starterLanguage: CodeLanguage;
  isArchived: boolean;
  companyTags: Array<{
    companyId: string;
    frequency: number;
    role: string | null;
    notes: string | null;
  }>;
  testCases: Array<{
    label: string | null;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    sortOrder: number;
  }>;
}): ProblemSnapshot {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    difficulty: record.difficulty,
    topicId: record.topicId,
    problemStatement: record.problemStatement,
    examples: problemRequestDataSchema.shape.examples.parse(record.examples),
    constraints: [...record.constraints],
    hints: [...record.hints],
    editorial: record.editorial,
    similarProblemSlugs: [...record.similarProblemSlugs],
    roleFocus: normalizeOptionalString(record.roleFocus),
    frequency: record.frequency,
    estimatedMinutes: record.estimatedMinutes,
    codeExecutionEnabled: record.codeExecutionEnabled,
    starterCode: normalizeOptionalString(record.starterCode),
    starterLanguage: record.starterLanguage,
    companyTags: sortCompanyTags(
      record.companyTags.map((tag) => ({
        companyId: tag.companyId,
        frequency: tag.frequency,
        role: normalizeOptionalString(tag.role),
        notes: normalizeOptionalString(tag.notes),
      })),
    ),
    testCases: sortTestCases(
      record.testCases.map((testCase) => ({
        label: normalizeOptionalString(testCase.label),
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        isHidden: testCase.isHidden,
        sortOrder: testCase.sortOrder,
      })),
    ),
    isArchived: record.isArchived,
  };
}

async function getTopicSnapshot(tx: PrismaTransaction, id: string) {
  const topic = await tx.topic.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      level: true,
      sortOrder: true,
      conceptSummary: true,
      notes: true,
      difficultyProgression: true,
      revisionChecklist: true,
      quiz: true,
      estimatedHours: true,
      icon: true,
      accentColor: true,
      isArchived: true,
    },
  });

  return topic ? serializeTopicRecord(topic) : null;
}

async function getRoadmapItemSnapshot(tx: PrismaTransaction, id: string) {
  const item = await tx.roadmapItem.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      level: true,
      summary: true,
      details: true,
      sortOrder: true,
      topicId: true,
      isArchived: true,
    },
  });

  return item ? serializeRoadmapItemRecord(item) : null;
}

async function getProblemSnapshot(tx: PrismaTransaction, id: string) {
  const problem = await tx.problem.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      topicId: true,
      problemStatement: true,
      examples: true,
      constraints: true,
      hints: true,
      editorial: true,
      similarProblemSlugs: true,
      roleFocus: true,
      frequency: true,
      estimatedMinutes: true,
      codeExecutionEnabled: true,
      starterCode: true,
      starterLanguage: true,
      isArchived: true,
      companyTags: {
        select: {
          companyId: true,
          frequency: true,
          role: true,
          notes: true,
        },
        orderBy: [{ companyId: "asc" }, { frequency: "asc" }],
      },
      testCases: {
        select: {
          label: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return problem ? serializeProblemRecord(problem) : null;
}

export async function getLiveEntitySnapshot(
  entityType: ChangeRequestEntityType,
  entityId: string,
) {
  switch (entityType) {
    case ChangeRequestEntityType.TOPIC:
      return getTopicSnapshot(prisma as unknown as PrismaTransaction, entityId);
    case ChangeRequestEntityType.ROADMAP_ITEM:
      return getRoadmapItemSnapshot(prisma as unknown as PrismaTransaction, entityId);
    case ChangeRequestEntityType.PROBLEM:
      return getProblemSnapshot(prisma as unknown as PrismaTransaction, entityId);
    default:
      return null;
  }
}

function buildChangeRequestSummary(input: {
  entityType: ChangeRequestEntityType;
  operationType: ChangeRequestOperationType;
  name: string;
}) {
  const entityLabel =
    input.entityType === ChangeRequestEntityType.TOPIC
      ? "topic"
      : input.entityType === ChangeRequestEntityType.ROADMAP_ITEM
        ? "roadmap item"
        : "problem";

  if (input.operationType === ChangeRequestOperationType.CREATE) {
    return `Create ${entityLabel}: ${input.name}`;
  }

  if (input.operationType === ChangeRequestOperationType.UPDATE) {
    return `Update ${entityLabel}: ${input.name}`;
  }

  return `Remove ${entityLabel}: ${input.name}`;
}

async function createChangeRequest(input: {
  entityType: ChangeRequestEntityType;
  operationType: ChangeRequestOperationType;
  entityId?: string;
  requestedById: string;
  summary: string;
  requestedData: unknown;
  currentData?: unknown;
}) {
  return prisma.changeRequest.create({
    data: {
      entityType: input.entityType,
      operationType: input.operationType,
      entityId: input.entityId,
      requestedById: input.requestedById,
      summary: input.summary,
      requestedData: toJsonValue(input.requestedData),
      ...(input.currentData !== undefined ? { currentData: toJsonValue(input.currentData) } : {}),
    },
  });
}

export async function submitTopicChangeRequest(input: {
  requestedById: string;
  operationType: ChangeRequestOperationType;
  entityId?: string;
  summary?: string;
  data?: TopicChangeRequestData;
  deletionReason?: string;
}) {
  if (input.operationType === ChangeRequestOperationType.CREATE) {
    const data = topicRequestDataSchema.parse(input.data);
    const summary =
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.TOPIC,
        operationType: input.operationType,
        name: data.name,
      });

    return createChangeRequest({
      entityType: ChangeRequestEntityType.TOPIC,
      operationType: input.operationType,
      requestedById: input.requestedById,
      summary,
      requestedData: data,
    });
  }

  if (!input.entityId) {
    throw new Error("Choose a live topic before requesting this change.");
  }

  const currentData = await getTopicSnapshot(prisma as unknown as PrismaTransaction, input.entityId);

  if (!currentData || currentData.isArchived) {
    throw new Error("This live topic is no longer available.");
  }

  if (input.operationType === ChangeRequestOperationType.UPDATE) {
    const data = topicRequestDataSchema.parse(input.data);
    const summary =
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.TOPIC,
        operationType: input.operationType,
        name: data.name,
      });

    return createChangeRequest({
      entityType: ChangeRequestEntityType.TOPIC,
      operationType: input.operationType,
      entityId: input.entityId,
      requestedById: input.requestedById,
      summary,
      requestedData: data,
      currentData,
    });
  }

  return createChangeRequest({
    entityType: ChangeRequestEntityType.TOPIC,
    operationType: ChangeRequestOperationType.DELETE,
    entityId: input.entityId,
    requestedById: input.requestedById,
    summary:
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.TOPIC,
        operationType: ChangeRequestOperationType.DELETE,
        name: currentData.name,
      }),
    requestedData: {
      deletionReason: normalizeOptionalString(input.deletionReason),
    },
    currentData,
  });
}

export async function submitRoadmapItemChangeRequest(input: {
  requestedById: string;
  operationType: ChangeRequestOperationType;
  entityId?: string;
  summary?: string;
  data?: RoadmapItemChangeRequestData;
  deletionReason?: string;
}) {
  if (input.operationType === ChangeRequestOperationType.CREATE) {
    const data = roadmapItemRequestDataSchema.parse(input.data);
    const summary =
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.ROADMAP_ITEM,
        operationType: input.operationType,
        name: data.title,
      });

    return createChangeRequest({
      entityType: ChangeRequestEntityType.ROADMAP_ITEM,
      operationType: input.operationType,
      requestedById: input.requestedById,
      summary,
      requestedData: data,
    });
  }

  if (!input.entityId) {
    throw new Error("Choose a live roadmap item before requesting this change.");
  }

  const currentData = await getRoadmapItemSnapshot(
    prisma as unknown as PrismaTransaction,
    input.entityId,
  );

  if (!currentData || currentData.isArchived) {
    throw new Error("This live roadmap item is no longer available.");
  }

  if (input.operationType === ChangeRequestOperationType.UPDATE) {
    const data = roadmapItemRequestDataSchema.parse(input.data);
    const summary =
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.ROADMAP_ITEM,
        operationType: input.operationType,
        name: data.title,
      });

    return createChangeRequest({
      entityType: ChangeRequestEntityType.ROADMAP_ITEM,
      operationType: input.operationType,
      entityId: input.entityId,
      requestedById: input.requestedById,
      summary,
      requestedData: data,
      currentData,
    });
  }

  return createChangeRequest({
    entityType: ChangeRequestEntityType.ROADMAP_ITEM,
    operationType: ChangeRequestOperationType.DELETE,
    entityId: input.entityId,
    requestedById: input.requestedById,
    summary:
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.ROADMAP_ITEM,
        operationType: ChangeRequestOperationType.DELETE,
        name: currentData.title,
      }),
    requestedData: {
      deletionReason: normalizeOptionalString(input.deletionReason),
    },
    currentData,
  });
}

export async function submitProblemChangeRequest(input: {
  requestedById: string;
  operationType: ChangeRequestOperationType;
  entityId?: string;
  summary?: string;
  data?: ProblemChangeRequestData;
  deletionReason?: string;
}) {
  if (input.operationType === ChangeRequestOperationType.CREATE) {
    const data = problemRequestDataSchema.parse(input.data);
    const summary =
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.PROBLEM,
        operationType: input.operationType,
        name: data.title,
      });

    return createChangeRequest({
      entityType: ChangeRequestEntityType.PROBLEM,
      operationType: input.operationType,
      requestedById: input.requestedById,
      summary,
      requestedData: data,
    });
  }

  if (!input.entityId) {
    throw new Error("Choose a live problem before requesting this change.");
  }

  const currentData = await getProblemSnapshot(prisma as unknown as PrismaTransaction, input.entityId);

  if (!currentData || currentData.isArchived) {
    throw new Error("This live problem is no longer available.");
  }

  if (input.operationType === ChangeRequestOperationType.UPDATE) {
    const data = problemRequestDataSchema.parse(input.data);
    const summary =
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.PROBLEM,
        operationType: input.operationType,
        name: data.title,
      });

    return createChangeRequest({
      entityType: ChangeRequestEntityType.PROBLEM,
      operationType: input.operationType,
      entityId: input.entityId,
      requestedById: input.requestedById,
      summary,
      requestedData: data,
      currentData,
    });
  }

  return createChangeRequest({
    entityType: ChangeRequestEntityType.PROBLEM,
    operationType: ChangeRequestOperationType.DELETE,
    entityId: input.entityId,
    requestedById: input.requestedById,
    summary:
      normalizeOptionalString(input.summary) ??
      buildChangeRequestSummary({
        entityType: ChangeRequestEntityType.PROBLEM,
        operationType: ChangeRequestOperationType.DELETE,
        name: currentData.title,
      }),
    requestedData: {
      deletionReason: normalizeOptionalString(input.deletionReason),
    },
    currentData,
  });
}

async function applyTopicChange(tx: PrismaTransaction, request: {
  entityId: string | null;
  operationType: ChangeRequestOperationType;
  requestedData: unknown;
}) {
  if (request.operationType === ChangeRequestOperationType.CREATE) {
    const data = topicRequestDataSchema.parse(request.requestedData);
    await ensureUniqueTopicSlug(tx, data.slug);

    return tx.topic.create({
      data: {
        name: data.name,
        slug: data.slug,
        level: data.level,
        sortOrder: data.sortOrder,
        conceptSummary: data.conceptSummary,
        notes: data.notes,
        difficultyProgression: data.difficultyProgression,
        revisionChecklist: data.revisionChecklist,
        quiz: data.quiz,
        estimatedHours: data.estimatedHours,
        icon: data.icon,
        accentColor: data.accentColor,
      },
    });
  }

  if (!request.entityId) {
    throw new Error("The change request is missing its target topic.");
  }

  const current = await tx.topic.findUnique({
    where: { id: request.entityId },
    select: { id: true, isArchived: true },
  });

  if (!current || current.isArchived) {
    throw new Error("The target topic is no longer available for publishing.");
  }

  if (request.operationType === ChangeRequestOperationType.UPDATE) {
    const data = topicRequestDataSchema.parse(request.requestedData);
    await ensureUniqueTopicSlug(tx, data.slug, request.entityId);

    return tx.topic.update({
      where: { id: request.entityId },
      data: {
        name: data.name,
        slug: data.slug,
        level: data.level,
        sortOrder: data.sortOrder,
        conceptSummary: data.conceptSummary,
        notes: data.notes,
        difficultyProgression: data.difficultyProgression,
        revisionChecklist: data.revisionChecklist,
        quiz: data.quiz,
        estimatedHours: data.estimatedHours,
        icon: data.icon,
        accentColor: data.accentColor,
      },
    });
  }

  await tx.topic.update({
    where: { id: request.entityId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
  await tx.problem.updateMany({
    where: {
      topicId: request.entityId,
      isArchived: false,
    },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
  await tx.roadmapItem.updateMany({
    where: {
      topicId: request.entityId,
      isArchived: false,
    },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  return { id: request.entityId };
}

async function applyRoadmapItemChange(tx: PrismaTransaction, request: {
  entityId: string | null;
  operationType: ChangeRequestOperationType;
  requestedData: unknown;
}) {
  if (request.operationType === ChangeRequestOperationType.CREATE) {
    const data = roadmapItemRequestDataSchema.parse(request.requestedData);

    if (data.topicId) {
      await ensureTopicExists(tx, data.topicId);
    }

    await ensureUniqueRoadmapSlug(tx, data.slug);

    return tx.roadmapItem.create({
      data: {
        title: data.title,
        slug: data.slug,
        level: data.level,
        summary: data.summary,
        details: data.details,
        sortOrder: data.sortOrder,
        topicId: data.topicId,
      },
    });
  }

  if (!request.entityId) {
    throw new Error("The change request is missing its target roadmap item.");
  }

  const current = await tx.roadmapItem.findUnique({
    where: { id: request.entityId },
    select: { id: true, isArchived: true },
  });

  if (!current || current.isArchived) {
    throw new Error("The target roadmap item is no longer available for publishing.");
  }

  if (request.operationType === ChangeRequestOperationType.UPDATE) {
    const data = roadmapItemRequestDataSchema.parse(request.requestedData);

    if (data.topicId) {
      await ensureTopicExists(tx, data.topicId);
    }

    await ensureUniqueRoadmapSlug(tx, data.slug, request.entityId);

    return tx.roadmapItem.update({
      where: { id: request.entityId },
      data: {
        title: data.title,
        slug: data.slug,
        level: data.level,
        summary: data.summary,
        details: data.details,
        sortOrder: data.sortOrder,
        topicId: data.topicId,
      },
    });
  }

  return tx.roadmapItem.update({
    where: { id: request.entityId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
}

async function applyProblemChange(tx: PrismaTransaction, request: {
  entityId: string | null;
  operationType: ChangeRequestOperationType;
  requestedData: unknown;
}) {
  if (request.operationType === ChangeRequestOperationType.CREATE) {
    const data = problemRequestDataSchema.parse(request.requestedData);
    await ensureTopicExists(tx, data.topicId);
    await ensureUniqueProblemSlug(tx, data.slug);

    return tx.problem.create({
      data: {
        title: data.title,
        slug: data.slug,
        difficulty: data.difficulty,
        topicId: data.topicId,
        problemStatement: data.problemStatement,
        examples: data.examples,
        constraints: data.constraints,
        hints: data.hints,
        editorial: data.editorial,
        similarProblemSlugs: data.similarProblemSlugs,
        roleFocus: data.roleFocus,
        frequency: data.frequency,
        estimatedMinutes: data.estimatedMinutes,
        codeExecutionEnabled: data.codeExecutionEnabled,
        starterCode: data.starterCode,
        starterLanguage: data.starterLanguage,
        companyTags: {
          create: data.companyTags.map((tag) => ({
            companyId: tag.companyId,
            frequency: tag.frequency,
            role: tag.role,
            notes: tag.notes,
          })),
        },
        testCases: {
          create: data.testCases.map((testCase) => ({
            label: testCase.label,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isHidden: Boolean(testCase.isHidden),
            sortOrder: testCase.sortOrder,
          })),
        },
      },
    });
  }

  if (!request.entityId) {
    throw new Error("The change request is missing its target problem.");
  }

  const current = await tx.problem.findUnique({
    where: { id: request.entityId },
    select: { id: true, isArchived: true },
  });

  if (!current || current.isArchived) {
    throw new Error("The target problem is no longer available for publishing.");
  }

  if (request.operationType === ChangeRequestOperationType.UPDATE) {
    const data = problemRequestDataSchema.parse(request.requestedData);
    await ensureTopicExists(tx, data.topicId);
    await ensureUniqueProblemSlug(tx, data.slug, request.entityId);

    await tx.problem.update({
      where: { id: request.entityId },
      data: {
        title: data.title,
        slug: data.slug,
        difficulty: data.difficulty,
        topicId: data.topicId,
        problemStatement: data.problemStatement,
        examples: data.examples,
        constraints: data.constraints,
        hints: data.hints,
        editorial: data.editorial,
        similarProblemSlugs: data.similarProblemSlugs,
        roleFocus: data.roleFocus,
        frequency: data.frequency,
        estimatedMinutes: data.estimatedMinutes,
        codeExecutionEnabled: data.codeExecutionEnabled,
        starterCode: data.starterCode,
        starterLanguage: data.starterLanguage,
      },
    });

    await tx.problemCompanyTag.deleteMany({
      where: { problemId: request.entityId },
    });
    if (data.companyTags.length) {
      await tx.problemCompanyTag.createMany({
        data: data.companyTags.map((tag) => ({
          problemId: request.entityId!,
          companyId: tag.companyId,
          frequency: tag.frequency,
          role: tag.role,
          notes: tag.notes,
        })),
      });
    }

    await tx.problemTestCase.deleteMany({
      where: { problemId: request.entityId },
    });
    if (data.testCases.length) {
      await tx.problemTestCase.createMany({
        data: data.testCases.map((testCase) => ({
          problemId: request.entityId!,
          label: testCase.label,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          isHidden: Boolean(testCase.isHidden),
          sortOrder: testCase.sortOrder,
        })),
      });
    }

    return { id: request.entityId };
  }

  return tx.problem.update({
    where: { id: request.entityId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });
}

export async function approveChangeRequest(input: {
  requestId: string;
  reviewerId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.changeRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        operationType: true,
        requestedData: true,
        status: true,
      },
    });

    if (!request) {
      throw new Error("This change request no longer exists.");
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new Error("Only pending change requests can be approved.");
    }

    if (request.entityType === ChangeRequestEntityType.TOPIC) {
      await applyTopicChange(tx, request);
    }

    if (request.entityType === ChangeRequestEntityType.ROADMAP_ITEM) {
      await applyRoadmapItemChange(tx, request);
    }

    if (request.entityType === ChangeRequestEntityType.PROBLEM) {
      await applyProblemChange(tx, request);
    }

    await tx.changeRequest.update({
      where: { id: input.requestId },
      data: {
        status: ChangeRequestStatus.APPROVED,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.changeRequestReview.create({
      data: {
        requestId: input.requestId,
        reviewerId: input.reviewerId,
        status: ChangeRequestStatus.APPROVED,
      },
    });

    return request;
  });
}

export async function rejectChangeRequest(input: {
  requestId: string;
  reviewerId: string;
  rejectionReason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.changeRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        operationType: true,
        status: true,
      },
    });

    if (!request) {
      throw new Error("This change request no longer exists.");
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new Error("Only pending change requests can be rejected.");
    }

    await tx.changeRequest.update({
      where: { id: input.requestId },
      data: {
        status: ChangeRequestStatus.REJECTED,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason,
      },
    });

    await tx.changeRequestReview.create({
      data: {
        requestId: input.requestId,
        reviewerId: input.reviewerId,
        status: ChangeRequestStatus.REJECTED,
        note: input.rejectionReason,
      },
    });

    return request;
  });
}

export async function getUserChangeRequests(input: {
  userId: string;
  entityTypes?: ChangeRequestEntityType[];
  limit?: number;
}) {
  return prisma.changeRequest.findMany({
    where: {
      requestedById: input.userId,
      entityType: input.entityTypes?.length ? { in: input.entityTypes } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 8,
    include: {
      reviewedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getAdminChangeRequests(input?: {
  entityType?: ChangeRequestEntityType | "ALL";
  status?: ChangeRequestStatus | "ALL";
}) {
  const [requests, pendingCount] = await Promise.all([
    prisma.changeRequest.findMany({
      where: {
        entityType:
          input?.entityType && input.entityType !== "ALL" ? input.entityType : undefined,
        status: input?.status && input.status !== "ALL" ? input.status : undefined,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.changeRequest.count({
      where: { status: ChangeRequestStatus.PENDING },
    }),
  ]);

  const requestsWithLiveData = await Promise.all(
    requests.map(async (request) => ({
      ...request,
      liveData: request.entityId
        ? await getLiveEntitySnapshot(request.entityType, request.entityId)
        : null,
    })),
  );

  return {
    requests: requestsWithLiveData,
    pendingCount,
    filters: {
      entityType: input?.entityType ?? "ALL",
      status: input?.status ?? "ALL",
    },
  };
}
