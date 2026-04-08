import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  CallParticipantStatus,
  CallSessionStatus,
  CallType,
  ConnectionRequestStatus,
  ConversationParticipantRole,
  ConversationType,
  GroupJoinPolicy,
  GroupJoinRequestStatus,
  GroupMemberRole,
  GroupPrivacy,
  NotificationType,
  Role,
  SignalingEventType,
  UserStatus,
} from "@/generated/prisma/enums";
import {
  canCreateStudentGroup,
  canManageGroupMembership,
  canStartCallForConversation,
  canUseDirectConversation,
  canonicalizeUserPair,
  createDirectConversationKey,
  requiresAcceptedConnectionForDirectConversation,
} from "@/lib/communication";
import type {
  CommunicationRealtimeCall,
  CommunicationRealtimeNotification,
  CommunicationRealtimeSignal,
  CommunicationRealtimeUser,
} from "@/lib/communication-realtime";
import { prisma } from "@/lib/prisma";
import { isRecoverableRuntimeError, logServerError } from "@/lib/runtime-guards";
import { slugify } from "@/lib/utils";
import {
  publishCommunicationRealtimeEvent,
  type RealtimeDbClient,
} from "@/server/communication-realtime";

type TransactionClient = Prisma.TransactionClient;

const communicationUserSelect = {
  id: true,
  name: true,
  slug: true,
  role: true,
  status: true,
  headline: true,
  avatarUrl: true,
  isVerified: true,
  lastActiveAt: true,
} as const;

function createConversationPreview(content: string) {
  return content.length > 120 ? `${content.slice(0, 117)}...` : content;
}

function getEmptyMessagesPageData() {
  return {
    conversations: [],
    notifications: [],
    quickStartUsers: [],
    unreadNotificationCount: 0,
  };
}

function getEmptyGroupsPageData() {
  return {
    myMemberships: [],
    discoverableGroups: [],
    pendingRequests: [],
  };
}

function getEmptyConnectionsPageData() {
  return {
    connections: [],
    incomingRequests: [],
    outgoingRequests: [],
    blockedUsers: [],
    discoverableStudents: [],
  };
}

function toIsoString(value?: Date | string | null) {
  if (!value) {
    return new Date().toISOString();
  }

  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime())
    ? new Date().toISOString()
    : normalized.toISOString();
}

function serializeRealtimeUser(
  user: Partial<{
    id: string;
    name: string;
    slug: string | null;
    role: Role;
    headline: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    lastActiveAt: Date | string | null;
  }>,
): CommunicationRealtimeUser {
  return {
    id: user.id ?? "",
    name: user.name ?? "Unknown user",
    slug: user.slug ?? null,
    role: user.role,
    headline: user.headline ?? null,
    avatarUrl: user.avatarUrl ?? null,
    isVerified: user.isVerified ?? false,
    lastActiveAt: user.lastActiveAt ? toIsoString(user.lastActiveAt) : null,
  };
}

function serializeNotificationForRealtime(notification: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: Date | string;
  actor?: Partial<{
    id: string;
    name: string;
    slug: string | null;
    role: Role;
    headline: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    lastActiveAt: Date | string | null;
  }> | null;
}): CommunicationRealtimeNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    actionUrl: notification.actionUrl,
    isRead: notification.isRead,
    createdAt: toIsoString(notification.createdAt),
    actor: notification.actor ? serializeRealtimeUser(notification.actor) : null,
  };
}

function serializeCallForRealtime(call: {
  id: string;
  conversationId: string;
  callType: CallType;
  status: CallSessionStatus;
  initiatedById: string;
  createdAt: Date | string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  participants: Array<{
    userId: string;
    status: CallParticipantStatus;
    user: Partial<{
      id: string;
      name: string;
      slug: string | null;
      role: Role;
      headline: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
      lastActiveAt: Date | string | null;
    }>;
  }>;
}): CommunicationRealtimeCall {
  const initiator =
    call.participants.find((participant) => participant.userId === call.initiatedById)?.user ??
    { id: call.initiatedById, name: "Unknown caller" };

  return {
    id: call.id,
    conversationId: call.conversationId,
    callType: call.callType,
    status: call.status,
    initiatedById: call.initiatedById,
    initiatedBy: serializeRealtimeUser(initiator),
    createdAt: toIsoString(call.createdAt),
    startedAt: call.startedAt ? toIsoString(call.startedAt) : null,
    endedAt: call.endedAt ? toIsoString(call.endedAt) : null,
    participants: call.participants.map((participant) => ({
      userId: participant.userId,
      status: participant.status,
      user: serializeRealtimeUser(participant.user),
    })),
  };
}

function serializeCallSignalForRealtime(signal: {
  id: string;
  callSessionId: string;
  senderId: string;
  type: SignalingEventType;
  payload: unknown;
  createdAt: Date | string;
  sender: Partial<{
    id: string;
    name: string;
    slug: string | null;
    role: Role;
    headline: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    lastActiveAt: Date | string | null;
  }>;
}): CommunicationRealtimeSignal {
  return {
    id: signal.id,
    callSessionId: signal.callSessionId,
    senderId: signal.senderId,
    type: signal.type,
    payload: signal.payload,
    createdAt: toIsoString(signal.createdAt),
    sender: serializeRealtimeUser(signal.sender),
  };
}

async function publishConversationUpdate(
  client: RealtimeDbClient,
  input: {
    recipients: string[];
    conversationId: string;
    reason: string;
    callSessionId?: string;
  },
) {
  await publishCommunicationRealtimeEvent(client, {
    type: "conversation:update",
    recipients: input.recipients,
    conversationId: input.conversationId,
    callSessionId: input.callSessionId,
    payload: {
      reason: input.reason,
    },
  });
}

async function createUniqueGroupSlug(name: string) {
  const base = slugify(name);
  let suffix = 1;
  let candidate = base;

  while (await prisma.group.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

function assertActiveUser(user: { status: UserStatus }) {
  if (user.status !== UserStatus.ACTIVE) {
    throw new Error("This account cannot use communication features right now.");
  }
}

async function findActiveCommunicationUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: communicationUserSelect,
  });
}

async function checkBlockBetweenUsers(userAId: string, userBId: string) {
  return prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
  });
}

async function createNotification(
  tx: TransactionClient,
  input: {
    userId: string;
    actorId?: string;
    actor?: Partial<{
      id: string;
      name: string;
      slug: string | null;
      role: Role;
      headline: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
      lastActiveAt: Date | string | null;
    }>;
    type: NotificationType;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const notification = await tx.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      metadata: input.metadata,
    },
  });

  await publishCommunicationRealtimeEvent(tx, {
    type: "notification:new",
    recipients: [input.userId],
    payload: {
      notification: serializeNotificationForRealtime({
        ...notification,
        actor: input.actor ?? null,
      }),
    },
  });

  return notification;
}

async function ensureDirectConversationPermissions(input: {
  currentUserId: string;
  targetUserId: string;
}) {
  if (input.currentUserId === input.targetUserId) {
    throw new Error("You cannot start a direct conversation with yourself.");
  }

  const [currentUser, targetUser, blockRecord] = await Promise.all([
    findActiveCommunicationUser(input.currentUserId),
    findActiveCommunicationUser(input.targetUserId),
    checkBlockBetweenUsers(input.currentUserId, input.targetUserId),
  ]);

  if (!currentUser || !targetUser) {
    throw new Error("The selected user is no longer available.");
  }

  assertActiveUser(currentUser);
  assertActiveUser(targetUser);

  if (blockRecord) {
    throw new Error("Direct communication is unavailable because one of these users is blocked.");
  }

  if (!canUseDirectConversation(currentUser.role, targetUser.role)) {
    throw new Error("These two accounts cannot open a direct conversation.");
  }

  if (
    requiresAcceptedConnectionForDirectConversation(currentUser.role, targetUser.role)
  ) {
    const [userOneId, userTwoId] = canonicalizeUserPair(
      currentUser.id,
      targetUser.id,
    );

    const connection = await prisma.userConnection.findUnique({
      where: {
        userOneId_userTwoId: {
          userOneId,
          userTwoId,
        },
      },
    });

    if (!connection) {
      throw new Error("Students can only message users they are connected with.");
    }
  }

  return { currentUser, targetUser };
}

async function ensureDirectConversation(
  tx: TransactionClient,
  input: {
    currentUserId: string;
    targetUserId: string;
  },
) {
  const directKey = createDirectConversationKey(
    input.currentUserId,
    input.targetUserId,
  );

  const existingConversation = await tx.conversation.findUnique({
    where: { directKey },
    include: {
      participants: true,
    },
  });

  if (existingConversation) {
    const participantIds = new Set(
      existingConversation.participants.map((participant) => participant.userId),
    );

    for (const userId of [input.currentUserId, input.targetUserId]) {
      if (!participantIds.has(userId)) {
        await tx.conversationParticipant.create({
          data: {
            conversationId: existingConversation.id,
            userId,
          },
        });
      }
    }

    return existingConversation.id;
  }

  const conversation = await tx.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      directKey,
      createdById: input.currentUserId,
      participants: {
        create: [
          { userId: input.currentUserId },
          { userId: input.targetUserId },
        ],
      },
    },
  });

  return conversation.id;
}

async function getConversationParticipantRecord(
  userId: string,
  conversationId: string,
) {
  return prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    include: {
      conversation: {
        include: {
          group: true,
          participants: {
            include: {
              user: {
                select: communicationUserSelect,
              },
            },
          },
        },
      },
    },
  });
}

async function markConversationRead(
  tx: TransactionClient,
  userId: string,
  conversationId: string,
) {
  const now = new Date();

  await tx.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    data: {
      lastReadAt: now,
    },
  });

  await tx.messageReadState.updateMany({
    where: {
      userId,
      readAt: null,
      message: {
        conversationId,
        senderId: { not: userId },
      },
    },
    data: {
      deliveredAt: now,
      readAt: now,
    },
  });
}

export async function getMessagesPageData(userId: string, role: Role) {
  try {
    const [conversationMemberships, notifications] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { userId, isArchived: false },
        include: {
          conversation: {
            include: {
              group: true,
              participants: {
                include: {
                  user: {
                    select: communicationUserSelect,
                  },
                },
              },
              callSessions: {
                where: {
                  status: { in: [CallSessionStatus.RINGING, CallSessionStatus.ACTIVE] },
                },
                orderBy: { createdAt: "desc" },
                take: 1,
                include: {
                  participants: true,
                },
              },
            },
          },
        },
        orderBy: {
          conversation: {
            updatedAt: "desc",
          },
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          actor: {
            select: communicationUserSelect,
          },
        },
      }),
    ]);

    const conversations = await Promise.all(
      conversationMemberships.map(async (membership) => {
        const unreadCount = await prisma.messageReadState.count({
          where: {
            userId,
            readAt: null,
            message: {
              conversationId: membership.conversationId,
              senderId: { not: userId },
            },
          },
        });

        const latestMessage = await prisma.directMessage.findFirst({
          where: { conversationId: membership.conversationId },
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: communicationUserSelect,
            },
            readStates: true,
          },
        });

        const otherParticipants = membership.conversation.participants.filter(
          (participant) => participant.userId !== userId,
        );
        const title =
          membership.conversation.type === ConversationType.GROUP
            ? membership.conversation.group?.name ?? "Study group"
            : otherParticipants.map((participant) => participant.user.name).join(", ");

        return {
          id: membership.conversation.id,
          type: membership.conversation.type,
          title,
          group: membership.conversation.group,
          participants: membership.conversation.participants,
          unreadCount,
          lastReadAt: membership.lastReadAt,
          latestMessage,
          activeCall: membership.conversation.callSessions[0] ?? null,
        };
      }),
    );

    let quickStartUsers: Array<{
      id: string;
      name: string;
      slug: string;
      role: Role;
      headline: string | null;
      isVerified: boolean;
    }> = [];

    if (role === Role.STUDENT) {
      const [connections, mentors] = await Promise.all([
        prisma.userConnection.findMany({
          where: {
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
          include: {
            userOne: {
              select: communicationUserSelect,
            },
            userTwo: {
              select: communicationUserSelect,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.user.findMany({
          where: { role: Role.MENTOR, status: UserStatus.ACTIVE },
          select: communicationUserSelect,
          orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
          take: 6,
        }),
      ]);

      quickStartUsers = [
        ...connections.map((connection) =>
          connection.userOneId === userId ? connection.userTwo : connection.userOne,
        ),
        ...mentors,
      ].filter(
        (user, index, collection) =>
          collection.findIndex((item) => item.id === user.id) === index,
      );
    } else if (role === Role.MENTOR) {
      const activeConversationUserIds = conversations.flatMap((conversation) =>
        conversation.participants
          .filter((participant) => participant.userId !== userId)
          .map((participant) => participant.userId),
      );

      quickStartUsers = await prisma.user.findMany({
        where: {
          id: { in: activeConversationUserIds },
        },
        select: communicationUserSelect,
        orderBy: { name: "asc" },
      });
    }

    return {
      conversations,
      notifications,
      quickStartUsers,
      unreadNotificationCount: notifications.filter((item) => !item.isRead).length,
    };
  } catch (error) {
    logServerError("getMessagesPageData", error, { userId, role });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return getEmptyMessagesPageData();
  }
}

export async function getCommunicationShellState(userId: string) {
  try {
    const [unreadNotificationCount, incomingCallParticipant] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      prisma.callParticipant.findFirst({
        where: {
          userId,
          status: CallParticipantStatus.INVITED,
          callSession: {
            status: CallSessionStatus.RINGING,
          },
        },
        orderBy: {
          invitedAt: "desc",
        },
        include: {
          callSession: {
            include: {
              participants: {
                include: {
                  user: {
                    select: communicationUserSelect,
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      unreadNotificationCount,
      incomingCall: incomingCallParticipant
        ? serializeCallForRealtime(incomingCallParticipant.callSession)
        : null,
    };
  } catch (error) {
    logServerError("getCommunicationShellState", error, { userId });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return {
      unreadNotificationCount: 0,
      incomingCall: null,
    };
  }
}

export async function getConversationPageData(userId: string, conversationId: string) {
  try {
    const participant = await getConversationParticipantRecord(userId, conversationId);

    if (!participant) {
      return null;
    }

    const [messages, recentCalls] = await Promise.all([
      prisma.directMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: communicationUserSelect,
          },
          readStates: true,
        },
        take: 200,
      }),
      prisma.callSession.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          participants: {
            include: {
              user: {
                select: communicationUserSelect,
              },
            },
          },
        },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      await markConversationRead(tx, userId, conversationId);
    });

    const otherParticipants = participant.conversation.participants.filter(
      (member) => member.userId !== userId,
    );

    let messageDisabledReason: string | null = null;
    if (participant.conversation.type === ConversationType.DIRECT && otherParticipants[0]) {
      const blockRecord = await checkBlockBetweenUsers(userId, otherParticipants[0].userId);

      if (blockRecord) {
        messageDisabledReason = "Messaging is disabled because one user has blocked the other.";
      } else {
        const currentUser = await findActiveCommunicationUser(userId);
        const targetUser = otherParticipants[0].user;
        if (
          currentUser &&
          requiresAcceptedConnectionForDirectConversation(currentUser.role, targetUser.role)
        ) {
          const [userOneId, userTwoId] = canonicalizeUserPair(userId, targetUser.id);
          const connection = await prisma.userConnection.findUnique({
            where: {
              userOneId_userTwoId: {
                userOneId,
                userTwoId,
              },
            },
          });

          if (!connection) {
            messageDisabledReason =
              "This direct conversation is now read-only because the student connection was removed.";
          }
        }
      }
    }

    return {
      conversation: participant.conversation,
      currentParticipant: participant,
      otherParticipants,
      messages,
      recentCalls,
      canStartCall:
        participant.conversation.type === ConversationType.DIRECT &&
        canStartCallForConversation(participant.conversation.type) &&
        !messageDisabledReason,
      messageDisabledReason,
    };
  } catch (error) {
    logServerError("getConversationPageData", error, { userId, conversationId });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return null;
  }
}

export async function getGroupsPageData(userId: string) {
  try {
    const [myMemberships, discoverableGroups, pendingRequests] = await Promise.all([
      prisma.groupMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              createdBy: {
                select: communicationUserSelect,
              },
              members: {
                include: {
                  user: {
                    select: communicationUserSelect,
                  },
                },
              },
              conversation: {
                select: {
                  id: true,
                  lastMessageAt: true,
                  lastMessagePreview: true,
                },
              },
            },
          },
        },
        orderBy: {
          group: {
            updatedAt: "desc",
          },
        },
      }),
      prisma.group.findMany({
        where: {
          members: {
            none: { userId },
          },
        },
        include: {
          createdBy: {
            select: communicationUserSelect,
          },
          members: {
            include: {
              user: {
                select: communicationUserSelect,
              },
            },
          },
          joinRequests: {
            where: { requesterId: userId },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        take: 24,
      }),
      prisma.groupJoinRequest.findMany({
        where: {
          requesterId: userId,
          status: GroupJoinRequestStatus.PENDING,
        },
        include: {
          group: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      myMemberships,
      discoverableGroups,
      pendingRequests,
    };
  } catch (error) {
    logServerError("getGroupsPageData", error, { userId });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return getEmptyGroupsPageData();
  }
}

export async function getGroupPageData(userId: string, slug: string) {
  try {
    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        createdBy: {
          select: communicationUserSelect,
        },
        members: {
          include: {
            user: {
              select: communicationUserSelect,
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
        joinRequests: {
          where: { status: GroupJoinRequestStatus.PENDING },
          include: {
            requester: {
              select: communicationUserSelect,
            },
          },
          orderBy: { createdAt: "asc" },
        },
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: communicationUserSelect,
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return null;
    }

    const membership = group.members.find((member) => member.userId === userId) ?? null;
    const pendingJoinRequest = await prisma.groupJoinRequest.findUnique({
      where: {
        groupId_requesterId: {
          groupId: group.id,
          requesterId: userId,
        },
      },
    });

    const messages =
      membership && group.conversation
        ? await prisma.directMessage.findMany({
            where: { conversationId: group.conversation.id },
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: communicationUserSelect,
              },
              readStates: true,
            },
            take: 200,
          })
        : [];

    if (membership && group.conversation) {
      await prisma.$transaction(async (tx) => {
        await markConversationRead(tx, userId, group.conversation!.id);
      });
    }

    return {
      group,
      membership,
      pendingJoinRequest,
      messages,
      canManage: membership ? canManageGroupMembership(membership.role) : false,
    };
  } catch (error) {
    logServerError("getGroupPageData", error, { userId, slug });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return null;
  }
}

export async function getConnectionsPageData(userId: string) {
  try {
    const [connections, incomingRequests, outgoingRequests, blockedUsers, discoverStudents] =
      await Promise.all([
        prisma.userConnection.findMany({
          where: {
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
          include: {
            userOne: {
              select: communicationUserSelect,
            },
            userTwo: {
              select: communicationUserSelect,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.connectionRequest.findMany({
          where: {
            receiverId: userId,
            status: ConnectionRequestStatus.PENDING,
          },
          include: {
            sender: {
              select: communicationUserSelect,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.connectionRequest.findMany({
          where: {
            senderId: userId,
            status: ConnectionRequestStatus.PENDING,
          },
          include: {
            receiver: {
              select: communicationUserSelect,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userBlock.findMany({
          where: { blockerId: userId },
          include: {
            blocked: {
              select: communicationUserSelect,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
          where: {
            role: Role.STUDENT,
            status: UserStatus.ACTIVE,
            id: { not: userId },
          },
          select: {
            ...communicationUserSelect,
            studentProfile: {
              select: {
                currentLevel: true,
                target: true,
                weeklyConsistencyScore: true,
                commitmentScore: true,
              },
            },
          },
          orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
          take: 20,
        }),
      ]);

    const blockedUserIds = new Set(blockedUsers.map((item) => item.blockedId));
    const connectedUserIds = new Set(
      connections.map((connection) =>
        connection.userOneId === userId ? connection.userTwoId : connection.userOneId,
      ),
    );
    const incomingSenderIds = new Set(incomingRequests.map((request) => request.senderId));
    const outgoingReceiverIds = new Set(outgoingRequests.map((request) => request.receiverId));

    const discoverableStudents = discoverStudents.filter(
      (student) =>
        !blockedUserIds.has(student.id) &&
        !connectedUserIds.has(student.id) &&
        !incomingSenderIds.has(student.id) &&
        !outgoingReceiverIds.has(student.id),
    );

    return {
      connections: connections.map((connection) => ({
        id: connection.id,
        createdAt: connection.createdAt,
        user: connection.userOneId === userId ? connection.userTwo : connection.userOne,
      })),
      incomingRequests,
      outgoingRequests,
      blockedUsers,
      discoverableStudents,
    };
  } catch (error) {
    logServerError("getConnectionsPageData", error, { userId });

    if (!isRecoverableRuntimeError(error)) {
      throw error;
    }

    return getEmptyConnectionsPageData();
  }
}

export async function startDirectConversation(input: {
  currentUserId: string;
  targetUserId: string;
}) {
  await ensureDirectConversationPermissions(input);

  return prisma.$transaction(async (tx) => {
    const conversationId = await ensureDirectConversation(tx, input);

    await publishConversationUpdate(tx, {
      recipients: [input.currentUserId, input.targetUserId],
      conversationId,
      reason: "conversation-started",
    });

    return conversationId;
  });
}

export async function createGroup(input: {
  currentUserId: string;
  currentUserRole: Role;
  name: string;
  description: string;
  imageUrl?: string;
  category?: string;
  privacy: GroupPrivacy;
  joinPolicy: GroupJoinPolicy;
}) {
  if (!canCreateStudentGroup(input.currentUserRole)) {
    throw new Error("Only student accounts can create study groups.");
  }

  return prisma.$transaction(async (tx) => {
    const slug = await createUniqueGroupSlug(input.name);
    const effectiveJoinPolicy =
      input.privacy === GroupPrivacy.PRIVATE
        ? GroupJoinPolicy.APPROVAL
        : input.joinPolicy;

    const group = await tx.group.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        category: input.category,
        privacy: input.privacy,
        joinPolicy: effectiveJoinPolicy,
        createdById: input.currentUserId,
        members: {
          create: {
            userId: input.currentUserId,
            role: GroupMemberRole.OWNER,
            addedById: input.currentUserId,
          },
        },
      },
    });

    await tx.conversation.create({
      data: {
        type: ConversationType.GROUP,
        groupId: group.id,
        createdById: input.currentUserId,
        participants: {
          create: {
            userId: input.currentUserId,
            role: ConversationParticipantRole.ADMIN,
          },
        },
      },
    });

    return group;
  });
}

export async function updateGroup(input: {
  currentUserId: string;
  groupId: string;
  name: string;
  description: string;
  imageUrl?: string;
  category?: string;
  privacy: GroupPrivacy;
  joinPolicy: GroupJoinPolicy;
}) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: input.groupId,
        userId: input.currentUserId,
      },
    },
  });

  if (!membership || !canManageGroupMembership(membership.role)) {
    throw new Error("Only the group owner or an admin member can edit this group.");
  }

  return prisma.group.update({
    where: { id: input.groupId },
    data: {
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      category: input.category,
      privacy: input.privacy,
      joinPolicy:
        input.privacy === GroupPrivacy.PRIVATE
          ? GroupJoinPolicy.APPROVAL
          : input.joinPolicy,
    },
  });
}

export async function joinGroupOrCreateRequest(input: {
  currentUserId: string;
  groupId: string;
  message?: string;
}) {
  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    include: {
      members: true,
      conversation: true,
    },
  });

  if (!group) {
    throw new Error("This group no longer exists.");
  }

  const isMember = group.members.some((member) => member.userId === input.currentUserId);
  if (isMember) {
    throw new Error("You are already a member of this group.");
  }

  if (group.privacy === GroupPrivacy.PUBLIC && group.joinPolicy === GroupJoinPolicy.OPEN) {
    return prisma.$transaction(async (tx) => {
      const member = await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: input.currentUserId,
          addedById: group.createdById,
        },
      });

      if (group.conversation) {
        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: group.conversation.id,
              userId: input.currentUserId,
            },
          },
          create: {
            conversationId: group.conversation.id,
            userId: input.currentUserId,
          },
          update: {
            isArchived: false,
          },
        });
      }

      return { type: "joined" as const, member };
    });
  }

  const request = await prisma.groupJoinRequest.upsert({
    where: {
      groupId_requesterId: {
        groupId: group.id,
        requesterId: input.currentUserId,
      },
    },
    create: {
      groupId: group.id,
      requesterId: input.currentUserId,
      message: input.message,
    },
    update: {
      status: GroupJoinRequestStatus.PENDING,
      message: input.message,
      reviewedById: null,
      reviewedAt: null,
    },
  });

  const requester = await findActiveCommunicationUser(input.currentUserId);

  await createNotification(prisma as TransactionClient, {
    userId: group.createdById,
    actorId: input.currentUserId,
    actor: requester ?? undefined,
    type: NotificationType.GROUP_JOIN_REQUEST,
    title: "New group join request",
    body: "A student requested access to your study group.",
    actionUrl: `/groups/${group.slug}`,
    metadata: {
      groupId: group.id,
      requestId: request.id,
    },
  });

  return { type: "requested" as const, request };
}

export async function reviewGroupJoinRequest(input: {
  currentUserId: string;
  requestId: string;
  status: "APPROVED" | "REJECTED";
}) {
  const request = await prisma.groupJoinRequest.findUnique({
    where: { id: input.requestId },
    include: {
      group: {
        include: {
          conversation: true,
        },
      },
      requester: {
        select: communicationUserSelect,
      },
    },
  });

  if (!request) {
    throw new Error("This join request no longer exists.");
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: request.groupId,
        userId: input.currentUserId,
      },
    },
  });

  if (!membership || !canManageGroupMembership(membership.role)) {
    throw new Error("Only group managers can review join requests.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.groupJoinRequest.update({
      where: { id: request.id },
      data: {
        status: input.status,
        reviewedById: input.currentUserId,
        reviewedAt: new Date(),
      },
    });

    if (input.status === GroupJoinRequestStatus.APPROVED) {
      await tx.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: request.groupId,
            userId: request.requesterId,
          },
        },
        create: {
          groupId: request.groupId,
          userId: request.requesterId,
          addedById: input.currentUserId,
        },
        update: {},
      });

      if (request.group.conversation) {
        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: request.group.conversation.id,
              userId: request.requesterId,
            },
          },
          create: {
            conversationId: request.group.conversation.id,
            userId: request.requesterId,
          },
          update: {
            isArchived: false,
          },
        });
      }
    }

    await createNotification(tx, {
      userId: request.requesterId,
      actorId: input.currentUserId,
      type:
        input.status === GroupJoinRequestStatus.APPROVED
          ? NotificationType.GROUP_JOIN_APPROVED
          : NotificationType.GROUP_JOIN_REJECTED,
      title:
        input.status === GroupJoinRequestStatus.APPROVED
          ? "Group request approved"
          : "Group request rejected",
      body:
        input.status === GroupJoinRequestStatus.APPROVED
          ? `You can now join the conversation in ${request.group.name}.`
          : `Your request to join ${request.group.name} was declined.`,
      actionUrl: `/groups/${request.group.slug}`,
      metadata: {
        groupId: request.group.id,
        requestId: request.id,
      },
    });

    return updatedRequest;
  });
}

export async function leaveGroup(input: { currentUserId: string; groupId: string }) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: input.groupId,
        userId: input.currentUserId,
      },
    },
    include: {
      group: {
        include: {
          members: {
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          },
          conversation: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of this group.");
  }

  return prisma.$transaction(async (tx) => {
    const otherMembers = membership.group.members.filter(
      (member) => member.userId !== input.currentUserId,
    );

    if (membership.role === GroupMemberRole.OWNER && otherMembers.length === 0) {
      await tx.group.delete({ where: { id: input.groupId } });
      return { deletedGroup: true };
    }

    if (membership.role === GroupMemberRole.OWNER && otherMembers.length > 0) {
      const nextOwner = otherMembers[0];
      await tx.groupMember.update({
        where: { id: nextOwner.id },
        data: { role: GroupMemberRole.OWNER },
      });
    }

    await tx.groupMember.delete({ where: { id: membership.id } });

    if (membership.group.conversation) {
      await tx.conversationParticipant.deleteMany({
        where: {
          conversationId: membership.group.conversation.id,
          userId: input.currentUserId,
        },
      });
    }

    return { deletedGroup: false };
  });
}

export async function removeGroupMember(input: {
  currentUserId: string;
  groupId: string;
  memberId: string;
}) {
  if (input.currentUserId === input.memberId) {
    throw new Error("Use leave group instead of removing yourself.");
  }

  const [currentMembership, targetMembership, group] = await Promise.all([
    prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: input.groupId,
          userId: input.currentUserId,
        },
      },
    }),
    prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: input.groupId,
          userId: input.memberId,
        },
      },
    }),
    prisma.group.findUnique({
      where: { id: input.groupId },
      include: { conversation: true },
    }),
  ]);

  if (!currentMembership || !canManageGroupMembership(currentMembership.role)) {
    throw new Error("Only group managers can remove members.");
  }

  if (!targetMembership) {
    throw new Error("This member is no longer in the group.");
  }

  if (targetMembership.role === GroupMemberRole.OWNER) {
    throw new Error("Transfer ownership before removing the current owner.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.groupMember.delete({ where: { id: targetMembership.id } });

    if (group?.conversation) {
      await tx.conversationParticipant.deleteMany({
        where: {
          conversationId: group.conversation.id,
          userId: input.memberId,
        },
      });
    }
  });
}

export async function sendConnectionRequest(input: {
  currentUserId: string;
  targetUserId: string;
}) {
  if (input.currentUserId === input.targetUserId) {
    throw new Error("You cannot send a connection request to yourself.");
  }

  const [currentUser, targetUser, blockRecord] = await Promise.all([
    findActiveCommunicationUser(input.currentUserId),
    findActiveCommunicationUser(input.targetUserId),
    checkBlockBetweenUsers(input.currentUserId, input.targetUserId),
  ]);

  if (!currentUser || !targetUser) {
    throw new Error("The selected student is no longer available.");
  }

  if (currentUser.role !== Role.STUDENT || targetUser.role !== Role.STUDENT) {
    throw new Error("Connections are available only between student accounts.");
  }

  if (blockRecord) {
    throw new Error("Connection requests are disabled because one user has blocked the other.");
  }

  const [userOneId, userTwoId] = canonicalizeUserPair(
    input.currentUserId,
    input.targetUserId,
  );
  const existingConnection = await prisma.userConnection.findUnique({
    where: {
      userOneId_userTwoId: {
        userOneId,
        userTwoId,
      },
    },
  });

  if (existingConnection) {
    throw new Error("You are already connected with this student.");
  }

  const reverseRequest = await prisma.connectionRequest.findUnique({
    where: {
      senderId_receiverId: {
        senderId: input.targetUserId,
        receiverId: input.currentUserId,
      },
    },
  });

  if (reverseRequest?.status === ConnectionRequestStatus.PENDING) {
    return respondToConnectionRequest({
      currentUserId: input.currentUserId,
      requestId: reverseRequest.id,
      action: "ACCEPT",
    });
  }

  const request = await prisma.connectionRequest.upsert({
    where: {
      senderId_receiverId: {
        senderId: input.currentUserId,
        receiverId: input.targetUserId,
      },
    },
    create: {
      senderId: input.currentUserId,
      receiverId: input.targetUserId,
      status: ConnectionRequestStatus.PENDING,
    },
    update: {
      status: ConnectionRequestStatus.PENDING,
      respondedAt: null,
    },
  });

  await createNotification(prisma as TransactionClient, {
    userId: input.targetUserId,
    actorId: input.currentUserId,
    actor: currentUser,
    type: NotificationType.CONNECTION_REQUEST,
    title: "New connection request",
    body: `${currentUser.name} wants to connect with you.`,
    actionUrl: "/connections",
    metadata: {
      requestId: request.id,
    },
  });

  return request;
}

export async function respondToConnectionRequest(input: {
  currentUserId: string;
  requestId: string;
  action: "ACCEPT" | "REJECT" | "CANCEL";
}) {
  const request = await prisma.connectionRequest.findUnique({
    where: { id: input.requestId },
    include: {
      sender: {
        select: communicationUserSelect,
      },
      receiver: {
        select: communicationUserSelect,
      },
    },
  });

  if (!request) {
    throw new Error("This connection request no longer exists.");
  }

  if (
    input.action === "CANCEL" &&
    request.senderId !== input.currentUserId
  ) {
    throw new Error("Only the sender can cancel this request.");
  }

  if (
    (input.action === "ACCEPT" || input.action === "REJECT") &&
    request.receiverId !== input.currentUserId
  ) {
    throw new Error("Only the receiver can review this request.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.action === "CANCEL") {
      return tx.connectionRequest.update({
        where: { id: request.id },
        data: {
          status: ConnectionRequestStatus.CANCELLED,
          respondedAt: new Date(),
        },
      });
    }

    if (input.action === "REJECT") {
      return tx.connectionRequest.update({
        where: { id: request.id },
        data: {
          status: ConnectionRequestStatus.REJECTED,
          respondedAt: new Date(),
        },
      });
    }

    const [userOneId, userTwoId] = canonicalizeUserPair(
      request.senderId,
      request.receiverId,
    );

    await tx.connectionRequest.update({
      where: { id: request.id },
      data: {
        status: ConnectionRequestStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    await tx.userConnection.upsert({
      where: {
        userOneId_userTwoId: {
          userOneId,
          userTwoId,
        },
      },
      create: {
        userOneId,
        userTwoId,
      },
      update: {},
    });

    const conversationId = await ensureDirectConversation(tx, {
      currentUserId: request.senderId,
      targetUserId: request.receiverId,
    });

    await createNotification(tx, {
      userId: request.senderId,
      actorId: request.receiverId,
      actor: request.receiver,
      type: NotificationType.CONNECTION_ACCEPTED,
      title: "Connection accepted",
      body: `${request.receiver.name} accepted your connection request.`,
      actionUrl: "/connections",
      metadata: {
        requestId: request.id,
      },
    });

    await publishConversationUpdate(tx, {
      recipients: [request.senderId, request.receiverId],
      conversationId,
      reason: "connection-accepted",
    });

    return request;
  });
}

export async function removeConnection(input: {
  currentUserId: string;
  targetUserId: string;
}) {
  const [userOneId, userTwoId] = canonicalizeUserPair(
    input.currentUserId,
    input.targetUserId,
  );

  const connection = await prisma.userConnection.findUnique({
    where: {
      userOneId_userTwoId: {
        userOneId,
        userTwoId,
      },
    },
  });

  if (!connection) {
    throw new Error("You are not connected with this user anymore.");
  }

  return prisma.userConnection.delete({ where: { id: connection.id } });
}

export async function blockUser(input: {
  currentUserId: string;
  targetUserId: string;
}) {
  if (input.currentUserId === input.targetUserId) {
    throw new Error("You cannot block yourself.");
  }

  const targetUser = await findActiveCommunicationUser(input.targetUserId);
  if (!targetUser) {
    throw new Error("The selected user is no longer available.");
  }

  const [userOneId, userTwoId] = canonicalizeUserPair(
    input.currentUserId,
    input.targetUserId,
  );

  return prisma.$transaction(async (tx) => {
    await tx.userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: input.currentUserId,
          blockedId: input.targetUserId,
        },
      },
      create: {
        blockerId: input.currentUserId,
        blockedId: input.targetUserId,
      },
      update: {},
    });

    await tx.userConnection.deleteMany({
      where: {
        userOneId,
        userTwoId,
      },
    });

    await tx.connectionRequest.deleteMany({
      where: {
        OR: [
          {
            senderId: input.currentUserId,
            receiverId: input.targetUserId,
          },
          {
            senderId: input.targetUserId,
            receiverId: input.currentUserId,
          },
        ],
      },
    });
  });
}

export async function unblockUser(input: {
  currentUserId: string;
  targetUserId: string;
}) {
  return prisma.userBlock.deleteMany({
    where: {
      blockerId: input.currentUserId,
      blockedId: input.targetUserId,
    },
  });
}

export async function sendMessage(input: {
  currentUserId: string;
  conversationId: string;
  content: string;
}) {
  const participant = await getConversationParticipantRecord(
    input.currentUserId,
    input.conversationId,
  );

  if (!participant) {
    throw new Error("You no longer have access to this conversation.");
  }

  if (participant.conversation.type === ConversationType.DIRECT) {
    const targetParticipant = participant.conversation.participants.find(
      (item) => item.userId !== input.currentUserId,
    );

    if (!targetParticipant) {
      throw new Error("This direct conversation is missing the second participant.");
    }

    await ensureDirectConversationPermissions({
      currentUserId: input.currentUserId,
      targetUserId: targetParticipant.userId,
    });
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.directMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.currentUserId,
        content: input.content,
      },
      include: {
        sender: {
          select: communicationUserSelect,
        },
      },
    });

    const participantIds = participant.conversation.participants.map((item) => item.userId);
    const now = new Date();
    await tx.messageReadState.createMany({
      data: participantIds.map((userId) => ({
        messageId: message.id,
        userId,
        deliveredAt: now,
        readAt: userId === input.currentUserId ? now : null,
      })),
    });

    await tx.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: now,
        lastMessagePreview: createConversationPreview(input.content),
      },
    });

    await publishCommunicationRealtimeEvent(tx, {
      type: "message:new",
      recipients: participantIds,
      conversationId: input.conversationId,
      payload: {
        message: {
          id: message.id,
          conversationId: input.conversationId,
          senderId: input.currentUserId,
          content: message.content,
          createdAt: toIsoString(message.createdAt),
          sender: serializeRealtimeUser(message.sender),
        },
      },
    });

    await publishConversationUpdate(tx, {
      recipients: participantIds,
      conversationId: input.conversationId,
      reason: "message",
    });

    const notificationTitle =
      participant.conversation.type === ConversationType.GROUP
        ? `New group message in ${participant.conversation.group?.name ?? "your group"}`
        : "New direct message";

    const notificationBody =
      participant.conversation.type === ConversationType.GROUP
        ? `${message.sender.name} sent a new message to the group chat.`
        : `${message.sender.name} sent you a new message.`;

    await Promise.all(
      participant.conversation.participants
        .filter((item) => item.userId !== input.currentUserId)
        .map((item) =>
          createNotification(tx, {
            userId: item.userId,
            actorId: input.currentUserId,
            actor: message.sender,
            type: NotificationType.DIRECT_MESSAGE,
            title: notificationTitle,
            body: notificationBody,
            actionUrl: `/messages/${input.conversationId}`,
            metadata: {
              conversationId: input.conversationId,
              messageId: message.id,
            },
          }),
        ),
    );

    return message;
  });
}

export async function startCall(input: {
  currentUserId: string;
  conversationId: string;
  callType: CallType;
}) {
  const participant = await getConversationParticipantRecord(
    input.currentUserId,
    input.conversationId,
  );

  if (!participant) {
    throw new Error("You do not have access to this conversation.");
  }

  if (!canStartCallForConversation(participant.conversation.type)) {
    throw new Error("Calls are available only inside direct conversations in this MVP.");
  }

  const otherParticipant = participant.conversation.participants.find(
    (item) => item.userId !== input.currentUserId,
  );

  if (!otherParticipant) {
    throw new Error("This direct conversation is missing the second participant.");
  }

  await ensureDirectConversationPermissions({
    currentUserId: input.currentUserId,
    targetUserId: otherParticipant.userId,
  });

  const existingLiveCall = await prisma.callSession.findFirst({
    where: {
      conversationId: input.conversationId,
      status: {
        in: [CallSessionStatus.RINGING, CallSessionStatus.ACTIVE],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingLiveCall) {
    throw new Error("There is already an active call in this conversation.");
  }

  return prisma.$transaction(async (tx) => {
    const caller =
      participant.conversation.participants.find(
        (item) => item.userId === input.currentUserId,
      )?.user ?? null;

    const callSession = await tx.callSession.create({
      data: {
        conversationId: input.conversationId,
        initiatedById: input.currentUserId,
        callType: input.callType,
        participants: {
          create: [
            {
              userId: input.currentUserId,
              status: CallParticipantStatus.JOINED,
              joinedAt: new Date(),
            },
            {
              userId: otherParticipant.userId,
              status: CallParticipantStatus.INVITED,
            },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: communicationUserSelect,
            },
          },
        },
      },
    });

    await createNotification(tx, {
      userId: otherParticipant.userId,
      actorId: input.currentUserId,
      actor: caller ?? undefined,
      type: NotificationType.INCOMING_CALL,
      title: input.callType === CallType.VIDEO ? "Incoming video call" : "Incoming audio call",
      body: "Open the conversation to accept or decline the call.",
      actionUrl: `/messages/${input.conversationId}`,
      metadata: {
        callSessionId: callSession.id,
      },
    });

    await publishCommunicationRealtimeEvent(tx, {
      type: "call:incoming",
      recipients: [otherParticipant.userId],
      conversationId: input.conversationId,
      callSessionId: callSession.id,
      payload: {
        call: serializeCallForRealtime(callSession),
      },
    });

    await publishConversationUpdate(tx, {
      recipients: participant.conversation.participants.map((item) => item.userId),
      conversationId: input.conversationId,
      reason: "call-ringing",
      callSessionId: callSession.id,
    });

    return callSession;
  });
}

export async function updateCallParticipant(input: {
  currentUserId: string;
  callSessionId: string;
  action: "ACCEPT" | "DECLINE" | "JOIN" | "LEAVE" | "END" | "MISS";
}) {
  const callSession = await prisma.callSession.findUnique({
    where: { id: input.callSessionId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: communicationUserSelect,
              },
            },
          },
        },
      },
      participants: {
        include: {
          user: {
            select: communicationUserSelect,
          },
        },
      },
    },
  });

  if (!callSession) {
    throw new Error("This call session is no longer available.");
  }

  const currentParticipant = callSession.participants.find(
    (participant) => participant.userId === input.currentUserId,
  );

  if (!currentParticipant) {
    throw new Error("You are not part of this call session.");
  }

  const otherParticipants = callSession.participants.filter(
    (participant) => participant.userId !== input.currentUserId,
  );

  const now = new Date();
  const participantUserIds = callSession.participants.map((participant) => participant.userId);

  return prisma.$transaction(async (tx) => {
    if (input.action === "ACCEPT" || input.action === "JOIN") {
      await tx.callParticipant.update({
        where: { id: currentParticipant.id },
        data: {
          status: CallParticipantStatus.JOINED,
          joinedAt: currentParticipant.joinedAt ?? now,
          leftAt: null,
        },
      });

      const updatedSession = await tx.callSession.update({
        where: { id: callSession.id },
        data: {
          status: CallSessionStatus.ACTIVE,
          startedAt: callSession.startedAt ?? now,
        },
        include: {
          participants: {
            include: {
              user: {
                select: communicationUserSelect,
              },
            },
          },
        },
      });

      if (input.action === "ACCEPT" && callSession.initiatedById !== input.currentUserId) {
        await createNotification(tx, {
          userId: callSession.initiatedById,
          actorId: input.currentUserId,
          actor: currentParticipant.user,
          type: NotificationType.CALL_ACCEPTED,
          title: "Call accepted",
          body: `${currentParticipant.user.name} joined your call.`,
          actionUrl: `/messages/${callSession.conversationId}`,
          metadata: {
            callSessionId: callSession.id,
          },
        });
      }

      await publishCommunicationRealtimeEvent(tx, {
        type: "call:accepted",
        recipients: participantUserIds,
        conversationId: callSession.conversationId,
        callSessionId: callSession.id,
        payload: {
          call: serializeCallForRealtime({
            ...updatedSession,
            conversationId: callSession.conversationId,
            initiatedById: callSession.initiatedById,
          }),
        },
      });

      await publishConversationUpdate(tx, {
        recipients: participantUserIds,
        conversationId: callSession.conversationId,
        reason: input.action === "ACCEPT" ? "call-accepted" : "call-joined",
        callSessionId: callSession.id,
      });

      return updatedSession;
    }

    if (input.action === "DECLINE" || input.action === "MISS") {
      const participantStatus =
        input.action === "DECLINE"
          ? CallParticipantStatus.DECLINED
          : CallParticipantStatus.MISSED;
      const sessionStatus =
        input.action === "DECLINE"
          ? CallSessionStatus.DECLINED
          : CallSessionStatus.MISSED;

      await tx.callParticipant.update({
        where: { id: currentParticipant.id },
        data: {
          status: participantStatus,
          leftAt: now,
        },
      });

      const updatedSession = await tx.callSession.update({
        where: { id: callSession.id },
        data: {
          status: sessionStatus,
          endedAt: now,
        },
        include: {
          participants: {
            include: {
              user: {
                select: communicationUserSelect,
              },
            },
          },
        },
      });

      if (callSession.initiatedById !== input.currentUserId) {
        await createNotification(tx, {
          userId: callSession.initiatedById,
          actorId: input.currentUserId,
          actor: currentParticipant.user,
          type:
            input.action === "DECLINE"
              ? NotificationType.CALL_DECLINED
              : NotificationType.MISSED_CALL,
          title: input.action === "DECLINE" ? "Call declined" : "Missed call",
          body:
            input.action === "DECLINE"
              ? "The other participant declined your call."
              : "The call was missed before anyone joined.",
          actionUrl: `/messages/${callSession.conversationId}`,
          metadata: {
            callSessionId: callSession.id,
          },
        });
      }

      await publishCommunicationRealtimeEvent(tx, {
        type: input.action === "DECLINE" ? "call:declined" : "call:missed",
        recipients: participantUserIds,
        conversationId: callSession.conversationId,
        callSessionId: callSession.id,
        payload: {
          call: serializeCallForRealtime({
            ...updatedSession,
            conversationId: callSession.conversationId,
            initiatedById: callSession.initiatedById,
          }),
        },
      });

      await publishConversationUpdate(tx, {
        recipients: participantUserIds,
        conversationId: callSession.conversationId,
        reason: input.action === "DECLINE" ? "call-declined" : "call-missed",
        callSessionId: callSession.id,
      });

      return updatedSession;
    }

    if (input.action === "LEAVE") {
      await tx.callParticipant.update({
        where: { id: currentParticipant.id },
        data: {
          status: CallParticipantStatus.LEFT,
          leftAt: now,
        },
      });

      const remainingJoinedParticipants = callSession.participants.filter(
        (participant) =>
          participant.userId !== input.currentUserId &&
          participant.status === CallParticipantStatus.JOINED,
      );

      const updatedSession =
        remainingJoinedParticipants.length === 0
          ? await tx.callSession.update({
              where: { id: callSession.id },
              data: {
                status: CallSessionStatus.ENDED,
                endedAt: now,
              },
              include: {
                participants: {
                  include: {
                    user: {
                      select: communicationUserSelect,
                    },
                  },
                },
              },
            })
          : await tx.callSession.findUniqueOrThrow({
              where: { id: callSession.id },
              include: {
                participants: {
                  include: {
                    user: {
                      select: communicationUserSelect,
                    },
                  },
                },
              },
            });

      await publishCommunicationRealtimeEvent(tx, {
        type: "call:ended",
        recipients: participantUserIds,
        conversationId: callSession.conversationId,
        callSessionId: callSession.id,
        payload: {
          call: serializeCallForRealtime({
            ...updatedSession,
            conversationId: callSession.conversationId,
            initiatedById: callSession.initiatedById,
          }),
        },
      });

      await publishConversationUpdate(tx, {
        recipients: participantUserIds,
        conversationId: callSession.conversationId,
        reason: "call-left",
        callSessionId: callSession.id,
      });

      return updatedSession;
    }

    const updatedSession = await tx.callSession.update({
      where: { id: callSession.id },
      data: {
        status:
          callSession.status === CallSessionStatus.RINGING
            ? CallSessionStatus.CANCELLED
            : CallSessionStatus.ENDED,
        endedAt: now,
      },
    });

    await tx.callParticipant.updateMany({
      where: {
        callSessionId: callSession.id,
        status: {
          in: [CallParticipantStatus.INVITED, CallParticipantStatus.JOINED],
        },
      },
      data: {
        status:
          callSession.status === CallSessionStatus.RINGING
            ? CallParticipantStatus.MISSED
            : CallParticipantStatus.LEFT,
        leftAt: now,
      },
    });

    await Promise.all(
      otherParticipants.map((participant) =>
        createNotification(tx, {
          userId: participant.userId,
          actorId: input.currentUserId,
          actor: currentParticipant.user,
          type: NotificationType.CALL_ENDED,
          title: "Call ended",
          body: "The active call has ended.",
          actionUrl: `/messages/${callSession.conversationId}`,
          metadata: {
            callSessionId: callSession.id,
          },
        }),
      ),
    );

    const refreshedSession = await tx.callSession.findUniqueOrThrow({
      where: { id: updatedSession.id },
      include: {
        participants: {
          include: {
            user: {
              select: communicationUserSelect,
            },
          },
        },
      },
    });

    await publishCommunicationRealtimeEvent(tx, {
      type: "call:ended",
      recipients: participantUserIds,
      conversationId: callSession.conversationId,
      callSessionId: callSession.id,
      payload: {
        call: serializeCallForRealtime({
          ...refreshedSession,
          conversationId: callSession.conversationId,
          initiatedById: callSession.initiatedById,
        }),
      },
    });

    await publishConversationUpdate(tx, {
      recipients: participantUserIds,
      conversationId: callSession.conversationId,
      reason: callSession.status === CallSessionStatus.RINGING ? "call-cancelled" : "call-ended",
      callSessionId: callSession.id,
    });

    return refreshedSession;
  });
}

export async function getCallSignals(input: {
  currentUserId: string;
  callSessionId: string;
  since?: string;
}) {
  const participant = await prisma.callParticipant.findUnique({
    where: {
      callSessionId_userId: {
        callSessionId: input.callSessionId,
        userId: input.currentUserId,
      },
    },
  });

  if (!participant) {
    throw new Error("You do not have access to this call session.");
  }

  const sinceDate = input.since ? new Date(input.since) : undefined;

  return prisma.callSignal.findMany({
    where: {
      callSessionId: input.callSessionId,
      ...(sinceDate && !Number.isNaN(sinceDate.getTime())
        ? {
            createdAt: {
              gt: sinceDate,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: communicationUserSelect,
      },
    },
  });
}

export async function createCallSignal(input: {
  currentUserId: string;
  callSessionId: string;
  type: SignalingEventType;
  payload: unknown;
}) {
  const participant = await prisma.callParticipant.findUnique({
    where: {
      callSessionId_userId: {
        callSessionId: input.callSessionId,
        userId: input.currentUserId,
      },
    },
    include: {
      callSession: true,
    },
  });

  if (!participant) {
    throw new Error("You do not have access to this call session.");
  }

  return prisma.$transaction(async (tx) => {
    const signal = await tx.callSignal.create({
      data: {
        callSessionId: input.callSessionId,
        senderId: input.currentUserId,
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
      },
      include: {
        sender: {
          select: communicationUserSelect,
        },
      },
    });

    const recipients = await tx.callParticipant.findMany({
      where: {
        callSessionId: input.callSessionId,
        userId: {
          not: input.currentUserId,
        },
      },
      select: {
        userId: true,
      },
    });

    await publishCommunicationRealtimeEvent(tx, {
      type: "call:signal",
      recipients: recipients.map((item) => item.userId),
      conversationId: participant.callSession.conversationId,
      callSessionId: input.callSessionId,
      payload: {
        reason: input.type,
        signal: serializeCallSignalForRealtime(signal),
      },
    });

    return signal;
  });
}

export async function markNotificationRead(input: {
  currentUserId: string;
  notificationId: string;
}) {
  const notification = await prisma.notification.findUnique({
    where: { id: input.notificationId },
    select: {
      id: true,
      userId: true,
      isRead: true,
    },
  });

  if (!notification || notification.userId !== input.currentUserId) {
    throw new Error("This notification is no longer available.");
  }

  if (notification.isRead) {
    return notification;
  }

  return prisma.$transaction(async (tx) => {
    const updatedNotification = await tx.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
      },
    });

    await publishCommunicationRealtimeEvent(tx, {
      type: "notification:read",
      recipients: [input.currentUserId],
      payload: {
        notificationId: notification.id,
      },
    });

    return updatedNotification;
  });
}
