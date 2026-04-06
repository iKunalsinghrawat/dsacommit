/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommunityPostType, Role } from "@/generated/prisma/enums";

const getCurrentUser = vi.fn();
const revalidatePath = vi.fn();
const prisma = {
  communityPost: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
} as const;

vi.mock("@/lib/auth", () => ({
  getCurrentUser,
  requireRole: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

const { deleteCommunityPostAction, updateCommunityPostAction } = await import(
  "@/lib/actions/platform-actions"
);

describe("community post ownership actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets the owner edit their own post", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });
    prisma.communityPost.findUnique.mockResolvedValue({ id: "post-1", authorId: "user-1" });
    prisma.communityPost.update.mockResolvedValue({});

    const formData = new FormData();
    formData.set("postId", "post-1");
    formData.set("type", CommunityPostType.DISCUSSION);
    formData.set("title", "Sharpening binary search boundaries");
    formData.set("content", "I rewrote the post with cleaner context and examples for the community.");

    const result = await updateCommunityPostAction(formData);

    expect(result.ok).toBe(true);
    expect(prisma.communityPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-1" },
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/community");
  });

  it("blocks non-owners from editing another user's post", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-2", role: Role.STUDENT });
    prisma.communityPost.findUnique.mockResolvedValue({ id: "post-1", authorId: "user-1" });

    const formData = new FormData();
    formData.set("postId", "post-1");
    formData.set("type", CommunityPostType.DISCUSSION);
    formData.set("title", "Trying to hijack a thread");
    formData.set("content", "This should not be accepted because the viewer does not own the post.");

    const result = await updateCommunityPostAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/only edit/i);
    expect(prisma.communityPost.update).not.toHaveBeenCalled();
  });

  it("lets the owner delete their own post", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", role: Role.STUDENT });
    prisma.communityPost.findUnique.mockResolvedValue({ id: "post-1", authorId: "user-1" });
    prisma.communityPost.delete.mockResolvedValue({});

    const formData = new FormData();
    formData.set("postId", "post-1");

    const result = await deleteCommunityPostAction(formData);

    expect(result.ok).toBe(true);
    expect(prisma.communityPost.delete).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
  });

  it("blocks non-owners from deleting another user's post", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-2", role: Role.STUDENT });
    prisma.communityPost.findUnique.mockResolvedValue({ id: "post-1", authorId: "user-1" });

    const formData = new FormData();
    formData.set("postId", "post-1");

    const result = await deleteCommunityPostAction(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not allowed/i);
    expect(prisma.communityPost.delete).not.toHaveBeenCalled();
  });
});
