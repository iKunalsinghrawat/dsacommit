/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CodeLanguage, Difficulty } from "@/generated/prisma/enums";

const prisma = {
  problem: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  submissionStatus: {
    findUnique: vi.fn(),
  },
  bookmark: {
    findUnique: vi.fn(),
  },
  revisionQueue: {
    findUnique: vi.fn(),
  },
  codeDraft: {
    findMany: vi.fn(),
  },
  codeSubmission: {
    findMany: vi.fn(),
  },
} as const;

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

const { getProblemById } = await import("@/server/public-data");

const baseProblem = {
  id: "problem-1",
  title: "Pair Sum Checkpoint",
  slug: "pair-sum-checkpoint",
  difficulty: Difficulty.EASY,
  problemStatement: "Find whether any pair sums to target.",
  examples: [
    {
      input: "nums = [1,2], target = 3",
      output: "true",
      explanation: "1 + 2 = 3",
    },
  ],
  constraints: ["1 <= n <= 1e5"],
  hints: ["Use a hash set."],
  editorial: "Track complements while scanning.",
  similarProblemSlugs: [],
  roleFocus: null,
  frequency: 5,
  estimatedMinutes: 20,
  isFeatured: false,
  createdAt: new Date("2026-04-06T00:00:00.000Z"),
  updatedAt: new Date("2026-04-06T00:00:00.000Z"),
  topic: {
    id: "topic-1",
    name: "Arrays",
    slug: "arrays",
  },
  companyTags: [
    {
      id: "tag-1",
      frequency: 5,
      role: null,
      notes: null,
      company: {
        id: "company-1",
        name: "Amazon",
        slug: "amazon",
      },
    },
  ],
};

describe("getProblemById", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.submissionStatus.findUnique.mockResolvedValue(null);
    prisma.bookmark.findUnique.mockResolvedValue(null);
    prisma.revisionQueue.findUnique.mockResolvedValue(null);
    prisma.problem.findMany.mockResolvedValue([]);
    prisma.codeDraft.findMany.mockResolvedValue([]);
    prisma.codeSubmission.findMany.mockResolvedValue([]);
  });

  it("falls back to a non-workspace problem payload when workspace schema tables are missing", async () => {
    prisma.problem.findFirst
      .mockRejectedValueOnce({
        code: "P2021",
        message: 'The table "public.ProblemTestCase" does not exist in the current database.',
      })
      .mockResolvedValueOnce(baseProblem);

    const result = await getProblemById("problem-1", "user-1");

    expect(result).not.toBeNull();
    expect(result?.problem.codeExecutionEnabled).toBe(false);
    expect(result?.problem.starterCode).toBeNull();
    expect(result?.problem.starterLanguage).toBe(CodeLanguage.TYPESCRIPT);
    expect(result?.problem.testCases).toEqual([]);
    expect(result?.codeDrafts).toEqual([]);
    expect(result?.latestCodeSubmissions).toEqual([]);
    expect(prisma.codeDraft.findMany).not.toHaveBeenCalled();
    expect(prisma.codeSubmission.findMany).not.toHaveBeenCalled();
  });

  it("keeps the page load working when draft or submission tables are missing", async () => {
    prisma.problem.findFirst.mockResolvedValueOnce({
      ...baseProblem,
      codeExecutionEnabled: true,
      starterCode: 'export function solve(input: string): string {\n  return "";\n}\n',
      starterLanguage: CodeLanguage.TYPESCRIPT,
      testCases: [],
    });
    prisma.codeDraft.findMany.mockRejectedValueOnce({
      code: "P2021",
      message: 'The table "public.CodeDraft" does not exist in the current database.',
    });
    prisma.codeSubmission.findMany.mockRejectedValueOnce({
      code: "P2021",
      message: 'The table "public.CodeSubmission" does not exist in the current database.',
    });

    const result = await getProblemById("problem-1", "user-1");

    expect(result).not.toBeNull();
    expect(result?.problem.codeExecutionEnabled).toBe(true);
    expect(result?.codeDrafts).toEqual([]);
    expect(result?.latestCodeSubmissions).toEqual([]);
  });
});
