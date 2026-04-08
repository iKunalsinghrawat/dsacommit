import "server-only";

import {
  CodeExecutionStatus,
  CodeLanguage,
  Role,
  SubmissionState,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { refreshStudentProfile } from "@/lib/student-progress";
import {
  canExecuteLanguage as canRunLanguage,
  executeProblemCodeWithProvider,
  getUnsupportedExecutionMessage as getExecutionProviderUnavailableMessage,
} from "@/server/code-execution-provider";
import type { ExecutionResponse } from "@/lib/problem-execution";

function getPrimaryErrorMessage(
  result: ExecutionResponse,
) {
  return result.results.find((item) => item.errorMessage)?.errorMessage ?? null;
}

export async function getProblemExecutionContext(problemId: string) {
  return prisma.problem.findUnique({
    where: { id: problemId },
    select: {
      id: true,
      title: true,
      starterCode: true,
      starterLanguage: true,
      codeExecutionEnabled: true,
      testCases: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
          sortOrder: true,
        },
      },
    },
  });
}

export async function runProblemCode(input: {
  problemId: string;
  code: string;
  language: CodeLanguage;
}) {
  const problem = await getProblemExecutionContext(input.problemId);

  if (!problem || !problem.codeExecutionEnabled) {
    return null;
  }

  const visibleCases = problem.testCases.filter((testCase) => !testCase.isHidden);

  return executeProblemCodeWithProvider({
    code: input.code,
    language: input.language,
    testCases: visibleCases,
    revealHiddenDetails: true,
  });
}

export async function submitProblemCode(input: {
  userId: string;
  userRole: Role;
  problemId: string;
  code: string;
  language: CodeLanguage;
}) {
  const problem = await getProblemExecutionContext(input.problemId);

  if (!problem || !problem.codeExecutionEnabled) {
    return null;
  }

  const result = await executeProblemCodeWithProvider({
    code: input.code,
    language: input.language,
    testCases: problem.testCases,
    revealHiddenDetails: false,
  });

  await prisma.codeSubmission.create({
    data: {
      userId: input.userId,
      problemId: input.problemId,
      language: input.language,
      code: input.code,
      passedCount: result.summary.passedCount,
      totalCount: result.summary.totalCount,
      status: result.summary.status,
      runtimeMs: result.summary.runtimeMs,
      errorMessage: getPrimaryErrorMessage(result),
    },
  });

  if (input.userRole === Role.STUDENT) {
    const solved = result.summary.status === CodeExecutionStatus.PASSED;

    await prisma.submissionStatus.upsert({
      where: {
        userId_problemId: {
          userId: input.userId,
          problemId: input.problemId,
        },
      },
      create: {
        userId: input.userId,
        problemId: input.problemId,
        status: solved ? SubmissionState.SOLVED : SubmissionState.ATTEMPTED,
        attempts: 1,
        language: input.language,
        note: solved
          ? "Solved from the built-in code workspace."
          : "Submitted in the built-in code workspace and still needs another pass.",
        solvedAt: solved ? new Date() : null,
        lastViewedAt: new Date(),
      },
      update: {
        status: solved ? SubmissionState.SOLVED : SubmissionState.ATTEMPTED,
        attempts: { increment: 1 },
        language: input.language,
        note: solved
          ? "Solved from the built-in code workspace."
          : "Submitted in the built-in code workspace and still needs another pass.",
        solvedAt: solved ? new Date() : null,
        lastViewedAt: new Date(),
      },
    });

    await refreshStudentProfile(input.userId);
  }

  return result;
}

export function getUnsupportedExecutionMessage(language: CodeLanguage) {
  return getExecutionProviderUnavailableMessage(language);
}

export function canExecuteLanguage(language: CodeLanguage) {
  return canRunLanguage(language);
}

export async function saveProblemDraft(input: {
  userId: string;
  problemId: string;
  language: CodeLanguage;
  code: string;
}) {
  const problem = await prisma.problem.findUnique({
    where: { id: input.problemId },
    select: {
      id: true,
      codeExecutionEnabled: true,
    },
  });

  if (!problem || !problem.codeExecutionEnabled) {
    return null;
  }

  return prisma.codeDraft.upsert({
    where: {
      userId_problemId_language: {
        userId: input.userId,
        problemId: input.problemId,
        language: input.language,
      },
    },
    create: {
      userId: input.userId,
      problemId: input.problemId,
      language: input.language,
      sourceCode: input.code,
    },
    update: {
      sourceCode: input.code,
    },
    select: {
      language: true,
      sourceCode: true,
      updatedAt: true,
    },
  });
}

export async function deleteProblemDraft(input: {
  userId: string;
  problemId: string;
  language: CodeLanguage;
}) {
  const problem = await prisma.problem.findUnique({
    where: { id: input.problemId },
    select: {
      id: true,
      codeExecutionEnabled: true,
    },
  });

  if (!problem || !problem.codeExecutionEnabled) {
    return null;
  }

  await prisma.codeDraft.deleteMany({
    where: {
      userId: input.userId,
      problemId: input.problemId,
      language: input.language,
    },
  });

  return {
    language: input.language,
  };
}
