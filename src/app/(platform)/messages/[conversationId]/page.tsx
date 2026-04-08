import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CallSessionStatus,
  ConversationType,
  UserPortal,
} from "@/generated/prisma/enums";
import {
  CallControls,
  MessageComposer,
} from "@/components/communication/communication-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { formatDate, formatRelative } from "@/lib/utils";
import { getConversationPageData } from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  await requirePortalAccess(UserPortal.MESSAGES);
  const user = await requireUser();
  const { conversationId } = await params;
  const data = await getConversationPageData(user.id, conversationId);

  if (!data) {
    notFound();
  }

  const title =
    data.conversation.type === ConversationType.GROUP
      ? data.conversation.group?.name ?? "Study group"
      : data.otherParticipants.map((participant) => participant.user.name).join(", ");
  const subtitle =
    data.conversation.type === ConversationType.GROUP
      ? data.conversation.group?.description ??
        "Shared preparation room with group-level accountability."
      : data.otherParticipants[0]?.user.headline ??
        "Keep the conversation useful, specific, and action-oriented.";
  const activeCall =
    data.recentCalls.find(
      (call) =>
        call.status === CallSessionStatus.RINGING ||
        call.status === CallSessionStatus.ACTIVE,
    ) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={data.conversation.type === ConversationType.GROUP ? "Group chat" : "Direct message"}
        title={title}
        description={subtitle}
        actions={
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-card"
            href="/messages"
          >
            Back to inbox
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="glass-panel-strong">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Conversation thread</CardTitle>
                <Badge variant="outline">
                  {data.conversation.type === ConversationType.GROUP
                    ? "Members chat"
                    : "1:1 thread"}
                </Badge>
              </div>
              <CardDescription>
                {data.messages.length
                  ? "Recent messages, delivery state, and next action in one place."
                  : "No messages yet. Use the composer below to break the silence with something specific."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.messages.length ? (
                data.messages.map((message) => {
                  const isOwn = message.senderId === user.id;
                  const seenByOthers = message.readStates.some(
                    (state) => state.userId !== user.id && state.readAt,
                  );

                  return (
                    <div
                      className={`rounded-[24px] border p-4 ${
                        isOwn
                          ? "border-primary/20 bg-primary/5"
                          : "border-border bg-background/50"
                      }`}
                      key={message.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{message.sender.name}</p>
                          {isOwn ? <Badge variant="secondary">You</Badge> : null}
                        </div>
                        <div className="text-right text-xs text-muted">
                          <p>{formatDate(message.createdAt, "dd MMM, hh:mm a")}</p>
                          {isOwn ? (
                            <p>{seenByOthers ? "Seen" : "Delivered"}</p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                        {message.content}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-5 text-sm leading-7 text-muted">
                  Start with the real blocker, the exact question, or the next checkpoint. Good threads stay useful because they stay concrete.
                </div>
              )}

              <MessageComposer
                conversationId={data.conversation.id}
                disabledReason={data.messageDisabledReason}
              />
            </CardContent>
          </Card>

          {data.conversation.type === ConversationType.GROUP ? null : (
            <CallControls
              activeCall={activeCall}
              conversationId={data.conversation.id}
              currentUserId={user.id}
              disabledReason={data.messageDisabledReason}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {data.conversation.type === ConversationType.GROUP
                  ? "Participants"
                  : "People in this thread"}
              </CardTitle>
              <CardDescription>
                {data.conversation.type === ConversationType.GROUP
                  ? "Only active members can access this chat."
                  : "Direct communication stays blocked if the relationship or block status changes."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.conversation.participants.map((participant) => (
                <div
                  className="rounded-[24px] border border-border bg-background/50 p-4"
                  key={participant.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{participant.user.name}</p>
                    {participant.userId === user.id ? (
                      <Badge variant="secondary">You</Badge>
                    ) : null}
                    <Badge variant="outline">{participant.user.role.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {participant.user.headline ?? "Active on the platform"}
                  </p>
                  {participant.lastReadAt ? (
                    <p className="mt-2 text-xs text-muted">
                      Last read {formatRelative(participant.lastReadAt)}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call activity</CardTitle>
              <CardDescription>
                Audio and video actions stay visible here so missed calls do not disappear into guesswork.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentCalls.length ? (
                data.recentCalls.map((call) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={call.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {call.callType === "VIDEO" ? "Video call" : "Audio call"}
                      </p>
                      <Badge
                        variant={
                          call.status === CallSessionStatus.ACTIVE
                            ? "success"
                            : call.status === CallSessionStatus.RINGING
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {call.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      Started {formatRelative(call.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  No recent call activity yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
