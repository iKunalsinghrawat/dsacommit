import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/(marketing)/page";
import { getLandingPageData, getLeaderboard, getRoadmapData } from "@/server/public-data";

vi.mock("@/server/public-data", () => ({
  getLandingPageData: vi.fn(),
  getLeaderboard: vi.fn(),
  getRoadmapData: vi.fn(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(getLandingPageData).mockResolvedValue({
      featuredCompanies: [
        {
          id: "company-1",
          name: "Amazon",
          slug: "amazon",
          overview: "Company prep track",
          commonFocusTopics: ["arrays", "trees"],
        },
      ],
      featuredMentors: [
        {
          userId: "mentor-1",
          roleTitle: "Software Engineer",
          bio: "Helps students prepare with consistency.",
          expertiseTags: ["Graphs", "Trees"],
          followers: [{ id: "follow-1" }],
          company: { name: "Google" },
          user: { name: "Aarav Menon", slug: "aarav-menon" },
        },
      ],
      topStudents: [],
      featuredChallenges: [
        {
          id: "challenge-1",
          title: "7-day discipline sprint",
          durationDays: 7,
          description: "Stay consistent for a full week.",
        },
      ],
      wallPosts: [
        {
          id: "post-1",
          caption: "Solved two array problems today.",
          minutesCommitted: 90,
          solvedCount: 2,
          user: { name: "Riya Sharma", slug: "riya-sharma" },
        },
      ],
    } as Awaited<ReturnType<typeof getLandingPageData>>);

    vi.mocked(getRoadmapData).mockResolvedValue({
      BEGINNER: [
        {
          id: "roadmap-1",
          title: "Programming Logic",
          level: "BEGINNER",
          topic: {
            id: "topic-1",
            name: "Programming Logic",
            slug: "programming-logic",
            problems: [{ id: "problem-1" }],
          },
        },
      ],
      INTERMEDIATE: [],
      ADVANCED: [],
    } as Awaited<ReturnType<typeof getRoadmapData>>);

    vi.mocked(getLeaderboard).mockResolvedValue([
      {
        id: "student-1",
        name: "Riya Sharma",
        headline: "Placement-focused student",
        studentProfile: {
          commitmentScore: 88,
          weeklyConsistencyScore: 91,
        },
      },
    ] as Awaited<ReturnType<typeof getLeaderboard>>);
  });

  it("renders interactive public links for landing page preview sections", async () => {
    const view = render(await HomePage());

    expect(screen.getByRole("link", { name: /explore the roadmap/i })).toHaveAttribute(
      "href",
      "/explore/roadmap",
    );
    expect(screen.getByRole("link", { name: /see all companies/i })).toHaveAttribute(
      "href",
      "/explore/companies",
    );
    expect(screen.getByRole("link", { name: /browse mentors/i })).toHaveAttribute(
      "href",
      "/explore/mentors",
    );
    expect(screen.getByRole("link", { name: /view leaderboard/i })).toHaveAttribute(
      "href",
      "/explore/leaderboard",
    );

    expect(view.container.querySelector('a[href="/explore/companies/amazon"]')).not.toBeNull();
    expect(view.container.querySelector('a[href="/profile/aarav-menon"]')).not.toBeNull();
    expect(view.container.querySelector('a[href="/explore/roadmap?level=BEGINNER"]')).not.toBeNull();
    expect(view.container.querySelector('a[href="/explore/leaderboard#student-student-1"]')).not.toBeNull();
    expect(view.container.querySelector('a[href="/auth/signin?next=%2Fdashboard"]')).not.toBeNull();
    expect(view.container.querySelector('a[href="/profile/riya-sharma"]')).not.toBeNull();
  });
});
