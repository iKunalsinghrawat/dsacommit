/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { supportedCodeLanguages } from "@/config/languages";
import { CodeExecutionStatus, CodeLanguage } from "@/generated/prisma/enums";
import {
  canExecuteLanguage,
  executeProblemCodeWithProvider,
  resetCodeExecutionProviderCache,
} from "@/server/code-execution-provider";

const remoteSampleCases = [
  {
    id: "tc-1",
    label: "Sample 1",
    input: "1 2",
    expectedOutput: "3",
    isHidden: false,
    sortOrder: 1,
  },
  {
    id: "tc-2",
    label: "Hidden 1",
    input: "5 7",
    expectedOutput: "12",
    isHidden: true,
    sortOrder: 2,
  },
];

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("code execution provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetCodeExecutionProviderCache();
    process.env.CODE_EXECUTION_PROVIDER = "judge0";
    delete process.env.JUDGE0_API_URL;
    delete process.env.JUDGE0_AUTH_HEADER;
    delete process.env.JUDGE0_AUTH_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCodeExecutionProviderCache();
  });

  it("treats every supported DSA language as executable", () => {
    for (const language of supportedCodeLanguages) {
      expect(canExecuteLanguage(language)).toBe(true);
    }
  });

  it("runs remote languages through the Judge0 batch runner", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 71,
            name: "Python (3.13.2)",
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissions: [{ token: "token-1" }, { token: "token-2" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissions: [
            {
              token: "token-1",
              stdout: "3\n",
              stderr: null,
              compile_output: null,
              message: null,
              status: { id: 3, description: "Accepted" },
              time: "0.01",
              memory: 1024,
            },
            {
              token: "token-2",
              stdout: "0\n",
              stderr: null,
              compile_output: null,
              message: null,
              status: { id: 4, description: "Wrong Answer" },
              time: "0.02",
              memory: 1024,
            },
          ],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await executeProblemCodeWithProvider({
      code: `
import sys

def solve(raw_input: str) -> str:
    left, right = map(int, raw_input.strip().split())
    return str(left + right)

if __name__ == "__main__":
    data = sys.stdin.read()
    sys.stdout.write(solve(data))
      `,
      language: CodeLanguage.PYTHON,
      testCases: remoteSampleCases,
      revealHiddenDetails: false,
    });

    expect(result.summary.passedCount).toBe(1);
    expect(result.summary.totalCount).toBe(2);
    expect(result.summary.status).toBe(CodeExecutionStatus.PARTIAL);
    expect(result.results[0]).toMatchObject({
      passed: true,
      actualOutput: "3",
    });
    expect(result.results[1]).toMatchObject({
      isHidden: true,
      input: null,
      expectedOutput: null,
      actualOutput: null,
      errorMessage: "Wrong Answer",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[1]?.body ?? "")).toContain('"language_id":71');
  });

  it("maps remote compilation failures to syntax errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 91,
            name: "Java (OpenJDK 17.0.6)",
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissions: [{ token: "token-1" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissions: [
            {
              token: "token-1",
              stdout: null,
              stderr: null,
              compile_output: "Main.java:4: error: ';' expected",
              message: null,
              status: { id: 6, description: "Compilation Error" },
              time: null,
              memory: null,
            },
          ],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await executeProblemCodeWithProvider({
      code: "public class Main { public static void main(String[] args) { System.out.println( } }",
      language: CodeLanguage.JAVA,
      testCases: [remoteSampleCases[0]],
      revealHiddenDetails: true,
    });

    expect(result.summary.status).toBe(CodeExecutionStatus.SYNTAX_ERROR);
    expect(result.results[0]?.errorMessage).toContain("error");
  });
});
