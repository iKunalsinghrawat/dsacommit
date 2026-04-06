import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { signInSchema, signUpSchema, splitCsv } from "@/lib/validators/auth";

describe("auth validation", () => {
  it("accepts a valid sign-in payload", () => {
    const result = signInSchema.safeParse({
      email: "student01@dsacommit.dev",
      password: "Commit@123",
    });

    expect(result.success).toBe(true);
  });

  it("requires student onboarding fields during sign-up", () => {
    const result = signUpSchema.safeParse({
      name: "Riya Sharma",
      email: "riya@example.com",
      password: "Commit@123",
      confirmPassword: "Commit@123",
      role: Role.STUDENT,
      targetCompanies: [],
      weakTopics: [],
    });

    expect(result.success).toBe(false);
  });

  it("splits comma-separated mentor tags cleanly", () => {
    expect(splitCsv("Graph, Trees, Binary Search")).toEqual([
      "Graph",
      "Trees",
      "Binary Search",
    ]);
  });
});
