import "server-only";

import { Script, createContext } from "node:vm";
import ts from "typescript";

import { getExecutionUnavailableMessage, supportsLocalExecution } from "@/config/languages";
import { CodeExecutionStatus, CodeLanguage } from "@/generated/prisma/enums";

const MODULE_BOOT_TIMEOUT_MS = 400;
const TEST_TIMEOUT_MS = 600;
const EXECUTION_FILENAME = "submission.ts";

export type ExecutionTestCase = {
  id: string;
  label: string | null;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  sortOrder: number;
};

export type ExecutionTestResult = {
  id: string;
  label: string;
  isHidden: boolean;
  status: CodeExecutionStatus;
  passed: boolean;
  input: string | null;
  expectedOutput: string | null;
  actualOutput: string | null;
  errorMessage: string | null;
};

export type ExecutionSummary = {
  passedCount: number;
  totalCount: number;
  status: CodeExecutionStatus;
  runtimeMs: number;
};

export type ExecutionResponse = {
  summary: ExecutionSummary;
  results: ExecutionTestResult[];
};

type RunnerSandbox = {
  module: { exports: Record<string, unknown> };
  exports: Record<string, unknown>;
  console: {
    log: () => void;
    error: () => void;
    warn: () => void;
    info: () => void;
  };
  globalThis?: RunnerSandbox;
  solve?: unknown;
};

function normalizeComparableOutput(value: string) {
  const trimmed = value.replace(/\r\n/g, "\n").trim();

  if (!trimmed) {
    return "";
  }

  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/[ \t]+/g, " ");
  }
}

function stringifyExecutionValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function mapExecutionErrorToStatus(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Unknown execution error.";

  if (/timed out/i.test(message)) {
    return {
      status: CodeExecutionStatus.TIMEOUT,
      message: "Execution timed out before this test case finished.",
    };
  }

  return {
    status: CodeExecutionStatus.RUNTIME_ERROR,
    message,
  };
}

function transpileSubmission(code: string, language: CodeLanguage) {
  const output = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: false,
    },
    fileName: EXECUTION_FILENAME,
    reportDiagnostics: true,
  });

  const diagnostic = output.diagnostics?.find((item) => item.category === ts.DiagnosticCategory.Error);

  if (diagnostic) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    throw new Error(
      `${CodeExecutionStatus.SYNTAX_ERROR}:${language === CodeLanguage.TYPESCRIPT ? "TypeScript" : "JavaScript"} compile error. ${message}`,
    );
  }

  return output.outputText;
}

function createSandboxContext(compiledCode: string) {
  const sandbox: RunnerSandbox = {
    module: { exports: {} as Record<string, unknown> },
    exports: {} as Record<string, unknown>,
    console: {
      log: () => undefined,
      error: () => undefined,
      warn: () => undefined,
      info: () => undefined,
    },
  };

  sandbox.exports = sandbox.module.exports;
  sandbox.globalThis = sandbox;

  const context = createContext(sandbox, {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });

  new Script(compiledCode, {
    filename: EXECUTION_FILENAME,
  }).runInContext(context, {
    timeout: MODULE_BOOT_TIMEOUT_MS,
  });

  const exportedSolve =
    (sandbox.module.exports as Record<string, unknown>).solve ??
    (sandbox.exports as Record<string, unknown>).solve ??
    sandbox.solve;

  if (typeof exportedSolve !== "function") {
    throw new Error("Export a synchronous solve(input) function before running the tests.");
  }

  return context;
}

function runSingleTest(compiledCode: string, testCase: ExecutionTestCase) {
  try {
    const context = createSandboxContext(compiledCode) as typeof globalThis & {
      __runnerInput?: string;
      __runnerOutput?: unknown;
    };

    context.__runnerInput = testCase.input;

    new Script(
      `
      const solveFn =
        typeof module.exports.solve === "function"
          ? module.exports.solve
          : typeof exports.solve === "function"
            ? exports.solve
            : solve;
      globalThis.__runnerOutput = solveFn(globalThis.__runnerInput);
    `,
      {
        filename: "runner.js",
      },
    ).runInContext(context, {
      timeout: TEST_TIMEOUT_MS,
    });

    if (
      context.__runnerOutput &&
      typeof context.__runnerOutput === "object" &&
      "then" in (context.__runnerOutput as object)
    ) {
      return {
        passed: false,
        status: CodeExecutionStatus.RUNTIME_ERROR,
        actualOutput: null,
        errorMessage: "Async solve functions are not supported in this editor yet.",
      };
    }

    const actualOutput = stringifyExecutionValue(context.__runnerOutput);
    const passed =
      normalizeComparableOutput(actualOutput) ===
      normalizeComparableOutput(testCase.expectedOutput);

    return {
      passed,
      status: passed ? CodeExecutionStatus.PASSED : CodeExecutionStatus.FAILED,
      actualOutput,
      errorMessage: null,
    };
  } catch (error) {
    const mapped = mapExecutionErrorToStatus(error);

    return {
      passed: false,
      status: mapped.status,
      actualOutput: null,
      errorMessage: mapped.message,
    };
  }
}

function deriveOverallStatus(results: ExecutionTestResult[]) {
  if (results.some((result) => result.status === CodeExecutionStatus.SYNTAX_ERROR)) {
    return CodeExecutionStatus.SYNTAX_ERROR;
  }

  if (results.some((result) => result.status === CodeExecutionStatus.TIMEOUT)) {
    return CodeExecutionStatus.TIMEOUT;
  }

  if (results.some((result) => result.status === CodeExecutionStatus.RUNTIME_ERROR)) {
    return CodeExecutionStatus.RUNTIME_ERROR;
  }

  const passedCount = results.filter((result) => result.passed).length;

  if (passedCount === results.length) {
    return CodeExecutionStatus.PASSED;
  }

  if (passedCount > 0) {
    return CodeExecutionStatus.PARTIAL;
  }

  return CodeExecutionStatus.FAILED;
}

function maskResult(result: ExecutionTestResult, revealHiddenDetails: boolean): ExecutionTestResult {
  if (!result.isHidden || revealHiddenDetails) {
    return result;
  }

  return {
    ...result,
    input: null,
    expectedOutput: null,
    actualOutput: null,
    errorMessage: result.errorMessage,
  };
}

export function executeProblemCode(input: {
  code: string;
  language: CodeLanguage;
  testCases: ExecutionTestCase[];
  revealHiddenDetails?: boolean;
}): ExecutionResponse {
  const startedAt = performance.now();

  if (!supportsLocalExecution(input.language)) {
    const message = getExecutionUnavailableMessage(input.language);

    return {
      summary: {
        passedCount: 0,
        totalCount: input.testCases.length,
        status: CodeExecutionStatus.RUNTIME_ERROR,
        runtimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
      },
      results: input.testCases.map((testCase) =>
        maskResult(
          {
            id: testCase.id,
            label: testCase.label ?? `Test ${testCase.sortOrder}`,
            isHidden: testCase.isHidden,
            status: CodeExecutionStatus.RUNTIME_ERROR,
            passed: false,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: null,
            errorMessage: message,
          },
          input.revealHiddenDetails ?? false,
        ),
      ),
    };
  }

  try {
    const compiledCode = transpileSubmission(input.code, input.language);

    const results = input.testCases
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((testCase) => {
        const outcome = runSingleTest(compiledCode, testCase);

        return {
          id: testCase.id,
          label: testCase.label ?? `Test ${testCase.sortOrder}`,
          isHidden: testCase.isHidden,
          status: outcome.status,
          passed: outcome.passed,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: outcome.actualOutput,
          errorMessage: outcome.errorMessage,
        } satisfies ExecutionTestResult;
      });

    const runtimeMs = Math.max(1, Math.round(performance.now() - startedAt));

    return {
      summary: {
        passedCount: results.filter((result) => result.passed).length,
        totalCount: results.length,
        status: deriveOverallStatus(results),
        runtimeMs,
      },
      results: results.map((result) => maskResult(result, input.revealHiddenDetails ?? false)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed.";
    const status = message.startsWith(`${CodeExecutionStatus.SYNTAX_ERROR}:`)
      ? CodeExecutionStatus.SYNTAX_ERROR
      : CodeExecutionStatus.RUNTIME_ERROR;
    const cleanMessage =
      status === CodeExecutionStatus.SYNTAX_ERROR ? message.replace(/^[^:]+:/, "").trim() : message;

    return {
      summary: {
        passedCount: 0,
        totalCount: input.testCases.length,
        status,
        runtimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
      },
      results: input.testCases.map((testCase) =>
        maskResult(
          {
            id: testCase.id,
            label: testCase.label ?? `Test ${testCase.sortOrder}`,
            isHidden: testCase.isHidden,
            status,
            passed: false,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: null,
            errorMessage: cleanMessage,
          },
          input.revealHiddenDetails ?? false,
        ),
      ),
    };
  }
}
