/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CallType, GroupJoinPolicy, GroupPrivacy, Role } from "@/generated/prisma/enums";

const requirePortalAccess = vi.fn();
const revalidatePath = vi.fn();

const createGroup = vi.fn();
const sendConnectionRequest = vi.fn();
const startCall = vi.fn();
const updateCallParticipant = vi.fn();

vi.mock("@/lib/auth", () => ({
  requirePortalAccess,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/server/communication-service", () => ({
  createGroup,
  updateGroup: vi.fn(),
  joinGroupOrCreateRequest: vi.fn(),
  leaveGroup: vi.fn(),
  removeGroupMember: vi.fn(),
  reviewGroupJoinRequest: vi.fn(),
  sendConnectionRequest,
  respondToConnectionRequest: vi.fn(),
  removeConnection: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  sendMessage: vi.fn(),
  startCall,
  startDirectConversation: vi.fn(),
  updateCallParticipant,
  markNotificationRead: vi.fn(),
}));

const {
  createGroupAction,
  sendConnectionRequestAction,
  startCallAction,
  updateCallParticipantAction,
} = await import("@/lib/actions/communication-actions");

describe("communication actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requirePortalAccess.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
    });
  });

  it("creates a group and returns the target redirect path", async () => {
    createGroup.mockResolvedValue({
      id: "group-1",
      slug: "binary-search-circle",
    });

    const formData = new FormData();
    formData.set("name", "Binary Search Circle");
    formData.set("description", "Focused daily review room for boundaries and invariants.");
    formData.set("privacy", GroupPrivacy.PUBLIC);
    formData.set("joinPolicy", GroupJoinPolicy.OPEN);

    const result = await createGroupAction(formData);

    expect(result.ok).toBe(true);
    expect(result.redirectTo).toBe("/groups/binary-search-circle");
    expect(revalidatePath).toHaveBeenCalledWith("/groups/binary-search-circle");
  });

  it("rejects invalid connection request payloads before calling the service", async () => {
    const result = await sendConnectionRequestAction(new FormData());

    expect(result.ok).toBe(false);
    expect(sendConnectionRequest).not.toHaveBeenCalled();
  });

  it("surfaces service errors when starting a call", async () => {
    startCall.mockRejectedValue(new Error("There is already an active call in this conversation."));

    const formData = new FormData();
    formData.set("conversationId", "conversation-1");
    formData.set("callType", CallType.VIDEO);

    const result = await startCallAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("already an active call");
  });

  it("returns a clean success message for call participant updates", async () => {
    updateCallParticipant.mockResolvedValue({
      id: "call-1",
      conversationId: "conversation-1",
    });

    const formData = new FormData();
    formData.set("callSessionId", "call-1");
    formData.set("action", "LEAVE");

    const result = await updateCallParticipantAction(formData);

    expect(result.ok).toBe(true);
    expect(result.message).toContain("left the call");
    expect(revalidatePath).toHaveBeenCalledWith("/messages/conversation-1");
  });
});
