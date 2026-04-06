"use client";

import { CheckCircle2, CircleAlert, Loader2, Play, RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CodeEditorSurface } from "@/components/problems/code-editor-surface";
import { CodeExecutionStatus, CodeLanguage } from "@/generated/prisma/enums";
import { cn, formatDate } from "@/lib/utils";

type VisibleTestCase = {
  id: string;
  label: string | null;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  sortOrder: number;
};

type LatestCodeSubmission = {
  code: string;
  language: CodeLanguage;
  passedCount: number;
  totalCount: number;
  status: CodeExecutionStatus;
  createdAt: Date | string;
};

type ExecutionResult = {
  summary: {
    passedCount: number;
    totalCount: number;
    status: CodeExecutionStatus;
    runtimeMs: number;
  };
  results: Array<{
    id: string;
    label: string;
    isHidden: boolean;
    status: CodeExecutionStatus;
    passed: boolean;
    input: string | null;
    expectedOutput: string | null;
    actualOutput: string | null;
    errorMessage: string | null;
  }>;
};

const supportedLanguages = [
  { value: CodeLanguage.TYPESCRIPT, label: "TypeScript" },
  { value: CodeLanguage.JAVASCRIPT, label: "JavaScript" },
] as const;

function getStatusBadgeVariant(status: CodeExecutionStatus) {
  if (status === CodeExecutionStatus.PASSED) {
    return "success";
  }

  if (status === CodeExecutionStatus.PARTIAL) {
    return "secondary";
  }

  return "outline";
}

function getStatusLabel(status: CodeExecutionStatus) {
  switch (status) {
    case CodeExecutionStatus.PASSED:
      return "Passed";
    case CodeExecutionStatus.PARTIAL:
      return "Partial";
    case CodeExecutionStatus.FAILED:
      return "Failed";
    case CodeExecutionStatus.RUNTIME_ERROR:
      return "Runtime error";
    case CodeExecutionStatus.SYNTAX_ERROR:
      return "Syntax error";
    case CodeExecutionStatus.TIMEOUT:
      return "Timed out";
    default:
      return status;
  }
}

function getStorageKey(problemId: string, language: CodeLanguage) {
  return `dsa-commit:${problemId}:${language}`;
}

export function ProblemWorkspace({
  problemId,
  problemTitle,
  starterCode,
  starterLanguage,
  visibleTestCases,
  latestCodeSubmission,
}: {
  problemId: string;
  problemTitle: string;
  starterCode: string;
  starterLanguage: CodeLanguage;
  visibleTestCases: VisibleTestCase[];
  latestCodeSubmission?: LatestCodeSubmission | null;
}) {
  const [language, setLanguage] = useState<CodeLanguage>(latestCodeSubmission?.language ?? starterLanguage);
  const [code, setCode] = useState<string>(latestCodeSubmission?.code ?? starterCode);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState<"run" | "submit" | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const savedDraft = window.localStorage.getItem(getStorageKey(problemId, language));

    if (savedDraft !== null) {
      setCode(savedDraft);
      return;
    }

    if (latestCodeSubmission?.language === language) {
      setCode(latestCodeSubmission.code);
      return;
    }

    setCode(starterCode);
  }, [isHydrated, language, latestCodeSubmission, problemId, starterCode]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(getStorageKey(problemId, language), code);
  }, [code, isHydrated, language, problemId]);

  const testCasesToRender = useMemo(() => {
    if (executionResult) {
      return executionResult.results;
    }

    return visibleTestCases.map((testCase) => ({
      id: testCase.id,
      label: testCase.label ?? `Sample ${testCase.sortOrder}`,
      isHidden: false,
      status: CodeExecutionStatus.FAILED,
      passed: false,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: null,
      errorMessage: null,
    }));
  }, [executionResult, visibleTestCases]);

  async function execute(mode: "run" | "submit") {
    setWorkspaceError(null);
    setLastActionLabel(mode);

    if (mode === "run") {
      setIsRunning(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const response = await fetch(`/api/problems/${problemId}/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string; result?: ExecutionResult }
        | null;

      if (!response.ok || !payload?.ok || !payload.result) {
        const message = payload?.error ?? `Unable to ${mode} the current code.`;
        setWorkspaceError(message);
        toast.error(message);
        return;
      }

      setExecutionResult(payload.result);

      const summary = `${payload.result.summary.passedCount}/${payload.result.summary.totalCount} test cases passed`;
      toast.success(mode === "submit" ? `Submission recorded. ${summary}.` : summary);
    } catch {
      const message = `Something went wrong while trying to ${mode} the code.`;
      setWorkspaceError(message);
      toast.error(message);
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  }

  function resetCode() {
    setCode(starterCode);
    setExecutionResult(null);
    setWorkspaceError(null);

    if (isHydrated) {
      window.localStorage.removeItem(getStorageKey(problemId, language));
    }

    toast.success("Starter code restored.");
  }

  const isBusy = isRunning || isSubmitting;

  return (
    <Card className="glass-panel-strong">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <CardTitle>Code workspace</CardTitle>
            <CardDescription>
              Implement <code className="rounded bg-background/80 px-2 py-1">solve(input)</code>, return a string, and use
              the sample tests to iterate before submitting.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Autosave on</Badge>
            {latestCodeSubmission ? (
              <Badge variant="outline">
                Last submit {latestCodeSubmission.passedCount}/{latestCodeSubmission.totalCount} on{" "}
                {formatDate(latestCodeSubmission.createdAt, "dd MMM, hh:mm a")}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="language">
              Language
            </label>
            <Select
              id="language"
              onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
              value={language}
            >
              {supportedLanguages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-3 md:justify-end">
            <Button disabled={isBusy} onClick={() => execute("run")} type="button" variant="secondary">
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run code
            </Button>
            <Button disabled={isBusy} onClick={() => execute("submit")} type="button">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit code
            </Button>
            <Button disabled={isBusy} onClick={resetCode} type="button" variant="outline">
              <RotateCcw className="size-4" />
              Reset code
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CodeEditorSurface
          minHeight={420}
          onChange={setCode}
          value={code}
        />

        <Card className="border-border/70 bg-background/40">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Output and test cases</CardTitle>
                <CardDescription>
                  {executionResult
                    ? `${executionResult.summary.passedCount}/${executionResult.summary.totalCount} test cases passed in ${executionResult.summary.runtimeMs} ms`
                    : `Visible sample tests for ${problemTitle}`}
                </CardDescription>
              </div>
              {executionResult ? (
                <Badge variant={getStatusBadgeVariant(executionResult.summary.status)}>
                  {getStatusLabel(executionResult.summary.status)}
                </Badge>
              ) : (
                <Badge variant="outline">Ready to run</Badge>
              )}
            </div>
            {workspaceError ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {workspaceError}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {lastActionLabel === "submit" && executionResult?.results.some((result) => result.isHidden) ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
                Hidden tests are included in submit results, but their inputs and expected outputs stay masked.
              </div>
            ) : null}

            {testCasesToRender.map((testCase) => (
              <div className="rounded-[24px] border border-border bg-card p-4" key={testCase.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {testCase.isHidden ? testCase.label || "Hidden test case" : testCase.label}
                  </p>
                  {executionResult ? (
                    <Badge
                      className={cn(
                        !testCase.passed &&
                          testCase.status !== CodeExecutionStatus.FAILED &&
                          "border-danger/20 bg-danger/10 text-danger",
                      )}
                      variant={testCase.passed ? "success" : getStatusBadgeVariant(testCase.status)}
                    >
                      {testCase.passed ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
                      {testCase.passed ? "Passed" : getStatusLabel(testCase.status)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sample</Badge>
                  )}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  <div className="space-y-2 rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Input</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
                      {testCase.input ?? "Hidden during submit"}
                    </pre>
                  </div>
                  <div className="space-y-2 rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Expected</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
                      {testCase.expectedOutput ?? "Hidden during submit"}
                    </pre>
                  </div>
                  <div className="space-y-2 rounded-2xl border border-border bg-background/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Actual</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
                      {testCase.actualOutput ??
                        testCase.errorMessage ??
                        (executionResult ? "No output returned." : "Run code to compare the output.")}
                    </pre>
                  </div>
                </div>

                {testCase.errorMessage ? (
                  <p className="mt-3 text-sm text-danger">{testCase.errorMessage}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
