"use client";

import { FilePlus2, Loader2, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { RequestFieldError } from "@/components/approvals/request-field-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitRoadmapItemChangeRequestAction } from "@/lib/actions/content-approval-actions";
import { ChangeRequestOperationType, RoadmapLevel } from "@/generated/prisma/enums";

type TopicOption = {
  id: string;
  name: string;
};

type RoadmapItemRecord = {
  id: string;
  title: string;
  slug: string;
  level: RoadmapLevel;
  summary: string;
  details: string;
  sortOrder: number;
  topicId: string | null;
};

export function RoadmapRequestSection({
  availableModes,
  currentItem,
  topics,
}: {
  availableModes: ChangeRequestOperationType[];
  currentItem?: RoadmapItemRecord | null;
  topics: TopicOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [mode, setMode] = useState<ChangeRequestOperationType | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const result = await submitRoadmapItemChangeRequestAction(payload);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setPanelError(result.error ?? "Unable to submit this roadmap request.");
        toast.error(result.error ?? "Unable to submit this roadmap request.");
        return;
      }

      toast.success(result.message ?? "Your roadmap request is now pending admin approval.");
      setMode(null);
      formRef.current?.reset();
      router.refresh();
    });
  }

  const summaryDefault =
    mode === ChangeRequestOperationType.UPDATE && currentItem
      ? `Update roadmap item: ${currentItem.title}`
      : mode === ChangeRequestOperationType.DELETE && currentItem
        ? `Remove roadmap item: ${currentItem.title}`
        : "Create roadmap item request";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap approval workflow</CardTitle>
        <CardDescription>
          Suggest additions or refinements to the roadmap. Admin review is required before anything publishes.
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
          {availableModes.includes(ChangeRequestOperationType.UPDATE) && currentItem ? (
            <Button
              onClick={() => setMode(ChangeRequestOperationType.UPDATE)}
              type="button"
              variant={mode === ChangeRequestOperationType.UPDATE ? "default" : "secondary"}
            >
              <PencilLine className="size-4" />
              Request edit
            </Button>
          ) : null}
          {availableModes.includes(ChangeRequestOperationType.DELETE) && currentItem ? (
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
            {currentItem ? <input name="entityId" type="hidden" value={currentItem.id} /> : null}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`roadmap-summary-${mode}`}>
                Request summary
              </label>
              <Input defaultValue={summaryDefault} id={`roadmap-summary-${mode}`} name="summary" />
              <RequestFieldError fieldErrors={fieldErrors} name="summary" />
            </div>

            {mode === ChangeRequestOperationType.DELETE ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="roadmap-delete-reason">
                  Why should this roadmap item be removed?
                </label>
                <Textarea
                  defaultValue=""
                  id="roadmap-delete-reason"
                  name="deletionReason"
                  placeholder="Explain why this roadmap item should be archived or replaced."
                />
                <RequestFieldError fieldErrors={fieldErrors} name="deletionReason" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`roadmap-title-${mode}`}>
                      Item title
                    </label>
                    <Input defaultValue={currentItem?.title ?? ""} id={`roadmap-title-${mode}`} name="title" />
                    <RequestFieldError fieldErrors={fieldErrors} name="title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`roadmap-slug-${mode}`}>
                      Slug
                    </label>
                    <Input defaultValue={currentItem?.slug ?? ""} id={`roadmap-slug-${mode}`} name="slug" />
                    <RequestFieldError fieldErrors={fieldErrors} name="slug" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`roadmap-level-${mode}`}>
                      Stage
                    </label>
                    <Select defaultValue={currentItem?.level ?? RoadmapLevel.BEGINNER} id={`roadmap-level-${mode}`} name="level">
                      {Object.values(RoadmapLevel).map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </Select>
                    <RequestFieldError fieldErrors={fieldErrors} name="level" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`roadmap-sort-${mode}`}>
                      Sort order
                    </label>
                    <Input
                      defaultValue={String(currentItem?.sortOrder ?? 1)}
                      id={`roadmap-sort-${mode}`}
                      min={1}
                      name="sortOrder"
                      type="number"
                    />
                    <RequestFieldError fieldErrors={fieldErrors} name="sortOrder" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`roadmap-topic-${mode}`}>
                    Linked topic
                  </label>
                  <Select defaultValue={currentItem?.topicId ?? ""} id={`roadmap-topic-${mode}`} name="topicId">
                    <option value="">No linked topic</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </Select>
                  <RequestFieldError fieldErrors={fieldErrors} name="topicId" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`roadmap-item-summary-${mode}`}>
                    Summary
                  </label>
                  <Textarea defaultValue={currentItem?.summary ?? ""} id={`roadmap-item-summary-${mode}`} name="itemSummary" />
                  <RequestFieldError fieldErrors={fieldErrors} name="summary" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor={`roadmap-details-${mode}`}>
                    Details
                  </label>
                  <Textarea defaultValue={currentItem?.details ?? ""} id={`roadmap-details-${mode}`} name="details" />
                  <RequestFieldError fieldErrors={fieldErrors} name="details" />
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
