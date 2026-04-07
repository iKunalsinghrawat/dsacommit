"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createCommentAction,
  deleteCommunityPostAction,
  togglePostLikeAction,
  updateCommunityPostAction,
} from "@/lib/actions/platform-actions";
import { CommunityPostType, Role } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative, getInitials } from "@/lib/utils";

type CommunityPostCardProps = {
  post: {
    id: string;
    authorId: string;
    type: CommunityPostType;
    title: string;
    content: string;
    likeCount: number;
    commentCount: number;
    isReported: boolean;
    createdAt: Date | string;
    author: { name: string; slug: string };
    topic: { id: string; name: string } | null;
    company: { id: string; name: string } | null;
    comments: Array<{
      id: string;
      content: string;
      author: { name: string; slug: string };
    }>;
  };
  viewer: {
    id: string;
    role: Role;
  };
  topics: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
  commentPlaceholder: string;
};

export function CommunityPostCard({
  post,
  viewer,
  topics,
  companies,
  commentPlaceholder,
}: CommunityPostCardProps) {
  const router = useRouter();
  const [localOverride, setLocalOverride] = useState<
    Partial<CommunityPostCardProps["post"]> & {
      topic?: CommunityPostCardProps["post"]["topic"];
      company?: CommunityPostCardProps["post"]["company"];
    }
  >({});
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [type, setType] = useState(post.type);
  const [topicId, setTopicId] = useState(post.topic?.id ?? "");
  const [companyId, setCompanyId] = useState(post.company?.id ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isMutating, startTransition] = useTransition();

  const selectedTopic = useMemo(
    () => topics.find((item) => item.id === topicId) ?? null,
    [topicId, topics],
  );
  const selectedCompany = useMemo(
    () => companies.find((item) => item.id === companyId) ?? null,
    [companies, companyId],
  );
  const displayPost = useMemo(
    () => ({
      ...post,
      ...localOverride,
      topic: localOverride.topic ?? post.topic,
      company: localOverride.company ?? post.company,
    }),
    [localOverride, post],
  );
  const canEdit = viewer.id === displayPost.authorId;
  const canDelete = canEdit || viewer.role === Role.ADMIN;

  function resetEditState() {
    setTitle(displayPost.title);
    setContent(displayPost.content);
    setType(displayPost.type);
    setTopicId(displayPost.topic?.id ?? "");
    setCompanyId(displayPost.company?.id ?? "");
    setActionError(null);
  }

  function handleCancel() {
    resetEditState();
    setIsEditing(false);
  }

  function handleSave() {
    setActionError(null);

    const formData = new FormData();
    formData.set("postId", displayPost.id);
    formData.set("type", type);
    formData.set("title", title);
    formData.set("content", content);

    if (topicId) {
      formData.set("topicId", topicId);
    }

    if (companyId) {
      formData.set("companyId", companyId);
    }

    startTransition(async () => {
      const result = await updateCommunityPostAction(formData);

      if (!result.ok) {
        setActionError(result.error ?? "Unable to update the post.");
        toast.error(result.error ?? "Unable to update the post.");
        return;
      }

      setLocalOverride((current) => ({
        ...current,
        type,
        title,
        content,
        topic: selectedTopic,
        company: selectedCompany,
      }));
      setIsEditing(false);
      setActionError(null);
      toast.success(result.message ?? "Post updated.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this post permanently? This action cannot be undone.")) {
      return;
    }

    setActionError(null);

    const formData = new FormData();
    formData.set("postId", displayPost.id);

    startTransition(async () => {
      const result = await deleteCommunityPostAction(formData);

      if (!result.ok) {
        setActionError(result.error ?? "Unable to delete the post.");
        toast.error(result.error ?? "Unable to delete the post.");
        return;
      }

      setIsDeleted(true);
      toast.success(result.message ?? "Post deleted.");
      router.refresh();
    });
  }

  if (isDeleted) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 font-semibold text-primary">
              {getInitials(displayPost.author.name)}
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{displayPost.title}</CardTitle>
                <Badge variant="outline">{displayPost.type}</Badge>
                {displayPost.isReported ? <Badge variant="secondary">Reported</Badge> : null}
              </div>
              <CardDescription>
                <Link className="font-medium text-foreground hover:text-primary" href={`/profile/${displayPost.author.slug}`}>{displayPost.author.name}</Link>{" "}| {formatRelative(displayPost.createdAt)}
              </CardDescription>
            </div>
          </div>

          {(canEdit || canDelete) && !isEditing ? (
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              {canEdit ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    resetEditState();
                    setIsEditing(true);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : null}
              {canDelete ? (
                <Button className="w-full sm:w-auto" disabled={isMutating} onClick={handleDelete} size="sm" type="button" variant="ghost">
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4 rounded-[24px] border border-border bg-background/50 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor={`type-${displayPost.id}`}>
                  Post type
                </label>
                <Select
                  id={`type-${displayPost.id}`}
                  onChange={(event) => setType(event.target.value as CommunityPostType)}
                  value={type}
                >
                  <option value={CommunityPostType.DISCUSSION}>Discussion</option>
                  <option value={CommunityPostType.DOUBT}>Doubt</option>
                  <option value={CommunityPostType.COMPANY_PREP}>Company prep</option>
                  <option value={CommunityPostType.UPDATE}>Update</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor={`topic-${displayPost.id}`}>
                  Topic
                </label>
                <Select
                  id={`topic-${displayPost.id}`}
                  onChange={(event) => setTopicId(event.target.value)}
                  value={topicId}
                >
                  <option value="">General</option>
                  {topics.map((topicOption) => (
                    <option key={topicOption.id} value={topicOption.id}>
                      {topicOption.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor={`company-${displayPost.id}`}>
                  Company
                </label>
                <Select
                  id={`company-${displayPost.id}`}
                  onChange={(event) => setCompanyId(event.target.value)}
                  value={companyId}
                >
                  <option value="">General</option>
                  {companies.map((companyOption) => (
                    <option key={companyOption.id} value={companyOption.id}>
                      {companyOption.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`title-${displayPost.id}`}>
                Title
              </label>
              <Input
                id={`title-${displayPost.id}`}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`content-${displayPost.id}`}>
                Content
              </label>
              <Textarea
                id={`content-${displayPost.id}`}
                onChange={(event) => setContent(event.target.value)}
                value={content}
              />
            </div>
            {actionError ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {actionError}
              </div>
            ) : null}
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Button className="w-full sm:w-auto" disabled={isMutating} onClick={handleSave} type="button">
                {isMutating ? "Saving..." : "Save changes"}
              </Button>
              <Button className="w-full sm:w-auto" disabled={isMutating} onClick={handleCancel} type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {displayPost.topic ? <Badge>{displayPost.topic.name}</Badge> : null}
              {displayPost.company ? <Badge variant="secondary">{displayPost.company.name}</Badge> : null}
            </div>
            <p className="text-sm leading-8 text-muted">{displayPost.content}</p>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <form action={togglePostLikeAction}>
            <input name="postId" type="hidden" value={displayPost.id} />
            <button className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium" type="submit">
              Like ({displayPost.likeCount})
            </button>
          </form>
          <span className="text-sm text-muted">{displayPost.commentCount} comments</span>
        </div>

        <div className="space-y-3">
          {displayPost.comments.map((comment) => (
            <div className="rounded-2xl border border-border bg-background/50 px-4 py-3" key={comment.id}>
              <Link className="text-sm font-medium hover:text-primary" href={`/profile/${comment.author.slug}`}>{comment.author.name}</Link>
              <p className="mt-2 text-sm leading-7 text-muted">{comment.content}</p>
            </div>
          ))}
        </div>

        <form action={createCommentAction} className="space-y-3">
          <input name="postId" type="hidden" value={displayPost.id} />
          <Textarea name="content" placeholder={commentPlaceholder} />
          <SubmitButton pendingLabel="Replying..." variant="secondary">
            Add comment
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

