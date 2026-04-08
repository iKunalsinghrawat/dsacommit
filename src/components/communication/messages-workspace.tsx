"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  MessageSquareDashed,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";

import {
  CallSessionStatus,
  CallType,
  ConversationType,
  Role,
} from "@/generated/prisma/enums";
import type {
  CommunicationRealtimeCall,
  CommunicationRealtimeEvent,
} from "@/lib/communication-realtime";
import { getPresenceLabel } from "@/lib/call-signaling";
import { cn, formatRelative } from "@/lib/utils";
import { useCommunicationRealtimeSubscription } from "@/components/communication/communication-realtime-provider";
import {
  CallControls,
  MessageComposer,
  NotificationReadButton,
  StartConversationButton,
} from "@/components/communication/communication-controls";
import type { CallSummary } from "@/components/communication/live-call-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserSummary = {
  id: string;
  name: string;
  slug?: string | null;
  role?: Role;
  headline?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  lastActiveAt?: Date | string | null;
};

type Participant = {
  id?: string;
  userId: string;
  lastReadAt?: Date | string | null;
  user: UserSummary;
};

type MessageReadState = {
  userId: string;
  readAt?: Date | string | null;
};

type MessageSummary = {
  id: string;
  conversationId?: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
  sender: UserSummary;
  readStates: MessageReadState[];
};

type SidebarConversation = {
  id: string;
  type: ConversationType;
  title: string;
  group?: {
    slug?: string | null;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
  } | null;
  participants: Participant[];
  unreadCount: number;
  lastReadAt?: Date | string | null;
  latestMessage?: MessageSummary | null;
  activeCall?: {
    id: string;
    callType: CallType;
    status: CallSessionStatus;
  } | null;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: Date | string;
};

type QuickStartUser = {
  id: string;
  name: string;
  slug?: string | null;
  role: Role;
  headline?: string | null;
  isVerified: boolean;
  lastActiveAt?: Date | string | null;
};

type SelectedConversationData = {
  conversation: {
    id: string;
    type: ConversationType;
    group?: {
      slug?: string | null;
      name: string;
      description?: string | null;
    } | null;
    participants: Participant[];
  };
  currentParticipant?: {
    userId: string;
    lastReadAt?: Date | string | null;
  } | null;
  otherParticipants: Participant[];
  messages: MessageSummary[];
  recentCalls: CallSummary[];
  canStartCall: boolean;
  messageDisabledReason?: string | null;
};

function getInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function upsertConversation(
  conversations: SidebarConversation[],
  conversationId: string,
  transform: (conversation: SidebarConversation) => SidebarConversation,
) {
  const index = conversations.findIndex((conversation) => conversation.id === conversationId);

  if (index === -1) {
    return conversations;
  }

  const nextConversation = transform(conversations[index]);
  const nextConversations = [...conversations];
  nextConversations.splice(index, 1);
  nextConversations.unshift(nextConversation);
  return nextConversations;
}

function upsertRecentCall(recentCalls: CallSummary[], nextCall: CommunicationRealtimeCall) {
  const castCall = nextCall as CallSummary;
  const existingIndex = recentCalls.findIndex((call) => call.id === castCall.id);

  if (existingIndex === -1) {
    return [castCall, ...recentCalls].slice(0, 6);
  }

  const nextCalls = [...recentCalls];
  nextCalls[existingIndex] = castCall;
  return nextCalls;
}

function getConversationLabel(
  conversation: SidebarConversation | SelectedConversationData["conversation"],
  currentUserId: string,
) {
  if (conversation.type === ConversationType.GROUP) {
    return conversation.group?.name ?? "Study group";
  }

  const otherParticipants = conversation.participants.filter(
    (participant) => participant.userId !== currentUserId,
  );

  return otherParticipants.map((participant) => participant.user.name).join(", ") || "Direct message";
}

function getConversationSubtitle(input: {
  conversation: SelectedConversationData["conversation"];
  otherParticipants: Participant[];
}) {
  if (input.conversation.type === ConversationType.GROUP) {
    return (
      input.conversation.group?.description ??
      `${input.conversation.participants.length} members preparing together`
    );
  }

  return getPresenceLabel(input.otherParticipants[0]?.user.lastActiveAt);
}

function getPreviewMessage(
  conversation: SidebarConversation,
  currentUserId: string,
) {
  if (!conversation.latestMessage) {
    return conversation.type === ConversationType.GROUP
      ? "No group messages yet."
      : "Say hello and start the conversation.";
  }

  if (conversation.latestMessage.senderId === currentUserId) {
    return `You: ${conversation.latestMessage.content}`;
  }

  return conversation.latestMessage.content;
}

function getConversationSearchText(conversation: SidebarConversation) {
  return [
    conversation.title,
    conversation.group?.name,
    conversation.group?.description,
    conversation.latestMessage?.content,
    ...conversation.participants.map((participant) => participant.user.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function MessagesWorkspace({
  currentUserId,
  currentUserRole,
  conversations: initialConversations,
  notifications: initialNotifications,
  quickStartUsers,
  unreadNotificationCount,
  selectedConversation: initialSelectedConversation = null,
}: {
  currentUserId: string;
  currentUserRole: Role;
  conversations: SidebarConversation[];
  notifications: NotificationItem[];
  quickStartUsers: QuickStartUser[];
  unreadNotificationCount: number;
  selectedConversation?: SelectedConversationData | null;
}) {
  const [conversationQuery, setConversationQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [conversations, setConversations] = useState(initialConversations);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedConversation, setSelectedConversation] =
    useState<SelectedConversationData | null>(initialSelectedConversation);

  const selectedConversationId = selectedConversation?.conversation.id ?? null;
  const selectedConversationPreview = useMemo(() => {
    if (!selectedConversation) {
      return null;
    }

    return (
      conversations.find((conversation) => conversation.id === selectedConversation.conversation.id) ??
      {
        id: selectedConversation.conversation.id,
        type: selectedConversation.conversation.type,
        title: getConversationLabel(selectedConversation.conversation, currentUserId),
        group: selectedConversation.conversation.group,
        participants: selectedConversation.conversation.participants,
        unreadCount: 0,
        latestMessage:
          selectedConversation.messages[selectedConversation.messages.length - 1] ?? null,
        activeCall:
          selectedConversation.recentCalls.find(
            (call) =>
              call.status === CallSessionStatus.RINGING ||
              call.status === CallSessionStatus.ACTIVE,
          ) ?? null,
      }
    );
  }, [conversations, currentUserId, selectedConversation]);

  useCommunicationRealtimeSubscription(
    useCallback(
      (event: CommunicationRealtimeEvent) => {
        if (event.type === "message:new" && event.payload?.message) {
          const message = event.payload.message;

          setConversations((current) =>
            upsertConversation(current, message.conversationId, (conversation) => ({
              ...conversation,
              unreadCount:
                message.conversationId === selectedConversationId ||
                message.senderId === currentUserId
                  ? 0
                  : conversation.unreadCount + 1,
              latestMessage: {
                id: message.id,
                conversationId: message.conversationId,
                senderId: message.senderId,
                content: message.content,
                createdAt: message.createdAt,
                sender: message.sender,
                readStates: [],
              },
            })),
          );

          if (message.conversationId === selectedConversationId) {
            setSelectedConversation((current) => {
              if (!current || current.messages.some((item) => item.id === message.id)) {
                return current;
              }

              return {
                ...current,
                messages: [
                  ...current.messages,
                  {
                    id: message.id,
                    conversationId: message.conversationId,
                    senderId: message.senderId,
                    content: message.content,
                    createdAt: message.createdAt,
                    sender: message.sender,
                    readStates: [],
                  },
                ],
              };
            });
          }

          return;
        }

        if (event.type === "notification:new" && event.payload?.notification) {
          const notification = event.payload.notification;
          setNotifications((current) => [
            {
              id: notification.id,
              title: notification.title,
              body: notification.body,
              actionUrl: notification.actionUrl,
              isRead: notification.isRead,
              createdAt: notification.createdAt,
            },
            ...current.filter((item) => item.id !== notification.id),
          ].slice(0, 12));
          return;
        }

        if (event.type === "notification:read" && event.payload?.notificationId) {
          setNotifications((current) =>
            current.map((notification) =>
              notification.id === event.payload?.notificationId
                ? {
                    ...notification,
                    isRead: true,
                  }
                : notification,
            ),
          );
          return;
        }

        if (
          (event.type === "call:incoming" ||
            event.type === "call:accepted" ||
            event.type === "call:declined" ||
            event.type === "call:ended" ||
            event.type === "call:missed") &&
          event.payload?.call &&
          event.conversationId
        ) {
          const nextCall = event.payload.call;
          const nextActiveCall =
            nextCall.status === CallSessionStatus.RINGING ||
            nextCall.status === CallSessionStatus.ACTIVE
              ? (nextCall as CallSummary)
              : null;

          setConversations((current) =>
            upsertConversation(current, event.conversationId!, (conversation) => ({
              ...conversation,
              activeCall: nextActiveCall,
            })),
          );

          if (event.conversationId === selectedConversationId) {
            setSelectedConversation((current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                recentCalls: upsertRecentCall(current.recentCalls, nextCall),
              };
            });
          }
        }
      },
      [currentUserId, selectedConversationId],
    ),
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = conversationQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      getConversationSearchText(conversation).includes(normalizedQuery),
    );
  }, [conversationQuery, conversations]);

  const filteredMessages = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    const normalizedQuery = messageQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return selectedConversation.messages;
    }

    return selectedConversation.messages.filter((message) =>
      `${message.sender.name} ${message.content}`.toLowerCase().includes(normalizedQuery),
    );
  }, [messageQuery, selectedConversation]);

  const conversationTitle = selectedConversationPreview
    ? getConversationLabel(selectedConversationPreview, currentUserId)
    : "Messages";
  const conversationSubtitle =
    selectedConversation && selectedConversationPreview
      ? getConversationSubtitle({
          conversation: selectedConversation.conversation,
          otherParticipants: selectedConversation.otherParticipants,
        })
      : "Search your chats, pick a thread, and keep the momentum moving.";
  const activeCall =
    selectedConversation?.recentCalls.find(
      (call) =>
        call.status === CallSessionStatus.RINGING || call.status === CallSessionStatus.ACTIVE,
    ) ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-[70vh] overflow-hidden rounded-[32px] border border-border/70 bg-background/80 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:max-h-[calc(100vh-9.75rem)]",
          selectedConversation ? "hidden lg:block" : "block",
        )}
      >
        <div className="border-b border-border/70 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Communication
              </p>
              <h1 className="mt-2 text-2xl font-semibold">Messages</h1>
            </div>
            <Badge variant={unreadNotificationCount ? "success" : "outline"}>
              {unreadNotificationCount} alerts
            </Badge>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-11"
              onChange={(event) => setConversationQuery(event.target.value)}
              placeholder="Search chats, people, or groups"
              value={conversationQuery}
            />
          </div>
        </div>

        <div className="max-h-[calc(100vh-21rem)] space-y-5 overflow-y-auto px-3 py-3 sm:px-4 lg:max-h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {filteredConversations.length ? (
              filteredConversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId;
                return (
                  <Link
                    className={cn(
                      "block rounded-[28px] border border-transparent p-3 transition hover:border-primary/20 hover:bg-card/80",
                      isActive && "border-primary/25 bg-primary/5 shadow-[0_18px_40px_-30px_rgba(15,118,110,0.8)]",
                    )}
                    href={`/messages/${conversation.id}`}
                    key={conversation.id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(conversation.title)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {conversation.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted">
                              {getPreviewMessage(conversation, currentUserId)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-[11px] text-muted">
                              {conversation.latestMessage?.createdAt
                                ? formatRelative(conversation.latestMessage.createdAt)
                                : "New"}
                            </span>
                            {conversation.unreadCount ? (
                              <Badge variant="success">{conversation.unreadCount}</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              conversation.type === ConversationType.GROUP ? "secondary" : "outline"
                            }
                          >
                            {conversation.type === ConversationType.GROUP ? "Group" : "Direct"}
                          </Badge>
                          {conversation.activeCall ? (
                            <Badge
                              variant={
                                conversation.activeCall.status === CallSessionStatus.ACTIVE
                                  ? "success"
                                  : "secondary"
                              }
                            >
                              {conversation.activeCall.callType.toLowerCase()} live
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-border bg-background/60 p-5 text-sm leading-7 text-muted">
                No chats matched your search. Try a name, group, or last message keyword.
              </div>
            )}
          </div>

          <section className="rounded-[28px] border border-border/70 bg-card/70 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-semibold">Quick start</p>
            </div>
            <div className="mt-3 space-y-3">
              {quickStartUsers.length ? (
                quickStartUsers.slice(0, 4).map((user) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[22px] bg-background/70 p-3"
                    key={user.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {user.headline ?? getPresenceLabel(user.lastActiveAt)}
                      </p>
                    </div>
                    <StartConversationButton size="sm" targetUserId={user.id} variant="secondary">
                      Chat
                    </StartConversationButton>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted">
                  {currentUserRole === Role.STUDENT
                    ? "Connections and mentors you can message will appear here."
                    : "Active student threads will surface here as soon as they arrive."}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-border/70 bg-card/70 p-4">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <p className="text-sm font-semibold">Recent notifications</p>
            </div>
            <div className="mt-3 space-y-3">
              {notifications.length ? (
                notifications.slice(0, 4).map((notification) => (
                  <div className="rounded-[22px] bg-background/70 p-3" key={notification.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{notification.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                          {notification.body}
                        </p>
                        <p className="mt-2 text-[11px] text-muted">
                          {formatRelative(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead ? (
                        <NotificationReadButton notificationId={notification.id} />
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted">
                  Message alerts, call events, and approvals will show up here.
                </p>
              )}
            </div>
          </section>
        </div>
      </aside>

      <section
        className={cn(
          "overflow-hidden rounded-[32px] border border-border/70 bg-background/85 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl",
          selectedConversation ? "flex min-h-[72vh] flex-col lg:max-h-[calc(100vh-9.75rem)]" : "hidden lg:flex lg:min-h-[70vh] lg:flex-col",
        )}
      >
        {selectedConversation && selectedConversationPreview ? (
          <>
            <div className="border-b border-border/70 bg-background/95 px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <Button asChild className="lg:hidden" size="icon" variant="ghost">
                  <Link href="/messages">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(conversationTitle)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold">{conversationTitle}</p>
                    <Badge
                      variant={
                        selectedConversationPreview.type === ConversationType.GROUP
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {selectedConversationPreview.type === ConversationType.GROUP
                        ? "Group chat"
                        : "Direct chat"}
                    </Badge>
                    {activeCall ? (
                      <Badge
                        variant={
                          activeCall.status === CallSessionStatus.ACTIVE ? "success" : "secondary"
                        }
                      >
                        {activeCall.callType.toLowerCase()} live
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{conversationSubtitle}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-11"
                    onChange={(event) => setMessageQuery(event.target.value)}
                    placeholder="Search this conversation"
                    value={messageQuery}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.otherParticipants.slice(0, 2).map((participant) => (
                    <Badge className="max-w-full truncate" key={participant.userId} variant="outline">
                      {participant.user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {selectedConversation.conversation.type === ConversationType.DIRECT ? (
              <div className="border-b border-border/70 p-4 sm:p-5">
                <CallControls
                  activeCall={activeCall}
                  conversationId={selectedConversation.conversation.id}
                  currentUserId={currentUserId}
                  disabledReason={
                    selectedConversation.canStartCall
                      ? selectedConversation.messageDisabledReason
                      : "Calls are only available in direct conversations."
                  }
                />
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-3 py-4 sm:px-5">
              {filteredMessages.length ? (
                <div className="space-y-3">
                  {filteredMessages.map((message) => {
                    const isOwn = message.senderId === currentUserId;
                    const seenByOthers = message.readStates.some(
                      (state) => state.userId !== currentUserId && state.readAt,
                    );

                    return (
                      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")} key={message.id}>
                        <div
                          className={cn(
                            "max-w-[88%] rounded-[24px] px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] sm:max-w-[75%]",
                            isOwn
                              ? "rounded-br-lg bg-primary text-primary-foreground"
                              : "rounded-bl-lg border border-border bg-background/95 text-foreground",
                          )}
                        >
                          {!isOwn ? (
                            <p className="text-xs font-semibold text-primary">
                              {message.sender.name}
                            </p>
                          ) : null}
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-7">
                            {message.content}
                          </p>
                          <div
                            className={cn(
                              "mt-2 flex items-center justify-end gap-2 text-[11px]",
                              isOwn ? "text-primary-foreground/80" : "text-muted",
                            )}
                          >
                            <span>{formatRelative(message.createdAt)}</span>
                            {isOwn ? <span>{seenByOthers ? "Seen" : "Delivered"}</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid h-full min-h-[18rem] place-items-center text-center">
                  <div className="max-w-md space-y-3">
                    <div className="mx-auto grid size-14 place-items-center rounded-3xl bg-primary/10 text-primary">
                      <Search className="size-6" />
                    </div>
                    <h2 className="text-xl font-semibold">No messages matched your search</h2>
                    <p className="text-sm leading-7 text-muted">
                      Try a different keyword or clear the search to see the full conversation again.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border/70 bg-background/95 p-3 sm:p-4">
              <MessageComposer
                conversationId={selectedConversation.conversation.id}
                disabledReason={selectedConversation.messageDisabledReason}
                helperText="Enter sends clarity faster. Emoji and attachments are ready for the next iteration."
                placeholder="Type a focused message..."
                refreshOnSuccess={false}
                variant="chat"
              />
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 py-12 text-center">
            <div className="max-w-xl space-y-4">
              <div className="mx-auto grid size-16 place-items-center rounded-[30px] bg-primary/10 text-primary">
                <MessageSquareDashed className="size-7" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Focused inbox
                </p>
                <h2 className="text-2xl font-semibold">Pick a chat to keep the momentum moving</h2>
              </div>
              <p className="text-sm leading-7 text-muted">
                Search the left rail, jump into an active thread, or start a fresh conversation with
                a mentor or connection. Group conversations stay in the same workspace, so switching
                from one-to-one help to team discussion feels instant.
              </p>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-[28px] border border-border bg-card/70 p-4 text-left">
                  <div className="flex items-center gap-2">
                    <UsersRound className="size-4 text-primary" />
                    <p className="text-sm font-semibold">Conversation search</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Filter by student, mentor, or group name without leaving the inbox.
                  </p>
                </div>
                <div className="rounded-[28px] border border-border bg-card/70 p-4 text-left">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-primary" />
                    <p className="text-sm font-semibold">Live updates</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Calls, unread badges, and new messages stay visible while you work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
