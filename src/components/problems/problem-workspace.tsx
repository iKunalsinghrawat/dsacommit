"use client";

import {
  CheckCircle2,
  CircleAlert,
  Code2,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CodeEditorSurface } from "@/components/problems/code-editor-surface";
import {
  createStarterTemplateForLanguage,
  getLanguageConfig,
  getLanguageOptions,
  supportsExecution,
  supportedCodeLanguages,
} from "@/config/languages";
import { CodeExecutionStatus, CodeLanguage } from "@/generated/prisma/enums";
import { cn, formatDate, formatRelative } from "@/lib/utils";

type VisibleTestCase = {
  id: string;
  label: string | null;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  sortOrder: number;
};

type CodeDraftRecord = {
  language: CodeLanguage;
  sourceCode: string;
  updatedAt: Date | string;
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

type WorkspaceMessageTone = "neutral" | "success" | "warning" | "error";

type WorkspaceMessage = {
  tone: WorkspaceMessageTone;
  label: string;
};

type DraftPayload = {
  ok: boolean;
  error?: string;
  draft?: {
    language: CodeLanguage;
    sourceCode: string;
    updatedAt: string;
  };
};

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

function getLanguagePreferenceKey(problemId: string) {
  return `dsa-commit:selected-language:${problemId}`;
}

function buildCodeMap<T>(
  records: T[],
  getLanguage: (record: T) => CodeLanguage,
) {
  return records.reduce<Partial<Record<CodeLanguage, T>>>((accumulator, record) => {
    accumulator[getLanguage(record)] = record;
    return accumulator;
  }, {});
}

function buildInitialCodeState(input: {
  draftsByLanguage: Partial<Record<CodeLanguage, CodeDraftRecord>>;
  starterCode: string;
  starterLanguage: CodeLanguage;
  latestSubmissionsByLanguage: Partial<Record<CodeLanguage, LatestCodeSubmission>>;
  problemExamples: Array<{ input: string; output: string; explanation: string }>;
  problemTitle: string;
}) {
  const firstExample = input.problemExamples[0];

  return supportedCodeLanguages.reduce<Record<CodeLanguage, string>>((accumulator, language) => {
    accumulator[language] =
      input.draftsByLanguage[language]?.sourceCode ??
      input.latestSubmissionsByLanguage[language]?.code ??
      createStarterTemplateForLanguage(language, {
        problemTitle: input.problemTitle,
        sampleInput: firstExample?.input,
        sampleOutput: firstExample?.output,
        starterCode: input.starterCode,
        starterLanguage: input.starterLanguage,
      });
    return accumulator;
  }, {} as Record<CodeLanguage, string>);
}

function getMessageClasses(tone: WorkspaceMessageTone) {
  if (tone === "success") {
    return "border-success/20 bg-success/10 text-success";
  }

  if (tone === "warning") {
    return "border-warning/20 bg-warning/10 text-warning";
  }

  if (tone === "error") {
    return "border-danger/20 bg-danger/10 text-danger";
  }

  return "border-border bg-card text-muted";
}

export function ProblemWorkspace({
  codeDrafts,
  latestCodeSubmissions,
  problemId,
  problemTitle,
  problemExamples,
  starterCode,
  starterLanguage,
  visibleTestCases,
}: {
  codeDrafts: CodeDraftRecord[];
  latestCodeSubmissions: LatestCodeSubmission[];
  problemId: string;
  problemTitle: string;
  problemExamples: Array<{ input: string; output: string; explanation: string }>;
  starterCode: string;
  starterLanguage: CodeLanguage;
  visibleTestCases: VisibleTestCase[];
}) {
  const draftsByLanguage = useMemo(
    () => buildCodeMap(codeDrafts, (draft) => draft.language),
    [codeDrafts],
  );
  const latestSubmissionsByLanguage = useMemo(
    () => buildCodeMap(latestCodeSubmissions, (submission) => submission.language),
    [latestCodeSubmissions],
  );

  const initialCodeState = useMemo(
    () =>
      buildInitialCodeState({
        draftsByLanguage,
        starterCode,
        starterLanguage,
        latestSubmissionsByLanguage,
        problemExamples,
        problemTitle,
      }),
    [draftsByLanguage, latestSubmissionsByLanguage, problemExamples, problemTitle, starterCode, starterLanguage],
  );

  const [language, setLanguage] = useState<CodeLanguage>(
    codeDrafts[0]?.language ?? latestCodeSubmissions[0]?.language ?? starterLanguage,
  );
  const [codeByLanguage, setCodeByLanguage] = useState<Record<CodeLanguage, string>>(initialCodeState);
  const [draftUpdatedAtByLanguage, setDraftUpdatedAtByLanguage] = useState<
    Partial<Record<CodeLanguage, Date | string | null>>
  >(
    () =>
      supportedCodeLanguages.reduce<Partial<Record<CodeLanguage, Date | string | null>>>(
        (accumulator, currentLanguage) => {
          accumulator[currentLanguage] =
            draftsByLanguage[currentLanguage]?.updatedAt ??
            latestSubmissionsByLanguage[currentLanguage]?.createdAt ??
            null;
          return accumulator;
        },
        {},
      ),
  );
  const [latestSubmissionsState, setLatestSubmissionsState] = useState(latestSubmissionsByLanguage);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState<"run" | "submit" | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<WorkspaceMessage>({
    tone: "neutral",
    label: "Autosave is active for every language draft.",
  });
  const languageOptions = useMemo(() => getLanguageOptions(), []);

  const saveTimeoutRef = useRef<Partial<Record<CodeLanguage, number>>>({});
  const lastSavedCodeRef = useRef<Record<CodeLanguage, string>>(initialCodeState);
  const currentLanguageRef = useRef(language);

  useEffect(() => {
    currentLanguageRef.current = language;
  }, [language]);

  const selectedLanguageConfig = getLanguageConfig(language);
  const selectedCode = codeByLanguage[language];
  const selectedSubmission = latestSubmissionsState[language] ?? null;
  const selectedLastEditedAt = draftUpdatedAtByLanguage[language] ?? null;
  const selectedLanguageSupportsExecution = supportsExecution(language);
  const selectedLanguageUsesRemoteExecution =
    selectedLanguageConfig.executionMode === "remote";
  const selectedFileLabel = `solution.${selectedLanguageConfig.fileExtension}`;

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

  const persistDraft = useCallback(async (
    targetLanguage: CodeLanguage,
    nextCode: string,
    options?: { silent?: boolean; force?: boolean },
  ) => {
    const previousSavedCode = lastSavedCodeRef.current[targetLanguage];

    if (!options?.force && previousSavedCode === nextCode) {
      return true;
    }

    if (saveTimeoutRef.current[targetLanguage]) {
      window.clearTimeout(saveTimeoutRef.current[targetLanguage]);
      delete saveTimeoutRef.current[targetLanguage];
    }

    if (!options?.silent && targetLanguage === currentLanguageRef.current) {
      setIsSavingDraft(true);
      setWorkspaceMessage({
        tone: "neutral",
        label: "Saving draft...",
      });
    }

    try {
      const response = await fetch(`/api/problems/${problemId}/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: targetLanguage,
          code: nextCode,
        }),
      });

      const payload = (await response.json().catch(() => null)) as DraftPayload | null;

      if (!response.ok || !payload?.ok || !payload.draft) {
        const message = payload?.error ?? "Unable to save the current draft.";

        if (targetLanguage === currentLanguageRef.current) {
          setWorkspaceMessage({
            tone: "error",
            label: message,
          });
        }

        return false;
      }

      lastSavedCodeRef.current[targetLanguage] = nextCode;

      setDraftUpdatedAtByLanguage((current) => ({
        ...current,
        [targetLanguage]: payload.draft?.updatedAt ?? new Date().toISOString(),
      }));

      if (!options?.silent && targetLanguage === currentLanguageRef.current) {
        setWorkspaceMessage({
          tone: "success",
          label: "Draft saved",
        });
      }

      return true;
    } catch {
      if (targetLanguage === currentLanguageRef.current) {
        setWorkspaceMessage({
          tone: "error",
          label: "Draft save failed. Keeping your local copy safe.",
        });
      }

      return false;
    } finally {
      if (targetLanguage === currentLanguageRef.current) {
        setIsSavingDraft(false);
      }
    }
  }, [problemId]);

  const scheduleDraftSave = useCallback((targetLanguage: CodeLanguage, nextCode: string) => {
    if (saveTimeoutRef.current[targetLanguage]) {
      window.clearTimeout(saveTimeoutRef.current[targetLanguage]);
    }

    saveTimeoutRef.current[targetLanguage] = window.setTimeout(() => {
      void persistDraft(targetLanguage, nextCode);
    }, 900);
  }, [persistDraft]);

  useEffect(() => {
    setIsHydrated(true);

    const hydratedDrafts: Partial<Record<CodeLanguage, string>> = {};

    for (const currentLanguage of supportedCodeLanguages) {
      const savedDraft = window.localStorage.getItem(getStorageKey(problemId, currentLanguage));

      if (savedDraft !== null) {
        hydratedDrafts[currentLanguage] = savedDraft;
      }
    }

    if (Object.keys(hydratedDrafts).length > 0) {
      setCodeByLanguage((current) => ({
        ...current,
        ...hydratedDrafts,
      }));

      for (const currentLanguage of supportedCodeLanguages) {
        const savedDraft = hydratedDrafts[currentLanguage];

        if (savedDraft !== undefined && savedDraft !== lastSavedCodeRef.current[currentLanguage]) {
          scheduleDraftSave(currentLanguage, savedDraft);
        }
      }
    }

    const savedLanguage = window.localStorage.getItem(getLanguagePreferenceKey(problemId));

    if (
      savedLanguage &&
      supportedCodeLanguages.includes(savedLanguage as CodeLanguage)
    ) {
      setLanguage(savedLanguage as CodeLanguage);
    }
  }, [problemId, scheduleDraftSave]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(getLanguagePreferenceKey(problemId), language);
  }, [isHydrated, language, problemId]);

  function handleCodeChange(nextCode: string) {
    setCodeByLanguage((current) => ({
      ...current,
      [language]: nextCode,
    }));

    if (isHydrated) {
      window.localStorage.setItem(getStorageKey(problemId, language), nextCode);
    }

    setWorkspaceMessage({
      tone: "neutral",
      label: "Saving draft...",
    });
    scheduleDraftSave(language, nextCode);
  }

  function handleLanguageChange(nextLanguage: CodeLanguage) {
    setLanguage(nextLanguage);
    setExecutionResult(null);
    setWorkspaceError(null);
    setWorkspaceMessage({
      tone: "warning",
      label: `Language changed to ${getLanguageConfig(nextLanguage).label}.`,
    });
  }

  async function execute(mode: "run" | "submit") {
    setWorkspaceError(null);
    setLastActionLabel(mode);

    if (mode === "run") {
      setIsRunning(true);
    } else {
      setIsSubmitting(true);
    }

    await persistDraft(language, selectedCode, { silent: true, force: true });

    try {
      const response = await fetch(`/api/problems/${problemId}/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: selectedCode,
          language,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string; result?: ExecutionResult }
        | null;

      if (!response.ok || !payload?.ok || !payload.result) {
        const message = payload?.error ?? `Unable to ${mode} the current code.`;
        setWorkspaceError(message);
        setWorkspaceMessage({
          tone: "error",
          label: message,
        });
        toast.error(message);
        return;
      }

      const result = payload.result;

      setExecutionResult(result);
      setWorkspaceMessage({
        tone: "success",
        label: mode === "submit" ? "Submission finished." : "Run complete.",
      });

      if (mode === "submit") {
        const createdAt = new Date().toISOString();
        setLatestSubmissionsState((current) => ({
          ...current,
          [language]: {
            code: selectedCode,
            language,
            passedCount: result.summary.passedCount,
            totalCount: result.summary.totalCount,
            status: result.summary.status,
            createdAt,
          },
        }));
        setDraftUpdatedAtByLanguage((current) => ({
          ...current,
          [language]: createdAt,
        }));
      }

      const summary = `${result.summary.passedCount}/${result.summary.totalCount} test cases passed`;
      toast.success(mode === "submit" ? `Submission recorded. ${summary}.` : summary);
    } catch {
      const message = `Something went wrong while trying to ${mode} the code.`;
      setWorkspaceError(message);
      setWorkspaceMessage({
        tone: "error",
        label: message,
      });
      toast.error(message);
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  }

  async function resetCode() {
    const nextCode = createStarterTemplateForLanguage(language, {
      problemTitle,
      sampleInput: problemExamples[0]?.input,
      sampleOutput: problemExamples[0]?.output,
      starterCode,
      starterLanguage,
    });

    setCodeByLanguage((current) => ({
      ...current,
      [language]: nextCode,
    }));
    lastSavedCodeRef.current[language] = nextCode;
    setExecutionResult(null);
    setWorkspaceError(null);
    setWorkspaceMessage({
      tone: "success",
      label: "Starter template restored.",
    });

    if (saveTimeoutRef.current[language]) {
      window.clearTimeout(saveTimeoutRef.current[language]);
      delete saveTimeoutRef.current[language];
    }

    if (isHydrated) {
      window.localStorage.removeItem(getStorageKey(problemId, language));
    }

    try {
      await fetch(`/api/problems/${problemId}/draft`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language }),
      });
    } catch {
      // Keep the local reset even if the remote delete fails.
    }

    setDraftUpdatedAtByLanguage((current) => ({
      ...current,
      [language]: null,
    }));

    toast.success("Starter code restored.");
  }

  useEffect(() => {
    const timers = saveTimeoutRef.current;

    return () => {
      for (const currentLanguage of supportedCodeLanguages) {
        if (timers[currentLanguage]) {
          window.clearTimeout(timers[currentLanguage]);
        }
      }
    };
  }, []);

  const isBusy = isRunning || isSubmitting;

  return (
    <Card className="glass-panel-strong overflow-hidden">
      <CardHeader className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Code workspace</CardTitle>
              <Badge variant="secondary">{selectedLanguageConfig.label}</Badge>
              <Badge variant="outline">{selectedLanguageConfig.versionLabel}</Badge>
              <Badge variant={selectedLanguageSupportsExecution ? "success" : "outline"}>
                {selectedLanguageSupportsExecution
                  ? selectedLanguageUsesRemoteExecution
                    ? "Remote runner ready"
                    : "Run and submit ready"
                  : "Execution unavailable"}
              </Badge>
            </div>
            <CardDescription>
              Switch languages without losing drafts. Every problem keeps a separate saved workspace for each language.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Autosave on</Badge>
            {selectedSubmission ? (
              <Badge variant="outline">
                Last submit {selectedSubmission.passedCount}/{selectedSubmission.totalCount} on{" "}
                {formatDate(selectedSubmission.createdAt, "dd MMM, hh:mm a")}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="language">
              Language
            </label>
            <Select
              className="max-h-11"
              id="language"
              onChange={(event) => handleLanguageChange(event.target.value as CodeLanguage)}
              value={language}
            >
              {languageOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-3 lg:justify-end">
            <Button
              disabled={isBusy || !selectedLanguageSupportsExecution}
              onClick={() => execute("run")}
              type="button"
              variant="secondary"
            >
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run code
            </Button>
            <Button disabled={isBusy || !selectedLanguageSupportsExecution} onClick={() => execute("submit")} type="button">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit code
            </Button>
            <Button disabled={isBusy} onClick={() => void resetCode()} type="button" variant="outline">
              <RotateCcw className="size-4" />
              Reset code
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className={cn("rounded-[22px] border px-4 py-3 text-sm", getMessageClasses(workspaceMessage.tone))}>
            <div className="flex flex-wrap items-center gap-2">
              {isSavingDraft ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span className="font-medium">{workspaceMessage.label}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span>Current language: {selectedLanguageConfig.label}</span>
              {selectedLastEditedAt ? <span>Last edited {formatRelative(selectedLastEditedAt)}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge variant="outline">{selectedFileLabel}</Badge>
            {!selectedLanguageSupportsExecution ? (
              <span>Drafts save normally. Execution is not available on this deployment right now.</span>
            ) : selectedLanguageUsesRemoteExecution ? (
              <span>Run uses visible sample tests in the remote sandbox. Submit also checks hidden tests.</span>
            ) : (
              <span>Run uses sample tests. Submit includes hidden tests.</span>
            )}
          </div>
        </div>

        <CodeEditorSurface
          language={language}
          minHeight={440}
          onChange={handleCodeChange}
          value={selectedCode}
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
                <Badge variant="outline">
                  <Code2 className="size-3.5" />
                  {selectedLanguageSupportsExecution
                    ? selectedLanguageUsesRemoteExecution
                      ? "Remote runner ready"
                      : "Ready to run"
                    : "Execution unavailable"}
                </Badge>
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
