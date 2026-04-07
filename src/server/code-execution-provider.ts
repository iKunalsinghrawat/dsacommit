import "server-only";

import {
  getExecutionUnavailableMessage,
  getLanguageConfig,
  supportsExecution,
  supportsLocalExecution,
  usesRemoteExecution,
} from "@/config/languages";
import { CodeExecutionStatus, CodeLanguage } from "@/generated/prisma/enums";
import {
  buildExecutionFailureResponse,
  deriveOverallStatus,
  executeProblemCodeLocally,
  maskExecutionResult,
  type ExecutionResponse,
  type ExecutionTestCase,
  type ExecutionTestResult,
} from "@/lib/problem-execution";

const DEFAULT_CODE_EXECUTION_PROVIDER = "judge0";
const DEFAULT_JUDGE0_API_URL = "https://ce.judge0.com";
const REQUEST_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 350;
const MAX_POLL_ATTEMPTS = 40;

type CodeExecutionProvider = "judge0" | "disabled" | "unknown";

type Judge0LanguageRecord = {
  id: number;
  name: string;
};

type Judge0Status = {
  id: number;
  description: string;
};

type Judge0SubmissionToken = {
  token: string | null;
};

type Judge0SubmissionResult = {
  token: string | null;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: Judge0Status | null;
  time: string | null;
  memory: number | null;
};

let judge0LanguageCatalogPromise: Promise<Judge0LanguageRecord[]> | null = null;

function getConfiguredExecutionProvider(): CodeExecutionProvider {
  const rawProvider = process.env.CODE_EXECUTION_PROVIDER?.trim().toLowerCase();

  if (!rawProvider || rawProvider === DEFAULT_CODE_EXECUTION_PROVIDER) {
    return "judge0";
  }

  if (rawProvider === "disabled" || rawProvider === "none" || rawProvider === "off") {
    return "disabled";
  }

  return "unknown";
}

function getJudge0ApiUrl() {
  return (process.env.JUDGE0_API_URL?.trim() || DEFAULT_JUDGE0_API_URL).replace(/\/+$/, "");
}

function getJudge0Headers() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = process.env.JUDGE0_AUTH_TOKEN?.trim();

  if (!token) {
    return headers;
  }

  headers[process.env.JUDGE0_AUTH_HEADER?.trim() || "X-Auth-Token"] = token;
  return headers;
}

function normalizeOutput(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return value.replace(/\r\n/g, "\n").trim();
}

function getJudge0ErrorMessage(submission: Judge0SubmissionResult) {
  return (
    normalizeOutput(submission.compile_output) ??
    normalizeOutput(submission.stderr) ??
    normalizeOutput(submission.message) ??
    submission.status?.description ??
    "Execution failed in the remote runner."
  );
}

function mapJudge0StatusToExecutionStatus(status: Judge0Status | null | undefined) {
  const description = status?.description?.toLowerCase() ?? "";

  if (description === "accepted") {
    return CodeExecutionStatus.PASSED;
  }

  if (description === "wrong answer") {
    return CodeExecutionStatus.FAILED;
  }

  if (description.includes("compile") || description.includes("compilation")) {
    return CodeExecutionStatus.SYNTAX_ERROR;
  }

  if (description.includes("time limit")) {
    return CodeExecutionStatus.TIMEOUT;
  }

  if (description.includes("runtime error") || description.includes("internal error")) {
    return CodeExecutionStatus.RUNTIME_ERROR;
  }

  return CodeExecutionStatus.RUNTIME_ERROR;
}

function isJudge0SubmissionComplete(submission: Judge0SubmissionResult) {
  const statusId = submission.status?.id;
  return statusId !== undefined && statusId !== 1 && statusId !== 2;
}

async function requestJudge0<T>(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getJudge0ApiUrl()}${path}`, {
      ...init,
      headers: {
        ...getJudge0Headers(),
        ...(init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text().catch(() => "")).trim();
      throw new Error(
        `Remote execution provider request failed with status ${response.status}.${body ? ` ${body}` : ""}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The remote code runner timed out while contacting the execution provider.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJudge0LanguageCatalog() {
  if (!judge0LanguageCatalogPromise) {
    judge0LanguageCatalogPromise = requestJudge0<Judge0LanguageRecord[]>(
      "/languages?fields=id,name",
    ).catch((error) => {
      judge0LanguageCatalogPromise = null;
      throw error;
    });
  }

  return judge0LanguageCatalogPromise;
}

async function resolveJudge0LanguageId(language: CodeLanguage) {
  const config = getLanguageConfig(language);
  const catalog = await getJudge0LanguageCatalog();
  const matchedLanguage = catalog.find((item) =>
    config.judge0NamePatterns.some((pattern) => pattern.test(item.name)),
  );

  if (!matchedLanguage) {
    throw new Error(
      `${config.label} is not available in the configured remote execution provider.`,
    );
  }

  return matchedLanguage.id;
}

async function createJudge0BatchSubmissions(input: {
  languageId: number;
  code: string;
  testCases: ExecutionTestCase[];
}) {
  const response = await requestJudge0<{ submissions: Judge0SubmissionToken[] }>(
    "/submissions/batch?base64_encoded=false",
    {
      method: "POST",
      body: JSON.stringify({
        submissions: input.testCases.map((testCase) => ({
          language_id: input.languageId,
          source_code: input.code,
          stdin: testCase.input,
          expected_output: testCase.expectedOutput,
          cpu_time_limit: 2,
          wall_time_limit: 5,
          memory_limit: 256000,
        })),
      }),
    },
  );

  const tokens = response.submissions.map((submission) => submission.token).filter(Boolean) as string[];

  if (tokens.length !== input.testCases.length) {
    throw new Error("The remote execution provider did not return tokens for every submitted test case.");
  }

  return tokens;
}

async function fetchJudge0BatchResults(tokens: string[]) {
  return requestJudge0<{ submissions: Judge0SubmissionResult[] }>(
    `/submissions/batch?base64_encoded=false&tokens=${encodeURIComponent(tokens.join(","))}`,
  );
}

async function waitForJudge0BatchResults(tokens: string[]) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetchJudge0BatchResults(tokens);

    if (response.submissions.every(isJudge0SubmissionComplete)) {
      return response.submissions;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("The remote execution provider timed out while waiting for the submitted code to finish.");
}

function mapJudge0SubmissionResult(input: {
  testCase: ExecutionTestCase;
  submission: Judge0SubmissionResult;
  revealHiddenDetails: boolean;
}): ExecutionTestResult {
  const status = mapJudge0StatusToExecutionStatus(input.submission.status);
  const passed = status === CodeExecutionStatus.PASSED;
  const actualOutput = normalizeOutput(input.submission.stdout);
  const errorMessage = passed ? null : getJudge0ErrorMessage(input.submission);

  return maskExecutionResult(
    {
      id: input.testCase.id,
      label: input.testCase.label ?? `Test ${input.testCase.sortOrder}`,
      isHidden: input.testCase.isHidden,
      status,
      passed,
      input: input.testCase.input,
      expectedOutput: input.testCase.expectedOutput,
      actualOutput,
      errorMessage,
    },
    input.revealHiddenDetails,
  );
}

async function executeProblemCodeRemotely(input: {
  code: string;
  language: CodeLanguage;
  testCases: ExecutionTestCase[];
  revealHiddenDetails?: boolean;
}): Promise<ExecutionResponse> {
  const startedAt = performance.now();

  try {
    const sortedTestCases = [...input.testCases].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    const languageId = await resolveJudge0LanguageId(input.language);
    const tokens = await createJudge0BatchSubmissions({
      languageId,
      code: input.code,
      testCases: sortedTestCases,
    });
    const submissions = await waitForJudge0BatchResults(tokens);
    const results = sortedTestCases.map((testCase, index) =>
      mapJudge0SubmissionResult({
        testCase,
        submission: submissions[index] ?? {
          token: null,
          stdout: null,
          stderr: null,
          compile_output: null,
          message: "Missing execution result from remote runner.",
          status: {
            id: 13,
            description: "Internal Error",
          },
          time: null,
          memory: null,
        },
        revealHiddenDetails: input.revealHiddenDetails ?? false,
      }),
    );

    return {
      summary: {
        passedCount: results.filter((result) => result.passed).length,
        totalCount: results.length,
        status: deriveOverallStatus(results),
        runtimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
      },
      results,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The remote execution provider could not run this submission.";

    return buildExecutionFailureResponse({
      language: input.language,
      testCases: input.testCases,
      revealHiddenDetails: input.revealHiddenDetails,
      runtimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
      message,
    });
  }
}

export function canExecuteLanguage(language: CodeLanguage) {
  if (!supportsExecution(language)) {
    return false;
  }

  if (supportsLocalExecution(language)) {
    return true;
  }

  return usesRemoteExecution(language) && getConfiguredExecutionProvider() === "judge0";
}

export function getUnsupportedExecutionMessage(language: CodeLanguage) {
  if (!usesRemoteExecution(language)) {
    return getExecutionUnavailableMessage(language);
  }

  const provider = getConfiguredExecutionProvider();

  if (provider === "disabled") {
    return `${getLanguageConfig(language).label} execution is disabled on this deployment. Set CODE_EXECUTION_PROVIDER=judge0 to enable the remote runner.`;
  }

  if (provider === "unknown") {
    return `${getLanguageConfig(language).label} execution is unavailable because the configured CODE_EXECUTION_PROVIDER is not supported by this app yet.`;
  }

  return getExecutionUnavailableMessage(language);
}

export async function executeProblemCodeWithProvider(input: {
  code: string;
  language: CodeLanguage;
  testCases: ExecutionTestCase[];
  revealHiddenDetails?: boolean;
}) {
  if (supportsLocalExecution(input.language)) {
    return executeProblemCodeLocally(input);
  }

  if (!canExecuteLanguage(input.language)) {
    return buildExecutionFailureResponse({
      language: input.language,
      testCases: input.testCases,
      revealHiddenDetails: input.revealHiddenDetails,
      runtimeMs: 1,
      message: getUnsupportedExecutionMessage(input.language),
    });
  }

  return executeProblemCodeRemotely(input);
}

export function resetCodeExecutionProviderCache() {
  judge0LanguageCatalogPromise = null;
}
