/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import { Role, UserPortal } from "@/generated/prisma/enums";
import { getNavigationItems, normalizeAccessGrants } from "@/lib/access-control";

describe("access control compatibility", () => {
  it("backfills social portals for legacy student grants", () => {
    const grants = normalizeAccessGrants(Role.STUDENT, [
      UserPortal.DASHBOARD,
      UserPortal.ROADMAP,
      UserPortal.TOPICS,
      UserPortal.PROBLEMS,
      UserPortal.COMPANIES,
      UserPortal.MENTORS,
      UserPortal.COMMUNITY,
      UserPortal.PROFILE,
      UserPortal.POSTING,
    ]);

    expect(grants).toEqual(
      expect.arrayContaining([
        UserPortal.MESSAGES,
        UserPortal.GROUPS,
        UserPortal.CONNECTIONS,
      ]),
    );
  });

  it("shows communication navigation items for compatible legacy mentor grants", () => {
    const navItems = getNavigationItems(Role.MENTOR, [
      UserPortal.DASHBOARD,
      UserPortal.TOPICS,
      UserPortal.PROBLEMS,
      UserPortal.COMPANIES,
      UserPortal.MENTORS,
      UserPortal.COMMUNITY,
      UserPortal.PROFILE,
      UserPortal.POSTING,
    ]);

    expect(navItems.map((item) => item.href)).toContain("/messages");
  });
});
