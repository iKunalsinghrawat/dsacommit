"use client";

import { Save, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { GroupJoinPolicy, GroupPrivacy } from "@/generated/prisma/enums";
import {
  createGroupAction,
  updateGroupAction,
} from "@/lib/actions/communication-actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function FieldError({
  fieldErrors,
  name,
}: {
  fieldErrors: Record<string, string[] | undefined>;
  name: string;
}) {
  const message = fieldErrors[name]?.[0];
  return message ? <p className="text-sm text-danger">{message}</p> : null;
}

export function GroupEditorForm({
  mode,
  initialGroup,
}: {
  mode: "create" | "update";
  initialGroup?: {
    id: string;
    slug: string;
    name: string;
    description: string;
    imageUrl: string | null;
    category: string | null;
    privacy: GroupPrivacy;
    joinPolicy: GroupJoinPolicy;
  };
}) {
  const router = useRouter();
  const [state, setState] = useState({
    name: initialGroup?.name ?? "",
    description: initialGroup?.description ?? "",
    imageUrl: initialGroup?.imageUrl ?? "",
    category: initialGroup?.category ?? "",
    privacy: initialGroup?.privacy ?? GroupPrivacy.PUBLIC,
    joinPolicy: initialGroup?.joinPolicy ?? GroupJoinPolicy.OPEN,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<Key extends keyof typeof state>(key: Key, value: (typeof state)[Key]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function buildFormData() {
    const formData = new FormData();
    if (initialGroup) {
      formData.set("groupId", initialGroup.id);
    }
    formData.set("name", state.name);
    formData.set("description", state.description);
    formData.set("imageUrl", state.imageUrl);
    formData.set("category", state.category);
    formData.set("privacy", state.privacy);
    formData.set("joinPolicy", state.joinPolicy);
    return formData;
  }

  return (
    <Card className={mode === "create" ? "glass-panel-strong" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" />
          {mode === "create" ? "Create a study group" : "Edit group details"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Build a focused study room around one topic, company track, or challenge sprint."
            : "Update the group identity, privacy, and join rules without losing the existing chat thread."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="group-name">
              Group name
            </label>
            <Input
              id="group-name"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Binary Search Sprint"
              value={state.name}
            />
            <FieldError fieldErrors={fieldErrors} name="name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="group-category">
              Category / topic
            </label>
            <Input
              id="group-category"
              onChange={(event) => updateField("category", event.target.value)}
              placeholder="Graphs, Google prep, revision..."
              value={state.category}
            />
            <FieldError fieldErrors={fieldErrors} name="category" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="group-image">
              Group image URL
            </label>
            <Input
              id="group-image"
              onChange={(event) => updateField("imageUrl", event.target.value)}
              placeholder="https://..."
              value={state.imageUrl}
            />
            <FieldError fieldErrors={fieldErrors} name="imageUrl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="group-privacy">
                Privacy
              </label>
              <Select
                id="group-privacy"
                onChange={(event) => updateField("privacy", event.target.value as GroupPrivacy)}
                value={state.privacy}
              >
                <option value={GroupPrivacy.PUBLIC}>Public</option>
                <option value={GroupPrivacy.PRIVATE}>Private</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="group-policy">
                Join policy
              </label>
              <Select
                disabled={state.privacy === GroupPrivacy.PRIVATE}
                id="group-policy"
                onChange={(event) =>
                  updateField("joinPolicy", event.target.value as GroupJoinPolicy)
                }
                value={
                  state.privacy === GroupPrivacy.PRIVATE
                    ? GroupJoinPolicy.APPROVAL
                    : state.joinPolicy
                }
              >
                <option value={GroupJoinPolicy.OPEN}>Open join</option>
                <option value={GroupJoinPolicy.APPROVAL}>Approval required</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="group-description">
            Description
          </label>
          <Textarea
            id="group-description"
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="What are you solving together, how often do you check in, and what kind of accountability does the group expect?"
            value={state.description}
          />
          <FieldError fieldErrors={fieldErrors} name="description" />
        </div>

        {formError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                setFieldErrors({});
                setFormError(null);

                const result =
                  mode === "create"
                    ? await createGroupAction(buildFormData())
                    : await updateGroupAction(buildFormData());

                if (!result.ok) {
                  setFieldErrors(result.fieldErrors ?? {});
                  setFormError(result.error ?? "Unable to save this group.");
                  toast.error(result.error ?? "Unable to save this group.");
                  return;
                }

                toast.success(result.message ?? "Group saved.");
                if (result.redirectTo) {
                  router.push(result.redirectTo);
                } else {
                  router.refresh();
                }
              });
            }}
            type="button"
          >
            <Save className="size-4" />
            {isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create group"
                : "Save group"}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
