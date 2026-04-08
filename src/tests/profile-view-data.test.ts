/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileVisibility, Role } from "@/generated/prisma/enums";

const prisma = {
  user: {
    findUnique: vi.fn(),
  },
} as const;

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

const { getProfileViewData } = await import("@/server/app-data");

function createProfile(profileVisibility: ProfileVisibility) {
  return {
    id: "user-1",
    slug: "riya-sharma",
    name: "Riya Sharma",
    role: Role.STUDENT,
    profileVisibility,
    headline: "Focused on consistency over panic solving.",
    bio: "Public bio",
    location: "Bengaluru",
    userBadges: [],
    commitmentPosts: [],
    studentProfile: {
      weeklyConsistencyScore: 82,
      commitmentScore: 88,
      currentLevel: "INTERMEDIATE",
      target: "PLACEMENT",
      targetCompanies: [],
      weakTopics: [],
    },
  };
}

describe("getProfileViewData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets other users view a public profile", async () => {
    prisma.user.findUnique.mockResolvedValue(createProfile(ProfileVisibility.PUBLIC));

    const result = await getProfileViewData({
      slug: "riya-sharma",
      viewerId: "viewer-1",
      viewerRole: Role.STUDENT,
    });

    expect(result?.canViewFullProfile).toBe(true);
    expect(result?.isOwner).toBe(false);
    expect(result?.isAdmin).toBe(false);
  });

  it("lets guests view a public profile", async () => {
    prisma.user.findUnique.mockResolvedValue(createProfile(ProfileVisibility.PUBLIC));

    const result = await getProfileViewData({
      slug: "riya-sharma",
    });

    expect(result?.canViewFullProfile).toBe(true);
    expect(result?.isOwner).toBe(false);
    expect(result?.isAdmin).toBe(false);
  });

  it("hides a private profile from non-owners", async () => {
    prisma.user.findUnique.mockResolvedValue(createProfile(ProfileVisibility.PRIVATE));

    const result = await getProfileViewData({
      slug: "riya-sharma",
      viewerId: "viewer-1",
      viewerRole: Role.STUDENT,
    });

    expect(result?.canViewFullProfile).toBe(false);
  });

  it("hides a private profile from guests", async () => {
    prisma.user.findUnique.mockResolvedValue(createProfile(ProfileVisibility.PRIVATE));

    const result = await getProfileViewData({
      slug: "riya-sharma",
    });

    expect(result?.canViewFullProfile).toBe(false);
  });

  it("lets the owner view a private profile", async () => {
    prisma.user.findUnique.mockResolvedValue(createProfile(ProfileVisibility.PRIVATE));

    const result = await getProfileViewData({
      slug: "riya-sharma",
      viewerId: "user-1",
      viewerRole: Role.STUDENT,
    });

    expect(result?.canViewFullProfile).toBe(true);
    expect(result?.isOwner).toBe(true);
  });

  it("lets admins view a private profile", async () => {
    prisma.user.findUnique.mockResolvedValue(createProfile(ProfileVisibility.PRIVATE));

    const result = await getProfileViewData({
      slug: "riya-sharma",
      viewerId: "admin-1",
      viewerRole: Role.ADMIN,
    });

    expect(result?.canViewFullProfile).toBe(true);
    expect(result?.isAdmin).toBe(true);
  });
});
