import { describe, expect, it } from "vitest";

import { isPublicProfilePath } from "@/lib/constants";

describe("isPublicProfilePath", () => {
  it("matches public profile detail routes", () => {
    expect(isPublicProfilePath("/profile/riya-sharma")).toBe(true);
    expect(isPublicProfilePath("/profile/riya-sharma/")).toBe(true);
  });

  it("does not match the protected profile root or nested non-profile paths", () => {
    expect(isPublicProfilePath("/profile")).toBe(false);
    expect(isPublicProfilePath("/profile/riya-sharma/posts")).toBe(false);
    expect(isPublicProfilePath("/dashboard")).toBe(false);
  });
});
