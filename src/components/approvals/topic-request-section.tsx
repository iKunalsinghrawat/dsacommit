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
import { submitTopicChangeRequestAction } from "@/lib/actions/content-approval-actions";
import { ChangeRequestOperationType, RoadmapLevel } from "@/generated/prisma/enums";

type TopicRequestableRecord = {
  id: string;
  name: string;
  slug: string;
  level: RoadmapLevel;
  sortOrder: number;
  conceptSummary: string;
  notes: string;
  difficultyProgression: string[];
  revisionChecklist: string[];
  quiz: Array<{ question: string; answer: string }>;
  estimatedHours: number;
  icon: string;
  accentColor: string;
};

export function TopicRequestSection({
  availableModes,
  currentTopic,
}: {
  availableModes: ChangeRequestOperationType[];
  currentTopic?: TopicRequestableRecord | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [mode, setMode] = useState<ChangeRequestOperationType | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const quizJson = useMemo(
    () => JSON.stringify(currentTopic?.quiz ?? [{ question: "", answer: "" }], null, 2),
    [currentTopic?.quiz],
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
      const result = await submitTopicChangeRequestAction(payload);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setPanelError(result.error ?? "Unable to submit this topic request.");
        toast.error(result.error ?? "Unable to submit this topic request.");
        return;
      }

      toast.success(result.message ?? "Your topic request is now pending admin approval.");
      setMode(null);
      formRef.current?.reset();
      router.refresh();
    });
  }

  const summaryDefault =
    mode === ChangeRequestOperationType.UPDATE && currentTopic
      ? `Update topic: ${currentTopic.name}`
      : mode === ChangeRequestOperationType.DELETE && currentTopic
        ? `Remove topic: ${currentTopic.name}`
        : "Create topic request";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic approval workflow</CardTitle>
        <CardDescription>
          Submit add, edit, or remove requests here. Live topic content only changes after admin approval.
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
          {availableModes.includes(ChangeRequestOperationType.UPDATE) && currentTopic ? (
            <Button
              onClick={() => setMode(ChangeRequestOperationType.UPDATE)}
              type="button"
              variant={mode === ChangeRequestOperationType.UPDATE ? "default" : "secondary"}
            >
              <PencilLine className="size-4" />
              Request edit
            </Button>
          ) : null}
          {availableModes.includes(ChangeRequestOperationType.DELETE) && currentTopic ? (
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
            {currentTopic ? <input name="entityId" type="hidden" value={currentTopic.id} /> : null}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`topic-summary-${mode}`}>
                Request summary
              </label>
              <Input defaultValue={summaryDefault} id={`topic-summary-${mode}`} name="summary" />
              <RequestFieldError fieldErrors={fieldErrors} name="summary" />
            </div>

            {mode === ChangeRequestOperationType.DELETE ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="topic-delete-reason">
                  Why should this topic be removed?
                </label>
                <Textarea
                  defaultValue=""
                  id="topic-delete-reason"
                  name="deletionReason"
                  placeholder="Explain why the live topic should be archived or replaced."
                />
                <RequestFieldError fieldErrors={fieldErrors} name="deletionReason" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-name-${mode}`}>
                      Topic name
                    </label>
                    <Input defaultValue={currentTopic?.name ?? ""} id={`topic-name-${mode}`} name="name" />
                    <RequestFieldError fieldErrors={fieldErrors} name="name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-slug-${mode}`}>
                      Slug
                    </label>
                    <Input defaultValue={currentTopic?.slug ?? ""} id={`topic-slug-${mode}`} name="slug" />
                    <RequestFieldError fieldErrors={fieldErrors} name="slug" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-level-${mode}`}>
                      Roadmap level
                    </label>
                    <Select defaultValue={currentTopic?.level ?? RoadmapLevel.BEGINNER} id={`topic-level-${mode}`} name="level">
                      {Object.values(RoadmapLevel).map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </Select>
                    <RequestFieldError fieldErrors={fieldErrors} name="level" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-sort-${mode}`}>
                      Sort order
                    </label>
                    <Input
                      defaultValue={String(currentTopic?.sortOrder ?? 1)}
                      id={`topic-sort-${mode}`}
                      min={1}
                      name="sortOrder"
                      type="number"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="sortOrder" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-hours-${mode}`}>
                      Estimated hours
                    </label>
                    <Input
                      defaultValue={String(currentTopic?.estimatedHours ?? 6)}
                      id={`topic-hours-${mode}`}
                      min={1}
                      name="estimatedHours"
                      type="number"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="estimatedHours" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-icon-${mode}`}>
                      Icon
                    </label>
                    <Input defaultValue={currentTopic?.icon ?? "Sparkles"} id={`topic-icon-${mode}`} name="icon" />
                    <RequestFieldError fieldErrors={fieldErrors} name="icon" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`topic-accent-${mode}`}>
                    Accent color
                  </label>
                  <Input defaultValue={currentTopic?.accentColor ?? "teal"} id={`topic-accent-${mode}`} name="accentColor" />
                  <RequestFieldError fieldErrors={fieldErrors} name="accentColor" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`topic-concept-${mode}`}>
                    Concept summary
                  </label>
                  <Textarea defaultValue={currentTopic?.conceptSummary ?? ""} id={`topic-concept-${mode}`} name="conceptSummary" />
                  <RequestFieldError fieldErrors={fieldErrors} name="conceptSummary" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`topic-notes-${mode}`}>
                    Notes
                  </label>
                  <Textarea defaultValue={currentTopic?.notes ?? ""} id={`topic-notes-${mode}`} name="notes" />
                  <RequestFieldError fieldErrors={fieldErrors} name="notes" />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-difficulty-${mode}`}>
                      Difficulty progression
                    </label>
                    <Textarea
                      defaultValue={(currentTopic?.difficultyProgression ?? []).join("\n")}
                      id={`topic-difficulty-${mode}`}
                      name="difficultyProgression"
                      placeholder="One step per line"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="difficultyProgression" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`topic-revision-${mode}`}>
                      Revision checklist
                    </label>
                    <Textarea
                      defaultValue={(currentTopic?.revisionChecklist ?? []).join("\n")}
                      id={`topic-revision-${mode}`}
                      name="revisionChecklist"
                      placeholder="One checklist item per line"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="revisionChecklist" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`topic-quiz-${mode}`}>
                    Quiz JSON
                  </label>
                  <Textarea
                    defaultValue={quizJson}
                    id={`topic-quiz-${mode}`}
                    name="quiz"
                    placeholder='[{"question":"...","answer":"..."}]'
                  />
                  <RequestFieldError fieldErrors={fieldErrors} name="quiz" />
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
