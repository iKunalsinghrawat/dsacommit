import Link from "next/link";

import { ConversationType, Role, UserPortal } from "@/generated/prisma/enums";
import {
  NotificationReadButton,
  StartConversationButton,
} from "@/components/communication/communication-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/utils";
import { getMessagesPageData } from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requirePortalAccess(UserPortal.MESSAGES);
  const user = await requireUser();
  const data = await getMessagesPageData(user.id, user.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Messages"
        title="Direct support, disciplined follow-ups, and focused group chat."
        description="Use direct chat for real blockers, group rooms for shared momentum, and the notification feed to keep approvals, calls, and replies visible."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              {data.conversations.length
                ? "Open any thread to continue the latest discussion or answer an incoming call."
                : "Your inbox is empty right now. Start with a mentor or an approved student connection."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.conversations.length ? (
              data.conversations.map((conversation) => (
                <Link
                  className="block h-full"
                  href={`/messages/${conversation.id}`}
                  key={conversation.id}
                >
                  <div className="h-full rounded-[24px] border border-border bg-background/50 p-4 transition hover:border-primary/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold">{conversation.title}</p>
                          <Badge
                            variant={
                              conversation.type === ConversationType.GROUP
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {conversation.type === ConversationType.GROUP
                              ? "Group chat"
                              : "Direct message"}
                          </Badge>
                          {conversation.unreadCount ? (
                            <Badge variant="success">{conversation.unreadCount} unread</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {conversation.latestMessage?.content ??
                            "No message yet. Open the thread to start the conversation."}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted">
                        <p>
                          {conversation.latestMessage?.createdAt
                            ? formatRelative(conversation.latestMessage.createdAt)
                            : "Waiting to start"}
                        </p>
                        {conversation.activeCall ? (
                          <Badge
                            className="mt-2"
                            variant={
                              conversation.activeCall.status === "ACTIVE"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {conversation.activeCall.callType.toLowerCase()} call{" "}
                            {conversation.activeCall.status.toLowerCase()}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-6 text-sm leading-7 text-muted">
                No active conversations yet. Students can start with connected peers or mentors. Mentors can continue any conversation started by students.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick start</CardTitle>
              <CardDescription>
                {user.role === Role.STUDENT
                  ? "Reach out to your mentors or approved student connections."
                  : "Continue helping students inside active message threads."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.quickStartUsers.length ? (
                data.quickStartUsers.map((quickUser) => (
                  <div
                    className="flex flex-col gap-3 rounded-[24px] border border-border bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={quickUser.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{quickUser.name}</p>
                        <Badge variant="outline">{quickUser.role.toLowerCase()}</Badge>
                        {quickUser.isVerified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {quickUser.headline ?? "Focused, reply-ready account"}
                      </p>
                    </div>
                    <StartConversationButton
                      size="sm"
                      targetUserId={quickUser.id}
                      variant="secondary"
                    >
                      Start chat
                    </StartConversationButton>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  No quick-start accounts yet. Accept a connection request or ask a mentor question first, then your conversation shortcuts will show up here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                {data.unreadNotificationCount
                  ? `${data.unreadNotificationCount} unread updates need your attention.`
                  : "You're fully caught up right now."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.notifications.length ? (
                data.notifications.map((notification) => (
                  <div
                    className="rounded-[24px] border border-border bg-background/50 p-4"
                    key={notification.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{notification.title}</p>
                          {!notification.isRead ? (
                            <Badge variant="success">New</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {notification.body}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {formatRelative(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {notification.actionUrl ? (
                          <Link
                            className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold text-foreground transition hover:bg-card"
                            href={notification.actionUrl}
                          >
                            Open
                          </Link>
                        ) : null}
                        {!notification.isRead ? (
                          <NotificationReadButton notificationId={notification.id} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-background/40 p-4 text-sm leading-7 text-muted">
                  No notifications yet. New messages, connection responses, join approvals, and incoming calls will show up here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
