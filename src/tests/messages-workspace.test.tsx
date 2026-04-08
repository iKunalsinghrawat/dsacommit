import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MessagesWorkspace } from "@/components/communication/messages-workspace";
import {
  CallSessionStatus,
  ConversationType,
  Role,
} from "@/generated/prisma/enums";

const { subscribeSpy } = vi.hoisted(() => ({
  subscribeSpy: vi.fn(),
}));

vi.mock("@/components/communication/communication-realtime-provider", () => ({
  useCommunicationRealtimeSubscription: (listener: (event: unknown) => void) => {
    subscribeSpy(listener);
  },
}));

vi.mock("@/components/communication/communication-controls", () => ({
  StartConversationButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  NotificationReadButton: () => <button type="button">Mark read</button>,
  MessageComposer: ({ conversationId }: { conversationId: string }) => (
    <div data-testid={`composer-${conversationId}`}>Composer</div>
  ),
  CallControls: () => <div>Call controls</div>,
}));

function buildProps() {
  return {
    currentUserId: "user-1",
    currentUserRole: Role.STUDENT,
    unreadNotificationCount: 2,
    quickStartUsers: [
      {
        id: "mentor-1",
        name: "Aarav Mentor",
        role: Role.MENTOR,
        headline: "Mock interviews and DSA breakdowns",
        isVerified: true,
      },
    ],
    notifications: [
      {
        id: "notification-1",
        title: "New direct message",
        body: "Aarav replied to your last doubt.",
        isRead: false,
        createdAt: "2026-04-08T10:00:00.000Z",
      },
    ],
    conversations: [
      {
        id: "conversation-1",
        type: ConversationType.DIRECT,
        title: "Aarav Mentor",
        participants: [
          {
            userId: "user-1",
            user: {
              id: "user-1",
              name: "Student One",
              role: Role.STUDENT,
            },
          },
          {
            userId: "mentor-1",
            user: {
              id: "mentor-1",
              name: "Aarav Mentor",
              role: Role.MENTOR,
              headline: "Mock interviews and DSA breakdowns",
              lastActiveAt: new Date().toISOString(),
            },
          },
        ],
        unreadCount: 1,
        latestMessage: {
          id: "message-1",
          senderId: "mentor-1",
          content: "Focus on binary search templates first.",
          createdAt: "2026-04-08T09:30:00.000Z",
          sender: {
            id: "mentor-1",
            name: "Aarav Mentor",
            role: Role.MENTOR,
          },
          readStates: [],
        },
        activeCall: null,
      },
      {
        id: "conversation-2",
        type: ConversationType.GROUP,
        title: "Heap Ninjas",
        group: {
          name: "Heap Ninjas",
          description: "Priority queue drills",
        },
        participants: [
          {
            userId: "user-1",
            user: {
              id: "user-1",
              name: "Student One",
              role: Role.STUDENT,
            },
          },
        ],
        unreadCount: 0,
        latestMessage: {
          id: "message-2",
          senderId: "user-1",
          content: "Let's revise heapify tonight.",
          createdAt: "2026-04-08T08:00:00.000Z",
          sender: {
            id: "user-1",
            name: "Student One",
            role: Role.STUDENT,
          },
          readStates: [],
        },
        activeCall: {
          id: "call-1",
          callType: "AUDIO",
          status: CallSessionStatus.ACTIVE,
        },
      },
    ],
    selectedConversation: {
      conversation: {
        id: "conversation-1",
        type: ConversationType.DIRECT,
        participants: [
          {
            userId: "user-1",
            user: {
              id: "user-1",
              name: "Student One",
              role: Role.STUDENT,
            },
          },
          {
            userId: "mentor-1",
            user: {
              id: "mentor-1",
              name: "Aarav Mentor",
              role: Role.MENTOR,
              headline: "Mock interviews and DSA breakdowns",
              lastActiveAt: new Date().toISOString(),
            },
          },
        ],
      },
      otherParticipants: [
        {
          userId: "mentor-1",
          user: {
            id: "mentor-1",
            name: "Aarav Mentor",
            role: Role.MENTOR,
            headline: "Mock interviews and DSA breakdowns",
            lastActiveAt: new Date().toISOString(),
          },
        },
      ],
      messages: [
        {
          id: "message-a",
          senderId: "mentor-1",
          content: "Binary search first, then sliding window.",
          createdAt: "2026-04-08T09:00:00.000Z",
          sender: {
            id: "mentor-1",
            name: "Aarav Mentor",
            role: Role.MENTOR,
          },
          readStates: [],
        },
        {
          id: "message-b",
          senderId: "user-1",
          content: "Got it, I'll practice the lower-bound pattern.",
          createdAt: "2026-04-08T09:05:00.000Z",
          sender: {
            id: "user-1",
            name: "Student One",
            role: Role.STUDENT,
          },
          readStates: [],
        },
      ],
      recentCalls: [],
      canStartCall: true,
      messageDisabledReason: null,
    },
  } as const;
}

describe("MessagesWorkspace", () => {
  it("filters conversation results from the sidebar search", async () => {
    const user = userEvent.setup();

    render(<MessagesWorkspace {...buildProps()} selectedConversation={null} />);

    await user.type(screen.getByPlaceholderText("Search chats, people, or groups"), "heap");

    expect(screen.getByText("Heap Ninjas")).toBeInTheDocument();
    expect(
      screen.queryByText("Focus on binary search templates first."),
    ).not.toBeInTheDocument();
  });

  it("updates the active thread instantly when a realtime message arrives", async () => {
    render(<MessagesWorkspace {...buildProps()} />);

    const listener = subscribeSpy.mock.calls.at(-1)?.[0] as ((event: unknown) => void) | undefined;

    expect(listener).toBeTypeOf("function");

    await act(async () => {
      listener?.({
        id: "event-1",
        type: "message:new",
        createdAt: "2026-04-08T09:10:00.000Z",
        recipients: ["user-1"],
        conversationId: "conversation-1",
        payload: {
          message: {
            id: "message-c",
            conversationId: "conversation-1",
            senderId: "mentor-1",
            content: "Fresh ping without a refresh.",
            createdAt: "2026-04-08T09:10:00.000Z",
            sender: {
              id: "mentor-1",
              name: "Aarav Mentor",
              role: Role.MENTOR,
            },
          },
        },
      });
    });

    expect(await screen.findAllByText("Fresh ping without a refresh.")).toHaveLength(2);
  });
});
