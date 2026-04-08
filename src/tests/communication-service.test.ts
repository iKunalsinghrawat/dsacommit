/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GroupJoinPolicy,
  GroupJoinRequestStatus,
  GroupMemberRole,
  GroupPrivacy,
  NotificationType,
  Role,
  UserStatus,
} from "@/generated/prisma/enums";

const prisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  userBlock: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  userConnection: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  connectionRequest: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  group: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  groupMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  groupJoinRequest: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  conversation: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  conversationParticipant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  directMessage: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  messageReadState: {
    createMany: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  callSession: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
} as const;

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

const communicationService = await import("@/server/communication-service");

describe("communication service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.userBlock.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "notification-1",
      userId: String(data.userId),
      actorId: data.actorId ? String(data.actorId) : null,
      type: data.type,
      title: String(data.title),
      body: String(data.body),
      actionUrl: data.actionUrl ? String(data.actionUrl) : null,
      isRead: false,
      createdAt: new Date("2026-04-08T10:00:00.000Z"),
    }));
  });

  it("starts a direct conversation between a student and a mentor without needing a student connection", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "student-1",
        name: "Student One",
        slug: "student-one",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        headline: null,
        avatarUrl: null,
        isVerified: false,
        lastActiveAt: null,
      })
      .mockResolvedValueOnce({
        id: "mentor-1",
        name: "Mentor One",
        slug: "mentor-one",
        role: Role.MENTOR,
        status: UserStatus.ACTIVE,
        headline: "SDE 2",
        avatarUrl: null,
        isVerified: true,
        lastActiveAt: null,
      });
    prisma.conversation.findUnique.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue({ id: "conversation-1" });

    const conversationId = await communicationService.startDirectConversation({
      currentUserId: "student-1",
      targetUserId: "mentor-1",
    });

    expect(conversationId).toBe("conversation-1");
    expect(prisma.userConnection.findUnique).not.toHaveBeenCalled();
  });

  it("creates a pending join request for a private group instead of joining immediately", async () => {
    prisma.group.findUnique.mockResolvedValue({
      id: "group-1",
      slug: "private-group",
      createdById: "owner-1",
      privacy: GroupPrivacy.PRIVATE,
      joinPolicy: GroupJoinPolicy.APPROVAL,
      members: [],
      conversation: { id: "conversation-group-1" },
    });
    prisma.groupMember.findUnique.mockResolvedValue(null);
    prisma.groupJoinRequest.upsert.mockResolvedValue({
      id: "join-request-1",
      groupId: "group-1",
      requesterId: "student-2",
      status: GroupJoinRequestStatus.PENDING,
    });

    const result = await communicationService.joinGroupOrCreateRequest({
      currentUserId: "student-2",
      groupId: "group-1",
      message: "I can commit 90 minutes daily.",
    });

    expect(result.type).toBe("requested");
    expect(prisma.groupJoinRequest.upsert).toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "owner-1",
          type: NotificationType.GROUP_JOIN_REQUEST,
        }),
      }),
    );
  });

  it("approves a private group join request and adds the requester to the group conversation", async () => {
    prisma.groupJoinRequest.findUnique.mockResolvedValue({
      id: "request-1",
      groupId: "group-1",
      requesterId: "student-4",
      group: {
        id: "group-1",
        slug: "graph-pod",
        name: "Graph Pod",
        conversation: { id: "conversation-group-1" },
      },
      requester: {
        id: "student-4",
        name: "Student Four",
        slug: "student-four",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        headline: null,
        avatarUrl: null,
        isVerified: false,
        lastActiveAt: null,
      },
    });
    prisma.groupMember.findUnique.mockResolvedValue({
      id: "membership-1",
      groupId: "group-1",
      userId: "owner-1",
      role: GroupMemberRole.OWNER,
    });
    prisma.groupJoinRequest.update.mockResolvedValue({
      id: "request-1",
      status: GroupJoinRequestStatus.APPROVED,
    });
    prisma.groupMember.upsert.mockResolvedValue({});
    prisma.conversationParticipant.upsert.mockResolvedValue({});

    await communicationService.reviewGroupJoinRequest({
      currentUserId: "owner-1",
      requestId: "request-1",
      status: "APPROVED",
    });

    expect(prisma.groupMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          groupId_userId: {
            groupId: "group-1",
            userId: "student-4",
          },
        },
      }),
    );
    expect(prisma.conversationParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversationId_userId: {
            conversationId: "conversation-group-1",
            userId: "student-4",
          },
        },
      }),
    );
  });

  it("prevents direct messages when one user has blocked the other", async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue({
      id: "participant-1",
      conversationId: "conversation-1",
      userId: "student-1",
      conversation: {
        id: "conversation-1",
        type: "DIRECT",
        group: null,
        participants: [
          {
            id: "participant-1",
            userId: "student-1",
            user: {
              id: "student-1",
              name: "Student One",
              slug: "student-one",
              role: Role.STUDENT,
              status: UserStatus.ACTIVE,
              headline: null,
              avatarUrl: null,
              isVerified: false,
              lastActiveAt: null,
            },
          },
          {
            id: "participant-2",
            userId: "student-2",
            user: {
              id: "student-2",
              name: "Student Two",
              slug: "student-two",
              role: Role.STUDENT,
              status: UserStatus.ACTIVE,
              headline: null,
              avatarUrl: null,
              isVerified: false,
              lastActiveAt: null,
            },
          },
        ],
      },
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "student-1",
        name: "Student One",
        slug: "student-one",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        headline: null,
        avatarUrl: null,
        isVerified: false,
        lastActiveAt: null,
      })
      .mockResolvedValueOnce({
        id: "student-2",
        name: "Student Two",
        slug: "student-two",
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        headline: null,
        avatarUrl: null,
        isVerified: false,
        lastActiveAt: null,
      });
    prisma.userBlock.findFirst.mockResolvedValue({
      id: "block-1",
      blockerId: "student-2",
      blockedId: "student-1",
    });

    await expect(
      communicationService.sendMessage({
        currentUserId: "student-1",
        conversationId: "conversation-1",
        content: "Can we review the graph solution tonight?",
      }),
    ).rejects.toThrow(/blocked/i);
  });

  it("blocks a user and clears any existing connection or pending requests", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "student-2",
      name: "Student Two",
      slug: "student-two",
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      headline: null,
      avatarUrl: null,
      isVerified: false,
      lastActiveAt: null,
    });

    await communicationService.blockUser({
      currentUserId: "student-1",
      targetUserId: "student-2",
    });

    expect(prisma.userBlock.upsert).toHaveBeenCalled();
    expect(prisma.userConnection.deleteMany).toHaveBeenCalledWith({
      where: {
        userOneId: "student-1",
        userTwoId: "student-2",
      },
    });
    expect(prisma.connectionRequest.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { senderId: "student-1", receiverId: "student-2" },
            { senderId: "student-2", receiverId: "student-1" },
          ]),
        }),
      }),
    );
  });

  it("returns an empty inbox state when communication tables are missing", async () => {
    prisma.conversationParticipant.findMany.mockRejectedValue({
      code: "P2021",
      message: "The table `ConversationParticipant` does not exist in the current database.",
    });

    const result = await communicationService.getMessagesPageData("student-1", Role.STUDENT);

    expect(result).toEqual({
      conversations: [],
      notifications: [],
      quickStartUsers: [],
      unreadNotificationCount: 0,
    });
  });

  it("returns an empty groups state when group tables are missing", async () => {
    prisma.groupMember.findMany.mockRejectedValue({
      code: "P2021",
      message: "The table `GroupMember` does not exist in the current database.",
    });

    const result = await communicationService.getGroupsPageData("student-1");

    expect(result).toEqual({
      myMemberships: [],
      discoverableGroups: [],
      pendingRequests: [],
    });
  });

  it("returns an empty connections state when connection tables are missing", async () => {
    prisma.userConnection.findMany.mockRejectedValue({
      code: "P2021",
      message: "The table `ConnectionRequest` does not exist in the current database.",
    });

    const result = await communicationService.getConnectionsPageData("student-1");

    expect(result).toEqual({
      connections: [],
      incomingRequests: [],
      outgoingRequests: [],
      blockedUsers: [],
      discoverableStudents: [],
    });
  });
});
