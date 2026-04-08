import { Role, UserPortal, UserStatus } from "@/generated/prisma/enums";
import { roleHomeMap } from "@/lib/constants";

export const userStatusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: "Active",
  [UserStatus.BLOCKED]: "Blocked",
  [UserStatus.DEACTIVATED]: "Deactivated",
  [UserStatus.DELETED]: "Removed",
};

export const userPortalLabels: Record<UserPortal, string> = {
  [UserPortal.DASHBOARD]: "Dashboard",
  [UserPortal.ROADMAP]: "Roadmap",
  [UserPortal.TOPICS]: "Topics",
  [UserPortal.PROBLEMS]: "Problems",
  [UserPortal.COMPANIES]: "Companies",
  [UserPortal.MENTORS]: "Mentors",
  [UserPortal.COMMUNITY]: "Community",
  [UserPortal.PROFILE]: "Profile",
  [UserPortal.MESSAGES]: "Messages",
  [UserPortal.GROUPS]: "Groups",
  [UserPortal.CONNECTIONS]: "Connections",
  [UserPortal.COMPANY_PORTAL]: "Company portal",
  [UserPortal.ADMIN_PORTAL]: "Admin portal",
  [UserPortal.MODERATION]: "Moderation",
  [UserPortal.POSTING]: "Posting",
};

const defaultAccessGrantsByRole: Record<Role, UserPortal[]> = {
  [Role.STUDENT]: [
    UserPortal.DASHBOARD,
    UserPortal.ROADMAP,
    UserPortal.TOPICS,
    UserPortal.PROBLEMS,
    UserPortal.COMPANIES,
    UserPortal.MENTORS,
    UserPortal.COMMUNITY,
    UserPortal.PROFILE,
    UserPortal.MESSAGES,
    UserPortal.GROUPS,
    UserPortal.CONNECTIONS,
    UserPortal.POSTING,
  ],
  [Role.MENTOR]: [
    UserPortal.DASHBOARD,
    UserPortal.TOPICS,
    UserPortal.PROBLEMS,
    UserPortal.COMPANIES,
    UserPortal.MENTORS,
    UserPortal.COMMUNITY,
    UserPortal.PROFILE,
    UserPortal.MESSAGES,
    UserPortal.POSTING,
  ],
  [Role.COMPANY]: [
    UserPortal.DASHBOARD,
    UserPortal.COMPANIES,
    UserPortal.COMMUNITY,
    UserPortal.PROFILE,
    UserPortal.COMPANY_PORTAL,
    UserPortal.POSTING,
  ],
  [Role.ADMIN]: [
    UserPortal.DASHBOARD,
    UserPortal.ROADMAP,
    UserPortal.TOPICS,
    UserPortal.PROBLEMS,
    UserPortal.COMPANIES,
    UserPortal.MENTORS,
    UserPortal.COMMUNITY,
    UserPortal.PROFILE,
    UserPortal.MESSAGES,
    UserPortal.GROUPS,
    UserPortal.CONNECTIONS,
    UserPortal.COMPANY_PORTAL,
    UserPortal.ADMIN_PORTAL,
    UserPortal.MODERATION,
    UserPortal.POSTING,
  ],
};

const legacySocialPortalFallbackByRole: Partial<Record<Role, UserPortal[]>> = {
  [Role.STUDENT]: [UserPortal.MESSAGES, UserPortal.GROUPS, UserPortal.CONNECTIONS],
  [Role.MENTOR]: [UserPortal.MESSAGES],
  [Role.ADMIN]: [UserPortal.MESSAGES, UserPortal.GROUPS, UserPortal.CONNECTIONS],
};

export const navigationItems: Array<{
  href: string;
  label: string;
  portal: UserPortal;
  roles: Role[];
}> = [
  { href: "/dashboard", label: "Dashboard", portal: UserPortal.DASHBOARD, roles: [Role.STUDENT, Role.MENTOR, Role.COMPANY, Role.ADMIN] },
  { href: "/roadmap", label: "Roadmap", portal: UserPortal.ROADMAP, roles: [Role.STUDENT, Role.ADMIN] },
  { href: "/topics", label: "Topics", portal: UserPortal.TOPICS, roles: [Role.STUDENT, Role.MENTOR, Role.ADMIN] },
  { href: "/problems", label: "Problems", portal: UserPortal.PROBLEMS, roles: [Role.STUDENT, Role.MENTOR, Role.ADMIN] },
  { href: "/companies", label: "Companies", portal: UserPortal.COMPANIES, roles: [Role.STUDENT, Role.MENTOR, Role.COMPANY, Role.ADMIN] },
  { href: "/mentors", label: "Mentors", portal: UserPortal.MENTORS, roles: [Role.STUDENT, Role.MENTOR, Role.ADMIN] },
  { href: "/community", label: "Community", portal: UserPortal.COMMUNITY, roles: [Role.STUDENT, Role.MENTOR, Role.COMPANY, Role.ADMIN] },
  { href: "/messages", label: "Messages", portal: UserPortal.MESSAGES, roles: [Role.STUDENT, Role.MENTOR, Role.ADMIN] },
  { href: "/groups", label: "Groups", portal: UserPortal.GROUPS, roles: [Role.STUDENT, Role.ADMIN] },
  { href: "/connections", label: "Connections", portal: UserPortal.CONNECTIONS, roles: [Role.STUDENT, Role.ADMIN] },
  { href: "/company-portal", label: "Company Portal", portal: UserPortal.COMPANY_PORTAL, roles: [Role.COMPANY, Role.ADMIN] },
  { href: "/admin", label: "Admin", portal: UserPortal.ADMIN_PORTAL, roles: [Role.ADMIN] },
  { href: "/profile", label: "Profile", portal: UserPortal.PROFILE, roles: [Role.STUDENT, Role.MENTOR, Role.COMPANY, Role.ADMIN] },
];

export function getDefaultAccessGrants(role: Role) {
  return [...defaultAccessGrantsByRole[role]];
}

export function normalizeAccessGrants(role: Role, accessGrants?: UserPortal[] | null) {
  if (!accessGrants?.length) {
    return getDefaultAccessGrants(role);
  }

  const grants = [...new Set(accessGrants)];
  const socialFallback = legacySocialPortalFallbackByRole[role] ?? [];
  const hasAnySocialPortal = socialFallback.some((portal) => grants.includes(portal));

  if (!hasAnySocialPortal && socialFallback.length) {
    return [...new Set([...grants, ...socialFallback])];
  }

  return grants;
}

export function isRestrictedStatus(status: UserStatus) {
  return status !== UserStatus.ACTIVE;
}

export function hasPortalAccess(
  user: {
    role: Role;
    accessGrants?: UserPortal[] | null;
  },
  portal: UserPortal,
) {
  const grants = normalizeAccessGrants(user.role, user.accessGrants);
  return grants.includes(portal);
}

export function getNavigationItems(role: Role, accessGrants?: UserPortal[] | null) {
  const grants = normalizeAccessGrants(role, accessGrants);

  return navigationItems.filter(
    (item) => item.roles.includes(role) && grants.includes(item.portal),
  );
}

export function getHomeForAccess(role: Role, accessGrants?: UserPortal[] | null) {
  const firstMatch = getNavigationItems(role, accessGrants)[0];
  return firstMatch?.href ?? roleHomeMap[role];
}
