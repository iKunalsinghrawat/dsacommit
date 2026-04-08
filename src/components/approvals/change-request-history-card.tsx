import { ChangeRequestStatus, type ChangeRequestEntityType } from "@/generated/prisma/enums";

import { ChangeRequestStatusBadge } from "@/components/approvals/change-request-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type HistoryRequest = {
  id: string;
  summary: string;
  status: ChangeRequestStatus;
  entityType: ChangeRequestEntityType;
  operationType: string;
  rejectionReason: string | null;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  reviewedBy: {
    id: string;
    name: string;
  } | null;
};

export function ChangeRequestHistoryCard({
  description,
  emptyLabel = "No change requests have been submitted from this page yet.",
  requests,
  title = "Your change requests",
}: {
  description?: string;
  emptyLabel?: string;
  requests: HistoryRequest[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background/50 px-4 py-5 text-sm text-muted">
            {emptyLabel}
          </div>
        ) : null}

        {requests.map((request) => (
          <div className="rounded-[24px] border border-border bg-background/50 p-4" key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="font-medium">{request.summary}</p>
                <p className="text-sm text-muted">
                  {request.entityType} · {request.operationType} · Requested {formatDate(request.createdAt, "dd MMM, hh:mm a")}
                </p>
              </div>
              <ChangeRequestStatusBadge status={request.status} />
            </div>

            {request.reviewedAt && request.reviewedBy ? (
              <p className="mt-3 text-sm text-muted">
                Reviewed by {request.reviewedBy.name} on {formatDate(request.reviewedAt, "dd MMM, hh:mm a")}
              </p>
            ) : null}

            {request.rejectionReason ? (
              <div className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
                Rejection reason: {request.rejectionReason}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
