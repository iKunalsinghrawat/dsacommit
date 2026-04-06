/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CodeLanguage, Role } from "@/generated/prisma/enums";

const getCurrentUser = vi.fn();
const saveProblemDraft = vi.fn();
const deleteProblemDraft = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser,
}));

vi.mock("@/server/problem-execution-service", () => ({
  saveProblemDraft,
  deleteProblemDraft,
}));

const draftRoute = await import("@/app/api/problems/[id]/draft/route");

describe("problem draft routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated draft saves", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await draftRoute.POST(
      new Request("http://localhost/api/problems/p1/draft", {
        method: "POST",
        body: JSON.stringify({
          code: "print('hello')",
          language: CodeLanguage.PYTHON,
        }),
      }),
      {
        params: Promise.resolve({ id: "problem-1" }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("saves a draft for an authenticated user", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });
    saveProblemDraft.mockResolvedValue({
      language: CodeLanguage.GO,
      sourceCode: "package main",
      updatedAt: "2026-04-06T10:00:00.000Z",
    });

    const response = await draftRoute.POST(
      new Request("http://localhost/api/problems/p1/draft", {
        method: "POST",
        body: JSON.stringify({
          code: "package main",
          language: CodeLanguage.GO,
        }),
      }),
      {
        params: Promise.resolve({ id: "problem-1" }),
      },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(saveProblemDraft).toHaveBeenCalledWith({
      userId: "user-1",
      problemId: "problem-1",
      language: CodeLanguage.GO,
      code: "package main",
    });
    expect(payload.draft.language).toBe(CodeLanguage.GO);
  });

  it("deletes a draft for an authenticated user", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });
    deleteProblemDraft.mockResolvedValue({ language: CodeLanguage.CPP });

    const response = await draftRoute.DELETE(
      new Request("http://localhost/api/problems/p1/draft", {
        method: "DELETE",
        body: JSON.stringify({
          language: CodeLanguage.CPP,
        }),
      }),
      {
        params: Promise.resolve({ id: "problem-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(deleteProblemDraft).toHaveBeenCalledWith({
      userId: "user-1",
      problemId: "problem-1",
      language: CodeLanguage.CPP,
    });
  });
});
