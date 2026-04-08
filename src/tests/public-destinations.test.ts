import { describe, expect, it } from "vitest";

import {
  getPublicCompanyHref,
  getPublicLeaderboardHref,
  getPublicRoadmapHref,
  getSafeRedirectPath,
  getSignInHref,
} from "@/lib/public-destinations";

describe("public destination helpers", () => {
  it("builds the public preview hrefs used on the landing page", () => {
    expect(getPublicCompanyHref("amazon")).toBe("/explore/companies/amazon");
    expect(getPublicRoadmapHref("BEGINNER")).toBe("/explore/roadmap?level=BEGINNER");
    expect(getPublicLeaderboardHref("student-1")).toBe("/explore/leaderboard#student-student-1");
  });

  it("sanitizes redirect targets before they are used for sign-in flows", () => {
    expect(getSafeRedirectPath("/roadmap")).toBe("/roadmap");
    expect(getSafeRedirectPath("https://evil.example")).toBeNull();
    expect(getSafeRedirectPath("//evil.example")).toBeNull();
    expect(getSafeRedirectPath("/auth/signin")).toBeNull();
    expect(getSignInHref("/dashboard")).toBe("/auth/signin?next=%2Fdashboard");
  });
});
