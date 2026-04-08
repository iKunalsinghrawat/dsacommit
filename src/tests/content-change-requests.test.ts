/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  ChangeRequestStatus,
  CodeLanguage,
  Difficulty,
  RoadmapLevel,
} from "@/generated/prisma/enums";

const prisma = {
  topic: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  roadmapItem: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  problem: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  changeRequest: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  changeRequestReview: {
    create: vi.fn(),
  },
  problemCompanyTag: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  problemTestCase: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
} as const;

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

const contentChangeRequests = await import("@/server/content-change-requests");

const topicData = {
  name: "Arrays",
  slug: "arrays",
  level: RoadmapLevel.BEGINNER,
  sortOrder: 2,
  conceptSummary: "Arrays teach indexing, prefix sums, and window thinking before advanced patterns.",
  notes: "Start with direct traversal, then layer on prefix sums, in-place mutation, and boundary handling.",
  difficultyProgression: ["Trace indices", "Use prefix sums", "Combine two-pointer and window logic"],
  revisionChecklist: ["Index carefully", "Check boundaries", "Dry-run examples"],
  quiz: [{ question: "What does contiguous storage mean?", answer: "Array items sit in indexed sequence." }],
  estimatedHours: 8,
  icon: "Rows3",
  accentColor: "teal",
} as const;

const roadmapItemData = {
  title: "Graph",
  slug: "roadmap-graph",
  level: RoadmapLevel.ADVANCED,
  summary: "Focus on traversal state, graph representation, and shortest-path pattern choice.",
  details: "Clarify visited semantics, BFS vs DFS tradeoffs, and when to pivot into topological or shortest-path logic.",
  sortOrder: 4,
  topicId: "topic-graph",
} as const;

const problemData = {
  title: "Rotation Window Checkpoint",
  slug: "rotation-window-checkpoint",
  difficulty: Difficulty.MEDIUM,
  topicId: "topic-window",
  problemStatement:
    "Given a binary array, return the minimum swaps required to group all 1s together in a circular array.",
  examples: [
    {
      input: "nums = [0,1,0,1,1,0,0]",
      output: "1",
      explanation: "A circular window of size equal to the count of ones captures the best grouping.",
    },
  ],
  constraints: ["1 <= nums.length <= 10^5", "nums[i] is either 0 or 1"],
  hints: ["Count ones first.", "Slide a fixed-size window over a doubled array view."],
  editorial:
    "Treat the circular structure with modulo or a doubled array and track the number of zeros in the active window.",
  similarProblemSlugs: ["pair-sum-checkpoint"],
  roleFocus: "Intern",
  frequency: 4,
  estimatedMinutes: 35,
  codeExecutionEnabled: true,
  starterCode: "export function solve(input: string): string {\n  return \"\";\n}\n",
  starterLanguage: CodeLanguage.TYPESCRIPT,
  companyTags: [
    {
      companyId: "company-amazon",
      frequency: 4,
      role: "Intern",
      notes: "Popular sliding-window OA variation.",
    },
  ],
  testCases: [
    {
      label: "Sample 1",
      input: "[0,1,0,1,1,0,0]",
      expectedOutput: "1",
      isHidden: false,
      sortOrder: 1,
    },
    {
      label: "Edge",
      input: "[1,1,1,1]",
      expectedOutput: "0",
      isHidden: true,
      sortOrder: 2,
    },
  ],
} as const;

function makeCurrentTopicRecord() {
  return {
    id: "topic-1",
    ...topicData,
    quiz: topicData.quiz,
    isArchived: false,
  };
}

function makeCurrentRoadmapRecord() {
  return {
    id: "roadmap-1",
    ...roadmapItemData,
    topicId: roadmapItemData.topicId,
    isArchived: false,
  };
}

function makeCurrentProblemRecord() {
  return {
    id: "problem-1",
    ...problemData,
    roleFocus: problemData.roleFocus,
    starterCode: problemData.starterCode,
    starterLanguage: problemData.starterLanguage,
    companyTags: problemData.companyTags.map((tag) => ({
      companyId: tag.companyId,
      frequency: tag.frequency,
      role: tag.role,
      notes: tag.notes,
    })),
    testCases: problemData.testCases.map((testCase) => ({
      label: testCase.label,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isHidden: testCase.isHidden,
      sortOrder: testCase.sortOrder,
    })),
    isArchived: false,
  };
}

describe("content approval workflow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    prisma.changeRequest.create.mockResolvedValue({ id: "request-1" });
    prisma.changeRequest.update.mockResolvedValue({});
    prisma.changeRequestReview.create.mockResolvedValue({});
    prisma.topic.findFirst.mockResolvedValue(null);
    prisma.roadmapItem.findFirst.mockResolvedValue(null);
    prisma.problem.findFirst.mockResolvedValue(null);
    prisma.topic.updateMany.mockResolvedValue({ count: 0 });
    prisma.problem.updateMany.mockResolvedValue({ count: 0 });
    prisma.problemCompanyTag.deleteMany.mockResolvedValue({ count: 0 });
    prisma.problemCompanyTag.createMany.mockResolvedValue({ count: 0 });
    prisma.problemTestCase.deleteMany.mockResolvedValue({ count: 0 });
    prisma.problemTestCase.createMany.mockResolvedValue({ count: 0 });
  });

  it("keeps a new topic request pending without creating a live topic", async () => {
    await contentChangeRequests.submitTopicChangeRequest({
      requestedById: "user-1",
      operationType: ChangeRequestOperationType.CREATE,
      summary: "Create topic: Arrays",
      data: topicData,
    });

    expect(prisma.changeRequest.create).toHaveBeenCalled();
    expect(prisma.topic.create).not.toHaveBeenCalled();
  });

  it("stores topic update and delete requests without mutating the live topic until approval", async () => {
    prisma.topic.findUnique.mockResolvedValue(makeCurrentTopicRecord());

    await contentChangeRequests.submitTopicChangeRequest({
      requestedById: "user-2",
      entityId: "topic-1",
      operationType: ChangeRequestOperationType.UPDATE,
      summary: "Update topic: Arrays",
      data: {
        ...topicData,
        conceptSummary: `${topicData.conceptSummary} Pending admin review.`,
      },
    });

    await contentChangeRequests.submitTopicChangeRequest({
      requestedById: "user-2",
      entityId: "topic-1",
      operationType: ChangeRequestOperationType.DELETE,
      summary: "Remove topic: Arrays",
      deletionReason: "Replace it with a stronger version later.",
    });

    expect(prisma.changeRequest.create).toHaveBeenCalledTimes(2);
    expect(prisma.topic.update).not.toHaveBeenCalled();
    expect(prisma.topic.updateMany).not.toHaveBeenCalled();
  });

  it("keeps roadmap add, edit, and remove requests pending until admin approval", async () => {
    prisma.roadmapItem.findUnique.mockResolvedValue(makeCurrentRoadmapRecord());
    prisma.topic.findUnique.mockResolvedValue({ id: "topic-graph", isArchived: false });

    await contentChangeRequests.submitRoadmapItemChangeRequest({
      requestedById: "user-3",
      operationType: ChangeRequestOperationType.CREATE,
      summary: "Create roadmap item: Graph",
      data: roadmapItemData,
    });

    await contentChangeRequests.submitRoadmapItemChangeRequest({
      requestedById: "user-3",
      entityId: "roadmap-1",
      operationType: ChangeRequestOperationType.UPDATE,
      summary: "Update roadmap item: Graph",
      data: {
        ...roadmapItemData,
        details: `${roadmapItemData.details} Pending admin review.`,
      },
    });

    await contentChangeRequests.submitRoadmapItemChangeRequest({
      requestedById: "user-3",
      entityId: "roadmap-1",
      operationType: ChangeRequestOperationType.DELETE,
      summary: "Remove roadmap item: Graph",
      deletionReason: "Needs replacement.",
    });

    expect(prisma.changeRequest.create).toHaveBeenCalledTimes(3);
    expect(prisma.roadmapItem.create).not.toHaveBeenCalled();
    expect(prisma.roadmapItem.update).not.toHaveBeenCalled();
  });

  it("keeps problem add, edit, and remove requests pending until admin approval", async () => {
    prisma.problem.findUnique.mockResolvedValue(makeCurrentProblemRecord());
    prisma.topic.findUnique.mockResolvedValue({ id: "topic-window", isArchived: false });

    await contentChangeRequests.submitProblemChangeRequest({
      requestedById: "user-4",
      operationType: ChangeRequestOperationType.CREATE,
      summary: "Create problem: Rotation Window Checkpoint",
      data: problemData,
    });

    await contentChangeRequests.submitProblemChangeRequest({
      requestedById: "user-4",
      entityId: "problem-1",
      operationType: ChangeRequestOperationType.UPDATE,
      summary: "Update problem: Rotation Window Checkpoint",
      data: {
        ...problemData,
        editorial: `${problemData.editorial} Pending admin review.`,
      },
    });

    await contentChangeRequests.submitProblemChangeRequest({
      requestedById: "user-4",
      entityId: "problem-1",
      operationType: ChangeRequestOperationType.DELETE,
      summary: "Remove problem: Rotation Window Checkpoint",
      deletionReason: "Needs a stronger replacement first.",
    });

    expect(prisma.changeRequest.create).toHaveBeenCalledTimes(3);
    expect(prisma.problem.create).not.toHaveBeenCalled();
    expect(prisma.problem.update).not.toHaveBeenCalled();
  });

  it("publishes an approved topic create request and stores the new entity id on the request", async () => {
    prisma.changeRequest.findUnique.mockResolvedValue({
      id: "request-approve-topic",
      entityType: ChangeRequestEntityType.TOPIC,
      entityId: null,
      operationType: ChangeRequestOperationType.CREATE,
      requestedData: topicData,
      status: ChangeRequestStatus.PENDING,
    });
    prisma.topic.create.mockResolvedValue({ id: "topic-new" });

    await contentChangeRequests.approveChangeRequest({
      requestId: "request-approve-topic",
      reviewerId: "admin-1",
    });

    expect(prisma.topic.create).toHaveBeenCalled();
    expect(prisma.changeRequest.update).toHaveBeenCalledWith({
      where: { id: "request-approve-topic" },
      data: expect.objectContaining({
        entityId: "topic-new",
        status: ChangeRequestStatus.APPROVED,
      }),
    });
  });

  it("publishes an approved roadmap update request to the live roadmap item", async () => {
    prisma.changeRequest.findUnique.mockResolvedValue({
      id: "request-approve-roadmap",
      entityType: ChangeRequestEntityType.ROADMAP_ITEM,
      entityId: "roadmap-1",
      operationType: ChangeRequestOperationType.UPDATE,
      requestedData: roadmapItemData,
      status: ChangeRequestStatus.PENDING,
    });
    prisma.roadmapItem.findUnique.mockResolvedValue({ id: "roadmap-1", isArchived: false });
    prisma.topic.findUnique.mockResolvedValue({ id: "topic-graph", isArchived: false });
    prisma.roadmapItem.update.mockResolvedValue({ id: "roadmap-1" });

    await contentChangeRequests.approveChangeRequest({
      requestId: "request-approve-roadmap",
      reviewerId: "admin-1",
    });

    expect(prisma.roadmapItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "roadmap-1" },
        data: expect.objectContaining({
          title: roadmapItemData.title,
          details: roadmapItemData.details,
        }),
      }),
    );
  });

  it("archives the live problem only when an admin approves a delete request", async () => {
    prisma.changeRequest.findUnique.mockResolvedValue({
      id: "request-approve-problem-delete",
      entityType: ChangeRequestEntityType.PROBLEM,
      entityId: "problem-1",
      operationType: ChangeRequestOperationType.DELETE,
      requestedData: { deletionReason: "Duplicate." },
      status: ChangeRequestStatus.PENDING,
    });
    prisma.problem.findUnique.mockResolvedValue({ id: "problem-1", isArchived: false });
    prisma.problem.update.mockResolvedValue({ id: "problem-1" });

    await contentChangeRequests.approveChangeRequest({
      requestId: "request-approve-problem-delete",
      reviewerId: "admin-1",
    });

    expect(prisma.problem.update).toHaveBeenCalledWith({
      where: { id: "problem-1" },
      data: expect.objectContaining({
        isArchived: true,
      }),
    });
  });

  it("rejects a request without mutating live content", async () => {
    prisma.changeRequest.findUnique.mockResolvedValue({
      id: "request-reject-problem",
      entityType: ChangeRequestEntityType.PROBLEM,
      entityId: "problem-1",
      operationType: ChangeRequestOperationType.UPDATE,
      status: ChangeRequestStatus.PENDING,
    });

    await contentChangeRequests.rejectChangeRequest({
      requestId: "request-reject-problem",
      reviewerId: "admin-1",
      rejectionReason: "Tighten the examples and hidden test coverage before resubmitting.",
    });

    expect(prisma.problem.update).not.toHaveBeenCalled();
    expect(prisma.topic.update).not.toHaveBeenCalled();
    expect(prisma.roadmapItem.update).not.toHaveBeenCalled();
    expect(prisma.changeRequest.update).toHaveBeenCalledWith({
      where: { id: "request-reject-problem" },
      data: expect.objectContaining({
        status: ChangeRequestStatus.REJECTED,
        rejectionReason: "Tighten the examples and hidden test coverage before resubmitting.",
      }),
    });
  });
});
