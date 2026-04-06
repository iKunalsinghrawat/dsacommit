/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import { CodeExecutionStatus, CodeLanguage } from "@/generated/prisma/enums";
import { executeProblemCode } from "@/lib/problem-execution";

const sampleCases = [
  {
    id: "tc-1",
    label: "Sample 1",
    input: "1,2",
    expectedOutput: "3",
    isHidden: false,
    sortOrder: 1,
  },
  {
    id: "tc-2",
    label: "Locked check",
    input: "5,7",
    expectedOutput: "12",
    isHidden: true,
    sortOrder: 2,
  },
];

describe("problem execution service", () => {
  it("returns pass counts for valid code", () => {
    const result = executeProblemCode({
      code: `
        export function solve(input: string): string {
          const [left, right] = input.split(",").map(Number);
          return String(left + right);
        }
      `,
      language: CodeLanguage.TYPESCRIPT,
      testCases: sampleCases,
      revealHiddenDetails: false,
    });

    expect(result.summary.passedCount).toBe(2);
    expect(result.summary.totalCount).toBe(2);
    expect(result.summary.status).toBe(CodeExecutionStatus.PASSED);
  });

  it("returns the correct failed count for incorrect code", () => {
    const result = executeProblemCode({
      code: `
        export function solve(input: string): string {
          return "0";
        }
      `,
      language: CodeLanguage.TYPESCRIPT,
      testCases: sampleCases,
      revealHiddenDetails: false,
    });

    expect(result.summary.passedCount).toBe(0);
    expect(result.summary.totalCount).toBe(2);
    expect(result.summary.status).toBe(CodeExecutionStatus.FAILED);
  });

  it("handles runtime errors gracefully", () => {
    const result = executeProblemCode({
      code: `
        export function solve(): string {
          throw new Error("boom");
        }
      `,
      language: CodeLanguage.TYPESCRIPT,
      testCases: sampleCases,
      revealHiddenDetails: false,
    });

    expect(result.summary.status).toBe(CodeExecutionStatus.RUNTIME_ERROR);
    expect(result.results[0]?.errorMessage).toContain("boom");
  });

  it("masks hidden test case details when hidden cases are not meant to be revealed", () => {
    const result = executeProblemCode({
      code: `
        export function solve(input: string): string {
          const [left, right] = input.split(",").map(Number);
          return String(left + right);
        }
      `,
      language: CodeLanguage.TYPESCRIPT,
      testCases: sampleCases,
      revealHiddenDetails: false,
    });

    expect(result.results[1]).toMatchObject({
      isHidden: true,
      input: null,
      expectedOutput: null,
      actualOutput: null,
    });
  });

  it("returns a clear runtime message for languages whose execution backend is not configured yet", () => {
    const result = executeProblemCode({
      code: `
def solve(raw_input: str) -> str:
    return "3"
      `,
      language: CodeLanguage.PYTHON,
      testCases: sampleCases,
      revealHiddenDetails: false,
    });

    expect(result.summary.status).toBe(CodeExecutionStatus.RUNTIME_ERROR);
    expect(result.results[0]?.errorMessage).toContain("Python draft support is ready");
  });
});
