"use server";

import { revalidatePath } from "next/cache";

import { UserPortal } from "@/generated/prisma/enums";
import { requirePortalAccess } from "@/lib/auth";
import {
  blockUserSchema,
  connectionRequestSchema,
  createGroupSchema,
  directConversationSchema,
  groupJoinRequestSchema,
  groupMembershipSchema,
  markNotificationReadSchema,
  removeConnectionSchema,
  removeGroupMemberSchema,
  respondConnectionRequestSchema,
  reviewGroupJoinRequestSchema,
  sendMessageSchema,
  startCallSchema,
  unblockUserSchema,
  updateCallParticipantSchema,
  updateGroupSchema,
} from "@/lib/validators/communication";
import {
  blockUser,
  createGroup,
  joinGroupOrCreateRequest,
  leaveGroup,
  markNotificationRead,
  removeConnection,
  removeGroupMember,
  respondToConnectionRequest,
  reviewGroupJoinRequest,
  sendConnectionRequest,
  sendMessage,
  startCall,
  startDirectConversation,
  unblockUser,
  updateCallParticipant,
  updateGroup,
} from "@/server/communication-service";

export type CommunicationActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  redirectTo?: string;
  conversationId?: string;
  groupSlug?: string;
};

function parseOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function validationError(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): CommunicationActionState {
  return {
    ok: false,
    error: message,
    fieldErrors,
  };
}

function revalidateCommunicationShell() {
  revalidatePath("/messages");
  revalidatePath("/groups");
  revalidatePath("/connections");
}

export async function startDirectConversationAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.MESSAGES);
  const parsed = directConversationSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Choose a valid account first.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const conversationId = await startDirectConversation({
      currentUserId: user.id,
      targetUserId: parsed.data.targetUserId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "Conversation ready.",
      redirectTo: `/messages/${conversationId}`,
      conversationId,
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to open this conversation right now.",
    );
  }
}

export async function createGroupAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.GROUPS);
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl: parseOptionalFormValue(formData, "imageUrl"),
    category: parseOptionalFormValue(formData, "category"),
    privacy: formData.get("privacy"),
    joinPolicy: formData.get("joinPolicy"),
  });

  if (!parsed.success) {
    return validationError(
      "Please fix the highlighted group fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const group = await createGroup({
      currentUserId: user.id,
      currentUserRole: user.role,
      ...parsed.data,
    });

    revalidateCommunicationShell();
    revalidatePath(`/groups/${group.slug}`);

    return {
      ok: true,
      message: "Study group created.",
      redirectTo: `/groups/${group.slug}`,
      groupSlug: group.slug,
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to create this study group right now.",
    );
  }
}

export async function updateGroupAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.GROUPS);
  const parsed = updateGroupSchema.safeParse({
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl: parseOptionalFormValue(formData, "imageUrl"),
    category: parseOptionalFormValue(formData, "category"),
    privacy: formData.get("privacy"),
    joinPolicy: formData.get("joinPolicy"),
  });

  if (!parsed.success) {
    return validationError(
      "Please fix the highlighted group fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const group = await updateGroup({
      currentUserId: user.id,
      ...parsed.data,
    });

    revalidateCommunicationShell();
    revalidatePath(`/groups/${group.slug}`);

    return {
      ok: true,
      message: "Group details updated.",
      groupSlug: group.slug,
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to update this group right now.",
    );
  }
}

export async function joinGroupAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.GROUPS);
  const parsed = groupJoinRequestSchema.safeParse({
    groupId: formData.get("groupId"),
    message: parseOptionalFormValue(formData, "message"),
  });

  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Unable to process this join request.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const result = await joinGroupOrCreateRequest({
      currentUserId: user.id,
      ...parsed.data,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message:
        result.type === "joined"
          ? "You joined the group."
          : "Your join request has been sent.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to join this group right now.",
    );
  }
}

export async function reviewGroupJoinRequestAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.GROUPS);
  const parsed = reviewGroupJoinRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Unable to review this join request.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await reviewGroupJoinRequest({
      currentUserId: user.id,
      requestId: parsed.data.requestId,
      status: parsed.data.status,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message:
        parsed.data.status === "APPROVED"
          ? "Join request approved."
          : "Join request rejected.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to review this join request right now.",
    );
  }
}

export async function leaveGroupAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.GROUPS);
  const parsed = groupMembershipSchema.safeParse({
    groupId: formData.get("groupId"),
  });

  if (!parsed.success) {
    return validationError("Invalid leave-group request.");
  }

  try {
    const result = await leaveGroup({
      currentUserId: user.id,
      groupId: parsed.data.groupId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: result.deletedGroup
        ? "The group has been removed because you were the last member."
        : "You left the group.",
      redirectTo: "/groups",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to leave this group right now.",
    );
  }
}

export async function removeGroupMemberAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.GROUPS);
  const parsed = removeGroupMemberSchema.safeParse({
    groupId: formData.get("groupId"),
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return validationError("Invalid remove-member request.");
  }

  try {
    await removeGroupMember({
      currentUserId: user.id,
      groupId: parsed.data.groupId,
      memberId: parsed.data.memberId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "Member removed from the group.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to remove this member right now.",
    );
  }
}

export async function sendConnectionRequestAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.CONNECTIONS);
  const parsed = connectionRequestSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return validationError("Choose a valid student first.");
  }

  try {
    await sendConnectionRequest({
      currentUserId: user.id,
      targetUserId: parsed.data.targetUserId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "Connection request sent.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to send this connection request.",
    );
  }
}

export async function respondConnectionRequestAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.CONNECTIONS);
  const parsed = respondConnectionRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return validationError("Invalid connection request review.");
  }

  try {
    await respondToConnectionRequest({
      currentUserId: user.id,
      requestId: parsed.data.requestId,
      action: parsed.data.action,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message:
        parsed.data.action === "ACCEPT"
          ? "Connection accepted."
          : parsed.data.action === "REJECT"
            ? "Connection request rejected."
            : "Connection request cancelled.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to update this request right now.",
    );
  }
}

export async function removeConnectionAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.CONNECTIONS);
  const parsed = removeConnectionSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return validationError("Invalid remove-connection request.");
  }

  try {
    await removeConnection({
      currentUserId: user.id,
      targetUserId: parsed.data.targetUserId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "Connection removed.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to remove this connection right now.",
    );
  }
}

export async function blockUserAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.CONNECTIONS);
  const parsed = blockUserSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return validationError("Invalid block request.");
  }

  try {
    await blockUser({
      currentUserId: user.id,
      targetUserId: parsed.data.targetUserId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "User blocked.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to block this user right now.",
    );
  }
}

export async function unblockUserAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.CONNECTIONS);
  const parsed = unblockUserSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return validationError("Invalid unblock request.");
  }

  try {
    await unblockUser({
      currentUserId: user.id,
      targetUserId: parsed.data.targetUserId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "User unblocked.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to unblock this user right now.",
    );
  }
}

export async function sendMessageAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.MESSAGES);
  const parsed = sendMessageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Type a message first.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await sendMessage({
      currentUserId: user.id,
      conversationId: parsed.data.conversationId,
      content: parsed.data.content,
    });

    revalidateCommunicationShell();
    revalidatePath(`/messages/${parsed.data.conversationId}`);

    return {
      ok: true,
      message: "Message sent.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to send this message right now.",
    );
  }
}

export async function startCallAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.MESSAGES);
  const parsed = startCallSchema.safeParse({
    conversationId: formData.get("conversationId"),
    callType: formData.get("callType"),
  });

  if (!parsed.success) {
    return validationError("Invalid call request.");
  }

  try {
    await startCall({
      currentUserId: user.id,
      conversationId: parsed.data.conversationId,
      callType: parsed.data.callType,
    });

    revalidateCommunicationShell();
    revalidatePath(`/messages/${parsed.data.conversationId}`);

    return {
      ok: true,
      message:
        parsed.data.callType === "VIDEO"
          ? "Video call started."
          : "Audio call started.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to start this call right now.",
    );
  }
}

export async function updateCallParticipantAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.MESSAGES);
  const parsed = updateCallParticipantSchema.safeParse({
    callSessionId: formData.get("callSessionId"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return validationError("Invalid call update request.");
  }

  try {
    const session = await updateCallParticipant({
      currentUserId: user.id,
      callSessionId: parsed.data.callSessionId,
      action: parsed.data.action,
    });

    revalidateCommunicationShell();
    revalidatePath(`/messages/${session.conversationId}`);

    return {
      ok: true,
      message:
        parsed.data.action === "DECLINE"
          ? "Call declined."
          : parsed.data.action === "LEAVE"
            ? "You left the call."
            : parsed.data.action === "END"
              ? "Call ended."
              : "Call updated.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to update this call right now.",
    );
  }
}

export async function markNotificationReadAction(
  formData: FormData,
): Promise<CommunicationActionState> {
  const user = await requirePortalAccess(UserPortal.MESSAGES);
  const parsed = markNotificationReadSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });

  if (!parsed.success) {
    return validationError("Invalid notification request.");
  }

  try {
    await markNotificationRead({
      currentUserId: user.id,
      notificationId: parsed.data.notificationId,
    });

    revalidateCommunicationShell();

    return {
      ok: true,
      message: "Notification marked as read.",
    };
  } catch (error) {
    return validationError(
      error instanceof Error ? error.message : "Unable to update this notification right now.",
    );
  }
}
