/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CodeExecutionStatus, CodeLanguage, Role } from "@/generated/prisma/enums";

const getCurrentUser = vi.fn();
const runProblemCode = vi.fn();
const submitProblemCode = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser,
}));

vi.mock("@/server/problem-execution-service", () => ({
  runProblemCode,
  submitProblemCode,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

const runRoute = await import("@/app/api/problems/[id]/run/route");
const submitRoute = await import("@/app/api/problems/[id]/submit/route");

describe("problem execution routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated run requests", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await runRoute.POST(new Request("http://localhost/api/problems/p1/run", {
      method: "POST",
      body: JSON.stringify({ code: "export function solve(){return '1';}", language: CodeLanguage.TYPESCRIPT }),
    }), {
      params: Promise.resolve({ id: "problem-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("rejects invalid payloads", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });

    const response = await runRoute.POST(new Request("http://localhost/api/problems/p1/run", {
      method: "POST",
      body: JSON.stringify({ code: "", language: "PYTHON" }),
    }), {
      params: Promise.resolve({ id: "problem-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns execution results for valid run requests", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });
    runProblemCode.mockResolvedValue({
      summary: {
        passedCount: 2,
        totalCount: 3,
        status: CodeExecutionStatus.PARTIAL,
        runtimeMs: 15,
      },
      results: [],
    });

    const response = await runRoute.POST(new Request("http://localhost/api/problems/p1/run", {
      method: "POST",
      body: JSON.stringify({
        code: "export function solve(){return '1';}",
        language: CodeLanguage.TYPESCRIPT,
      }),
    }), {
      params: Promise.resolve({ id: "problem-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.result.summary.passedCount).toBe(2);
  });

  it("persists submit results and revalidates affected pages", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });
    submitProblemCode.mockResolvedValue({
      summary: {
        passedCount: 3,
        totalCount: 3,
        status: CodeExecutionStatus.PASSED,
        runtimeMs: 9,
      },
      results: [],
    });

    const response = await submitRoute.POST(new Request("http://localhost/api/problems/p1/submit", {
      method: "POST",
      body: JSON.stringify({
        code: "export function solve(){return '1';}",
        language: CodeLanguage.TYPESCRIPT,
      }),
    }), {
      params: Promise.resolve({ id: "problem-1" }),
    });

    expect(response.status).toBe(200);
    expect(submitProblemCode).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        problemId: "problem-1",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
