"use client";

import { FilePlus2, Loader2, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { RequestFieldError } from "@/components/approvals/request-field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitProblemChangeRequestAction } from "@/lib/actions/content-approval-actions";
import {
  ChangeRequestOperationType,
  CodeLanguage,
  Difficulty,
} from "@/generated/prisma/enums";

type TopicOption = {
  id: string;
  name: string;
};

type CompanyOption = {
  id: string;
  name: string;
};

type ProblemRequestableRecord = {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  topicId: string;
  problemStatement: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  hints: string[];
  editorial: string;
  similarProblemSlugs: string[];
  roleFocus?: string | null;
  frequency: number;
  estimatedMinutes: number;
  codeExecutionEnabled: boolean;
  starterCode?: string | null;
  starterLanguage: CodeLanguage;
  companyTags: Array<{
    companyId: string;
    frequency: number;
    role?: string | null;
    notes?: string | null;
  }>;
  testCases: Array<{
    label?: string | null;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    sortOrder: number;
  }>;
};

function prettyJson(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

export function ProblemRequestSection({
  availableModes,
  companies,
  currentProblem,
  topics,
}: {
  availableModes: ChangeRequestOperationType[];
  companies: CompanyOption[];
  currentProblem?: ProblemRequestableRecord | null;
  topics: TopicOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [mode, setMode] = useState<ChangeRequestOperationType | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const examplesJson = useMemo(
    () =>
      prettyJson(currentProblem?.examples ?? [{ input: "", output: "", explanation: "" }], "[]"),
    [currentProblem?.examples],
  );
  const companyTagsJson = useMemo(
    () =>
      prettyJson(
        currentProblem?.companyTags ?? [{ companyId: companies[0]?.id ?? "", frequency: 3 }],
        "[]",
      ),
    [companies, currentProblem?.companyTags],
  );
  const testCasesJson = useMemo(
    () =>
      prettyJson(
        currentProblem?.testCases ?? [
          {
            label: "Sample 1",
            input: "",
            expectedOutput: "",
            isHidden: false,
            sortOrder: 1,
          },
        ],
        "[]",
      ),
    [currentProblem?.testCases],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || !formRef.current) {
      return;
    }

    setFieldErrors({});
    setPanelError(null);
    const payload = new FormData(formRef.current);
    payload.set("operationType", mode);

    startTransition(async () => {
      const result = await submitProblemChangeRequestAction(payload);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setPanelError(result.error ?? "Unable to submit this problem request.");
        toast.error(result.error ?? "Unable to submit this problem request.");
        return;
      }

      toast.success(result.message ?? "Your problem request is now pending admin approval.");
      setMode(null);
      formRef.current?.reset();
      router.refresh();
    });
  }

  const summaryDefault =
    mode === ChangeRequestOperationType.UPDATE && currentProblem
      ? `Update problem: ${currentProblem.title}`
      : mode === ChangeRequestOperationType.DELETE && currentProblem
        ? `Remove problem: ${currentProblem.title}`
        : "Create problem request";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Problem approval workflow</CardTitle>
        <CardDescription>
          Submit new coding questions or request edits/removals. Nothing changes live until admin approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {availableModes.includes(ChangeRequestOperationType.CREATE) ? (
            <Button
              onClick={() => setMode(ChangeRequestOperationType.CREATE)}
              type="button"
              variant={mode === ChangeRequestOperationType.CREATE ? "default" : "secondary"}
            >
              <FilePlus2 className="size-4" />
              Request add
            </Button>
          ) : null}
          {availableModes.includes(ChangeRequestOperationType.UPDATE) && currentProblem ? (
            <Button
              onClick={() => setMode(ChangeRequestOperationType.UPDATE)}
              type="button"
              variant={mode === ChangeRequestOperationType.UPDATE ? "default" : "secondary"}
            >
              <PencilLine className="size-4" />
              Request edit
            </Button>
          ) : null}
          {availableModes.includes(ChangeRequestOperationType.DELETE) && currentProblem ? (
            <Button
              onClick={() => setMode(ChangeRequestOperationType.DELETE)}
              type="button"
              variant={mode === ChangeRequestOperationType.DELETE ? "danger" : "outline"}
            >
              <Trash2 className="size-4" />
              Request remove
            </Button>
          ) : null}
        </div>

        {mode ? (
          <form className="space-y-5 rounded-[24px] border border-border bg-background/40 p-5" onSubmit={handleSubmit} ref={formRef}>
            {currentProblem ? <input name="entityId" type="hidden" value={currentProblem.id} /> : null}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`problem-summary-${mode}`}>
                Request summary
              </label>
              <Input defaultValue={summaryDefault} id={`problem-summary-${mode}`} name="summary" />
              <RequestFieldError fieldErrors={fieldErrors} name="summary" />
            </div>

            {mode === ChangeRequestOperationType.DELETE ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="problem-delete-reason">
                  Why should this problem be removed?
                </label>
                <Textarea
                  defaultValue=""
                  id="problem-delete-reason"
                  name="deletionReason"
                  placeholder="Explain why this problem should be archived or replaced."
                />
                <RequestFieldError fieldErrors={fieldErrors} name="deletionReason" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-title-${mode}`}>
                      Title
                    </label>
                    <Input defaultValue={currentProblem?.title ?? ""} id={`problem-title-${mode}`} name="title" />
                    <RequestFieldError fieldErrors={fieldErrors} name="title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-slug-${mode}`}>
                      Slug
                    </label>
                    <Input defaultValue={currentProblem?.slug ?? ""} id={`problem-slug-${mode}`} name="slug" />
                    <RequestFieldError fieldErrors={fieldErrors} name="slug" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-difficulty-${mode}`}>
                      Difficulty
                    </label>
                    <Select defaultValue={currentProblem?.difficulty ?? Difficulty.EASY} id={`problem-difficulty-${mode}`} name="difficulty">
                      {Object.values(Difficulty).map((difficulty) => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty}
                        </option>
                      ))}
                    </Select>
                    <RequestFieldError fieldErrors={fieldErrors} name="difficulty" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-topic-${mode}`}>
                      Topic
                    </label>
                    <Select defaultValue={currentProblem?.topicId ?? topics[0]?.id ?? ""} id={`problem-topic-${mode}`} name="topicId">
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </Select>
                    <RequestFieldError fieldErrors={fieldErrors} name="topicId" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-frequency-${mode}`}>
                      Frequency
                    </label>
                    <Input
                      defaultValue={String(currentProblem?.frequency ?? 3)}
                      id={`problem-frequency-${mode}`}
                      max={5}
                      min={1}
                      name="frequency"
                      type="number"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="frequency" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-minutes-${mode}`}>
                      Estimated minutes
                    </label>
                    <Input
                      defaultValue={String(currentProblem?.estimatedMinutes ?? 30)}
                      id={`problem-minutes-${mode}`}
                      max={240}
                      min={5}
                      name="estimatedMinutes"
                      type="number"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="estimatedMinutes" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-role-focus-${mode}`}>
                    Role focus
                  </label>
                  <Input defaultValue={currentProblem?.roleFocus ?? ""} id={`problem-role-focus-${mode}`} name="roleFocus" />
                  <RequestFieldError fieldErrors={fieldErrors} name="roleFocus" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-statement-${mode}`}>
                    Problem statement
                  </label>
                  <Textarea defaultValue={currentProblem?.problemStatement ?? ""} id={`problem-statement-${mode}`} name="problemStatement" />
                  <RequestFieldError fieldErrors={fieldErrors} name="problemStatement" />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-constraints-${mode}`}>
                      Constraints
                    </label>
                    <Textarea
                      defaultValue={(currentProblem?.constraints ?? []).join("\n")}
                      id={`problem-constraints-${mode}`}
                      name="constraints"
                      placeholder="One constraint per line"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="constraints" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-hints-${mode}`}>
                      Hints
                    </label>
                    <Textarea
                      defaultValue={(currentProblem?.hints ?? []).join("\n")}
                      id={`problem-hints-${mode}`}
                      name="hints"
                      placeholder="One hint per line"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="hints" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-editorial-${mode}`}>
                    Editorial / solution
                  </label>
                  <Textarea defaultValue={currentProblem?.editorial ?? ""} id={`problem-editorial-${mode}`} name="editorial" />
                  <RequestFieldError fieldErrors={fieldErrors} name="editorial" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-similar-${mode}`}>
                    Similar problem slugs
                  </label>
                  <Textarea
                    defaultValue={(currentProblem?.similarProblemSlugs ?? []).join("\n")}
                    id={`problem-similar-${mode}`}
                    name="similarProblemSlugs"
                    placeholder="One slug per line"
                  />
                  <RequestFieldError fieldErrors={fieldErrors} name="similarProblemSlugs" />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`problem-starter-language-${mode}`}>
                      Starter language
                    </label>
                    <Select defaultValue={currentProblem?.starterLanguage ?? CodeLanguage.TYPESCRIPT} id={`problem-starter-language-${mode}`} name="starterLanguage">
                      {Object.values(CodeLanguage).map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </Select>
                    <RequestFieldError fieldErrors={fieldErrors} name="starterLanguage" />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                    <input
                      className="accent-[var(--primary)]"
                      defaultChecked={currentProblem?.codeExecutionEnabled ?? false}
                      name="codeExecutionEnabled"
                      type="checkbox"
                      value="true"
                    />
                    Enable executable workspace for this problem
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-starter-code-${mode}`}>
                    Starter code
                  </label>
                  <Textarea defaultValue={currentProblem?.starterCode ?? ""} id={`problem-starter-code-${mode}`} name="starterCode" />
                  <RequestFieldError fieldErrors={fieldErrors} name="starterCode" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-examples-${mode}`}>
                    Examples JSON
                  </label>
                  <Textarea
                    defaultValue={examplesJson}
                    id={`problem-examples-${mode}`}
                    name="examples"
                    placeholder='[{"input":"...","output":"...","explanation":"..."}]'
                  />
                  <RequestFieldError fieldErrors={fieldErrors} name="examples" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-company-tags-${mode}`}>
                    Company tags JSON
                  </label>
                  <Textarea
                    defaultValue={companyTagsJson}
                    id={`problem-company-tags-${mode}`}
                    name="companyTags"
                    placeholder='[{"companyId":"...","frequency":3,"role":"Intern","notes":"Popular in OA"}]'
                  />
                  <RequestFieldError fieldErrors={fieldErrors} name="companyTags" />
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted">
                    Available company IDs: {companies.map((company) => `${company.name} (${company.id})`).join(" · ")}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`problem-test-cases-${mode}`}>
                    Test cases JSON
                  </label>
                  <Textarea
                    defaultValue={testCasesJson}
                    id={`problem-test-cases-${mode}`}
                    name="testCases"
                    placeholder='[{"label":"Sample 1","input":"...","expectedOutput":"...","isHidden":false,"sortOrder":1}]'
                  />
                  <RequestFieldError fieldErrors={fieldErrors} name="testCases" />
                </div>
              </>
            )}

            {panelError ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {panelError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={isPending} type="submit">
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === ChangeRequestOperationType.CREATE
                  ? "Send add request"
                  : mode === ChangeRequestOperationType.UPDATE
                    ? "Send edit request"
                    : "Send remove request"}
              </Button>
              <Button disabled={isPending} onClick={() => setMode(null)} type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
