/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Difficulty } from "@/generated/prisma/enums";

const prisma = {
  roadmapItem: {
    findMany: vi.fn(),
  },
  topic: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  mentorProfile: {
    findMany: vi.fn(),
  },
  companyProfile: {
    findMany: vi.fn(),
  },
  problem: {
    findMany: vi.fn(),
  },
  badge: {
    findMany: vi.fn(),
  },
  communityPost: {
    findMany: vi.fn(),
  },
  changeRequest: {
    count: vi.fn(),
  },
} as const;

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

const { getRoadmapData } = await import("@/server/public-data");
const { getAdminPanelData } = await import("@/server/app-data");

describe("schema compatibility fallbacks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("falls back to topic-backed roadmap data when roadmap items are unavailable", async () => {
    prisma.roadmapItem.findMany.mockRejectedValueOnce({
      code: "P2021",
      message: 'The table "public.RoadmapItem" does not exist in the current database.',
    });
    prisma.topic.findMany.mockResolvedValueOnce([
      {
        id: "topic-1",
        name: "Arrays",
        slug: "arrays",
        level: "BEGINNER",
        sortOrder: 1,
        conceptSummary: "Master traversals and patterns.",
        notes: "Use prefix sums and sliding windows.",
        estimatedHours: 6,
        problems: [{ id: "problem-1" }, { id: "problem-2" }],
      },
    ]);

    const roadmap = await getRoadmapData();

    expect(roadmap.BEGINNER).toHaveLength(1);
    expect(roadmap.BEGINNER[0]).toMatchObject({
      title: "Arrays",
      summary: "Master traversals and patterns.",
      topic: {
        name: "Arrays",
      },
    });
  });

  it("returns admin data with zero pending requests when the approval table is unavailable", async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);
    prisma.mentorProfile.findMany.mockResolvedValueOnce([]);
    prisma.companyProfile.findMany.mockResolvedValueOnce([]);
    prisma.problem.findMany.mockResolvedValueOnce([
      {
        id: "problem-1",
        title: "Pair Sum",
        difficulty: Difficulty.EASY,
        topic: {
          id: "topic-1",
          name: "Arrays",
          slug: "arrays",
        },
      },
    ]);
    prisma.topic.findMany.mockResolvedValueOnce([
      {
        id: "topic-1",
        name: "Arrays",
        slug: "arrays",
        level: "BEGINNER",
        sortOrder: 1,
      },
    ]);
    prisma.badge.findMany.mockResolvedValueOnce([]);
    prisma.communityPost.findMany.mockResolvedValueOnce([]);
    prisma.changeRequest.count.mockRejectedValueOnce({
      code: "P2021",
      message: 'The table "public.ChangeRequest" does not exist in the current database.',
    });

    const adminData = await getAdminPanelData();

    expect(adminData.pendingChangeRequests).toBe(0);
    expect(adminData.problems[0]).toMatchObject({
      title: "Pair Sum",
      difficulty: Difficulty.EASY,
    });
  });
});
