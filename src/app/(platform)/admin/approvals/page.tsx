import Link from "next/link";

import { AdminChangeRequestReviewCard } from "@/components/approvals/admin-change-request-review-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  ChangeRequestEntityType,
  ChangeRequestStatus,
  Role,
  UserPortal,
} from "@/generated/prisma/enums";
import { requireRoleAndPortal } from "@/lib/auth";
import { getAdminChangeRequests } from "@/server/content-change-requests";

export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRoleAndPortal([Role.ADMIN], UserPortal.ADMIN_PORTAL);

  const rawSearchParams = await searchParams;
  const entityType =
    typeof rawSearchParams.entityType === "string" ? rawSearchParams.entityType : "ALL";
  const status = typeof rawSearchParams.status === "string" ? rawSearchParams.status : "PENDING";

  const approvals = await getAdminChangeRequests({
    entityType: entityType as ChangeRequestEntityType | "ALL",
    status: status as ChangeRequestStatus | "ALL",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin approvals"
        title="Review roadmap, topic, and problem changes before they go live."
        description="Live content stays untouched until an admin approves the request. Use this queue to compare the current version against the proposed version, then publish or reject it safely."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin">Back to admin</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Pending reviews</CardDescription>
            <CardTitle>{approvals.pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Visible in this view</CardDescription>
            <CardTitle>{approvals.requests.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Current filters</CardDescription>
            <CardTitle className="flex flex-wrap gap-2 text-base">
              <Badge variant="secondary">{approvals.filters.entityType}</Badge>
              <Badge variant="outline">{approvals.filters.status}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter requests</CardTitle>
          <CardDescription>Review only the entities or statuses you want to focus on right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="entityType">
                Entity type
              </label>
              <Select defaultValue={approvals.filters.entityType} id="entityType" name="entityType">
                <option value="ALL">All entities</option>
                {Object.values(ChangeRequestEntityType).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <Select defaultValue={approvals.filters.status} id="status" name="status">
                <option value="ALL">All statuses</option>
                {Object.values(ChangeRequestStatus).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <Button className="self-end" type="submit">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {approvals.requests.length === 0 ? (
          <Card className="glass-panel-strong">
            <CardHeader>
              <CardTitle>No matching change requests</CardTitle>
              <CardDescription>
                Nothing is waiting for this filter set right now. Switch the status filter to `ALL` to browse the approval history.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {approvals.requests.map((request) => (
          <AdminChangeRequestReviewCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}
