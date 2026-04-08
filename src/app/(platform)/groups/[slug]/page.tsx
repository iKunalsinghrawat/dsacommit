import { notFound } from "next/navigation";

import { GroupJoinPolicy, GroupPrivacy, UserPortal } from "@/generated/prisma/enums";
import {
  JoinGroupButton,
  LeaveGroupButton,
  MessageComposer,
  RemoveGroupMemberButton,
  ReviewGroupJoinButtons,
} from "@/components/communication/communication-controls";
import { GroupEditorForm } from "@/components/communication/group-editor-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { formatDate, formatRelative } from "@/lib/utils";
import { getGroupPageData } from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePortalAccess(UserPortal.GROUPS);
  const user = await requireUser();
  const { slug } = await params;
  const data = await getGroupPageData(user.id, slug);

  if (!data) {
    notFound();
  }

  const canJoin = !data.membership && !data.pendingJoinRequest;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Study group"
        title={data.group.name}
        description={data.group.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {data.group.privacy === GroupPrivacy.PRIVATE ? "private" : "public"}
            </Badge>
            <Badge variant="outline">
              {data.group.joinPolicy === GroupJoinPolicy.APPROVAL ? "approval" : "open"}
            </Badge>
            {data.membership ? (
              <LeaveGroupButton groupId={data.group.id} />
            ) : canJoin ? (
              <JoinGroupButton groupId={data.group.id} />
            ) : data.pendingJoinRequest ? (
              <Badge variant="secondary">Request pending</Badge>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {data.canManage && data.membership ? (
            <GroupEditorForm
              initialGroup={{
                id: data.group.id,
                slug: data.group.slug,
                name: data.group.name,
                description: data.group.description,
                imageUrl: data.group.imageUrl,
                category: data.group.category,
                privacy: data.group.privacy,
                joinPolicy: data.group.joinPolicy,
              }}
              mode="update"
            />
          ) : (
            <Card className="glass-panel-strong">
              <CardHeader>
                <CardTitle>Group overview</CardTitle>
                <CardDescription>
                  Created by {data.group.createdBy.name} • {data.group.members.length} members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.group.category ? (
                  <Badge variant="secondary">{data.group.category}</Badge>
                ) : null}
                <p className="text-sm leading-7 text-muted">{data.group.description}</p>
                <p className="text-xs text-muted">
                  Created {formatDate(data.group.createdAt, "dd MMM yyyy")}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Group chat</CardTitle>
              <CardDescription>
                {data.membership
                  ? "Members can discuss progress, ask doubts, and keep each other honest here."
                  : "Join the group to unlock the shared chat history and new messages."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.membership ? (
                <>
                  {data.messages.length ? (
                    data.messages.map((message) => (
                      <div
                        className="rounded-[24px] border border-border bg-background/50 p-4"
                        key={message.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{message.sender.name}</p>
                            {message.senderId === user.id ? (
                              <Badge variant="secondary">You</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted">
                            {formatDate(message.createdAt, "dd MMM, hh:mm a")}
                          </p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                          {message.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                      No messages yet. Set the tone with a clear study goal or the next checkpoint.
                    </div>
                  )}
                  {data.group.conversation ? (
                    <MessageComposer conversationId={data.group.conversation.id} />
                  ) : null}
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  This chat is visible only to members. Join first and the conversation thread will open here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Ownership and admin roles can manage join approvals and remove members if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.group.members.map((member) => (
                <div
                  className="rounded-[24px] border border-border bg-background/50 p-4"
                  key={member.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{member.user.name}</p>
                        <Badge variant="outline">{member.role.toLowerCase()}</Badge>
                        {member.userId === user.id ? (
                          <Badge variant="secondary">You</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {member.user.headline ?? "Active group member"}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        Joined {formatRelative(member.joinedAt)}
                      </p>
                    </div>
                    {data.canManage && member.userId !== user.id ? (
                      <RemoveGroupMemberButton
                        groupId={data.group.id}
                        memberId={member.userId}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join requests</CardTitle>
              <CardDescription>
                Pending requests only appear to current group managers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.canManage && data.group.joinRequests.length ? (
                data.group.joinRequests.map((request) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={request.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.requester.name}</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {request.message ?? "No message was added to this request."}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Sent {formatRelative(request.createdAt)}
                    </p>
                    <div className="mt-4">
                      <ReviewGroupJoinButtons requestId={request.id} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  {data.canManage
                    ? "No pending join requests right now."
                    : "Approval controls stay visible only to group owners and admins."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
