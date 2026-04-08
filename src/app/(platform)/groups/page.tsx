import Link from "next/link";

import { GroupJoinPolicy, GroupPrivacy, Role, UserPortal } from "@/generated/prisma/enums";
import { JoinGroupButton, LeaveGroupButton } from "@/components/communication/communication-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/utils";
import { getGroupsPageData } from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requirePortalAccess(UserPortal.GROUPS);
  const user = await requireUser();
  const data = await getGroupsPageData(user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Groups"
        title="Create small rooms where discipline becomes visible."
        description="Use public groups for open study energy, private groups for tighter prep circles, and approval-based rooms when accountability matters."
        actions={
          user.role === Role.STUDENT || user.role === Role.ADMIN ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-14px_rgba(15,118,110,0.8)] transition hover:-translate-y-0.5 hover:opacity-95"
              href="/groups/create"
            >
              Create group
            </Link>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>Your groups</CardTitle>
            <CardDescription>
              Rooms you already belong to, ordered by the latest activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.myMemberships.length ? (
              data.myMemberships.map((membership) => (
                <div
                  className="rounded-[24px] border border-border bg-background/50 p-4"
                  key={membership.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="text-lg font-semibold hover:text-primary"
                          href={`/groups/${membership.group.slug}`}
                        >
                          {membership.group.name}
                        </Link>
                        <Badge variant="secondary">{membership.role.toLowerCase()}</Badge>
                        <Badge variant="outline">
                          {membership.group.privacy === GroupPrivacy.PRIVATE ? "private" : "public"}
                        </Badge>
                        <Badge variant="outline">
                          {membership.group.joinPolicy === GroupJoinPolicy.APPROVAL
                            ? "approval"
                            : "open"}
                        </Badge>
                      </div>
                      <p className="text-sm leading-7 text-muted">
                        {membership.group.description}
                      </p>
                      <p className="text-xs text-muted">
                        {membership.group.members.length} members • last activity{" "}
                        {membership.group.conversation?.lastMessageAt
                          ? formatRelative(membership.group.conversation.lastMessageAt)
                          : "not started yet"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-card"
                        href={`/groups/${membership.group.slug}`}
                      >
                        Open group
                      </Link>
                      <LeaveGroupButton groupId={membership.groupId} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-5 text-sm leading-7 text-muted">
                You are not part of any groups yet. Create one for your current roadmap checkpoint or join a public room that already has momentum.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discover groups</CardTitle>
              <CardDescription>
                Join open rooms instantly or send a request to privacy-first groups.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.discoverableGroups.length ? (
                data.discoverableGroups.map((group) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={group.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="font-semibold hover:text-primary"
                        href={`/groups/${group.slug}`}
                      >
                        {group.name}
                      </Link>
                      <Badge variant="outline">{group.privacy.toLowerCase()}</Badge>
                      <Badge variant="outline">
                        {group.joinPolicy === GroupJoinPolicy.APPROVAL
                          ? "approval"
                          : "open"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">{group.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      {group.members.length} members • created by {group.createdBy.name}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <JoinGroupButton groupId={group.id} size="sm" />
                      {group.joinRequests[0]?.status === "PENDING" ? (
                        <Badge variant="secondary">Request pending</Badge>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  Nothing new to discover right now. That usually means you are already in the most relevant rooms or need to create your own.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending join requests</CardTitle>
              <CardDescription>
                Requests you already sent and are waiting on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.pendingRequests.length ? (
                data.pendingRequests.map((request) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={request.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{request.group.name}</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      Requested {formatRelative(request.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  No pending approvals right now.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
