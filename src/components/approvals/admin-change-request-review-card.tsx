"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ChangeRequestStatusBadge } from "@/components/approvals/change-request-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  ChangeRequestStatus,
  Role,
} from "@/generated/prisma/enums";
import { reviewChangeRequestAction } from "@/lib/actions/content-approval-actions";
import { formatDate } from "@/lib/utils";

type ReviewCardProps = {
  request: {
    id: string;
    entityId: string | null;
    entityType: ChangeRequestEntityType;
    operationType: ChangeRequestOperationType;
    status: ChangeRequestStatus;
    summary: string;
    requestedData: unknown;
    currentData: unknown;
    rejectionReason: string | null;
    createdAt: Date | string;
    reviewedAt: Date | string | null;
    requestedBy: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
    reviewedBy: {
      id: string;
      name: string;
      email: string;
    } | null;
    reviews: Array<{
      id: string;
      status: ChangeRequestStatus;
      note: string | null;
      createdAt: Date | string;
      reviewer: {
        id: string;
        name: string;
      };
    }>;
    liveData: unknown;
  };
};

function prettyJson(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ComparisonPanel({
  title,
  description,
  value,
  emptyLabel,
}: {
  title: string;
  description: string;
  value: unknown;
  emptyLabel: string;
}) {
  const content = useMemo(() => prettyJson(value), [value]);

  return (
    <div className="rounded-[24px] border border-border bg-background/50 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">{description}</p>
      {content ? (
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card p-4 text-xs leading-6 text-muted">
          {content}
        </pre>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/40 px-4 py-6 text-sm text-muted">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export function AdminChangeRequestReviewCard({
  request,
  canReview = false,
}: ReviewCardProps & { canReview?: boolean }) {
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState(request.rejectionReason ?? "");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [isPending, startTransition] = useTransition();
  const isPendingRequest = String(request.status) === ChangeRequestStatus.PENDING;

  const proposedValue =
    request.operationType === ChangeRequestOperationType.DELETE
      ? {
          deletionReason:
            typeof request.requestedData === "object" &&
            request.requestedData !== null &&
            "deletionReason" in request.requestedData
              ? (request.requestedData as { deletionReason?: string | null }).deletionReason ?? null
              : null,
        }
      : request.requestedData;

  function handleReview(status: ChangeRequestStatus) {
    setPanelError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("requestId", request.id);
    formData.set("status", status);

    if (status === ChangeRequestStatus.REJECTED) {
      formData.set("rejectionReason", rejectionReason);
    }

    startTransition(async () => {
      const result = await reviewChangeRequestAction(formData);

      if (!result.ok) {
        setPanelError(result.error ?? "Unable to review this request right now.");
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Unable to review this request right now.");
        return;
      }

      toast.success(result.message ?? "Change request reviewed.");
      router.refresh();
    });
  }

  return (
    <Card className="glass-panel-strong">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{request.entityType}</Badge>
              <Badge variant="outline">{request.operationType}</Badge>
              <ChangeRequestStatusBadge status={request.status} />
            </div>
            <CardTitle>{request.summary}</CardTitle>
            <CardDescription>
              Requested by {request.requestedBy.name} ({request.requestedBy.role}) on{" "}
              {formatDate(request.createdAt, "dd MMM yyyy, hh:mm a")}
            </CardDescription>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
              <p>Requester: {request.requestedBy.email}</p>
              <p>Entity ID: {request.entityId ?? "Will be assigned on publish"}</p>
              {request.reviewedAt && request.reviewedBy ? (
                <p>
                  Reviewed by {request.reviewedBy.name} on{" "}
                  {formatDate(request.reviewedAt, "dd MMM yyyy, hh:mm a")}
                </p>
              ) : null}
            </div>

            {canReview && isPendingRequest ? (
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  disabled={isPending}
                  onClick={() => handleReview(ChangeRequestStatus.APPROVED)}
                  type="button"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Approve
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => handleReview(ChangeRequestStatus.REJECTED)}
                  type="button"
                  variant="danger"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Reject
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <ChangeRequestStatusBadge status={request.status} />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <ComparisonPanel
            description="What is currently live for students and other users."
            emptyLabel="No live record exists yet for this request."
            title="Current live version"
            value={request.liveData ?? request.currentData}
          />
          <ComparisonPanel
            description={
              request.operationType === ChangeRequestOperationType.DELETE
                ? "Remove request payload and deletion reason."
                : "What will publish if you approve this request."
            }
            emptyLabel="No proposed payload was attached to this request."
            title="Proposed version"
            value={proposedValue}
          />
        </div>

        {request.reviews.length ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Review history</p>
            {request.reviews.map((review) => (
              <div
                className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted"
                key={review.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{`${review.reviewer.name} | ${review.status}`}</span>
                  <span>{formatDate(review.createdAt, "dd MMM yyyy, hh:mm a")}</span>
                </div>
                {review.note ? <p className="mt-2">{review.note}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {canReview && isPendingRequest ? (
          <div className="space-y-4 rounded-[24px] border border-border bg-background/40 p-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`rejection-reason-${request.id}`}>
                Rejection reason
              </label>
              <Textarea
                id={`rejection-reason-${request.id}`}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Explain what needs to be changed before this can go live."
                value={rejectionReason}
              />
              {fieldErrors.rejectionReason?.[0] ? (
                <p className="text-sm text-danger">{fieldErrors.rejectionReason[0]}</p>
              ) : null}
            </div>

            {panelError ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {panelError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={isPending}
                onClick={() => handleReview(ChangeRequestStatus.APPROVED)}
                type="button"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Approve and publish
              </Button>
              <Button
                disabled={isPending}
                onClick={() => handleReview(ChangeRequestStatus.REJECTED)}
                type="button"
                variant="danger"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Reject request
              </Button>
            </div>
          </div>
        ) : null}

        {!isPendingRequest && request.rejectionReason ? (
          <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
            Final review note: {request.rejectionReason}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
