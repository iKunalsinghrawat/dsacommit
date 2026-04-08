/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChangeRequestOperationType,
  ChangeRequestStatus,
  ChangeRequestEntityType,
  Role,
  RoadmapLevel,
  UserPortal,
} from "@/generated/prisma/enums";

const getCurrentUser = vi.fn();
const revalidatePath = vi.fn();
const submitTopicChangeRequest = vi.fn();
const approveChangeRequest = vi.fn();
const rejectChangeRequest = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/server/content-change-requests", () => ({
  submitTopicChangeRequest,
  submitRoadmapItemChangeRequest: vi.fn(),
  submitProblemChangeRequest: vi.fn(),
  approveChangeRequest,
  rejectChangeRequest,
}));

const {
  reviewChangeRequestAction,
  submitTopicChangeRequestAction,
} = await import("@/lib/actions/content-approval-actions");

describe("content approval actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets an allowed user submit a pending topic request", async () => {
    getCurrentUser.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      accessGrants: [UserPortal.TOPICS],
    });
    submitTopicChangeRequest.mockResolvedValue({ id: "request-1" });

    const formData = new FormData();
    formData.set("operationType", ChangeRequestOperationType.CREATE);
    formData.set("summary", "Create topic: Bit manipulation");
    formData.set("name", "Bit Manipulation");
    formData.set("slug", "bit-manipulation");
    formData.set("level", RoadmapLevel.INTERMEDIATE);
    formData.set("sortOrder", "12");
    formData.set(
      "conceptSummary",
      "Introduce masking, shifts, and parity checks as reusable interview tools.",
    );
    formData.set(
      "notes",
      "Cover set, clear, toggle, and counting bits with direct binary reasoning.",
    );
    formData.set("difficultyProgression", "Bit masks\nPrefix XOR");
    formData.set("revisionChecklist", "Trace binary\nCheck edge cases");
    formData.set(
      "quiz",
      JSON.stringify([
        { question: "What does x & 1 tell you?", answer: "Whether x is odd." },
      ]),
    );
    formData.set("estimatedHours", "7");
    formData.set("icon", "Binary");
    formData.set("accentColor", "emerald");

    const result = await submitTopicChangeRequestAction(formData);

    expect(result.ok).toBe(true);
    expect(submitTopicChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedById: "student-1",
        operationType: ChangeRequestOperationType.CREATE,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/approvals");
  });

  it("blocks users who do not have portal access from submitting content requests", async () => {
    getCurrentUser.mockResolvedValue({
      id: "company-1",
      role: Role.COMPANY,
      accessGrants: [UserPortal.COMPANIES],
    });

    const formData = new FormData();
    formData.set("operationType", ChangeRequestOperationType.CREATE);
    formData.set("name", "Blocked Topic");

    const result = await submitTopicChangeRequestAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/cannot submit requests/i);
    expect(submitTopicChangeRequest).not.toHaveBeenCalled();
  });

  it("rejects non-admin review attempts", async () => {
    getCurrentUser.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      accessGrants: [UserPortal.TOPICS],
    });

    const formData = new FormData();
    formData.set("requestId", "request-1");
    formData.set("status", ChangeRequestStatus.APPROVED);

    const result = await reviewChangeRequestAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/only admins/i);
    expect(approveChangeRequest).not.toHaveBeenCalled();
  });

  it("lets an admin approve a pending request", async () => {
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      accessGrants: [UserPortal.ADMIN_PORTAL],
    });
    approveChangeRequest.mockResolvedValue({
      id: "request-1",
      entityType: ChangeRequestEntityType.TOPIC,
    });

    const formData = new FormData();
    formData.set("requestId", "request-1");
    formData.set("status", ChangeRequestStatus.APPROVED);

    const result = await reviewChangeRequestAction(formData);

    expect(result.ok).toBe(true);
    expect(approveChangeRequest).toHaveBeenCalledWith({
      requestId: "request-1",
      reviewerId: "admin-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/approvals");
  });

  it("requires a rejection reason when an admin rejects a request", async () => {
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      accessGrants: [UserPortal.ADMIN_PORTAL],
    });

    const formData = new FormData();
    formData.set("requestId", "request-1");
    formData.set("status", ChangeRequestStatus.REJECTED);

    const result = await reviewChangeRequestAction(formData);

    expect(result.ok).toBe(false);
    expect(rejectChangeRequest).not.toHaveBeenCalled();
    expect(result.fieldErrors?.rejectionReason?.[0]).toBeTruthy();
  });
});
