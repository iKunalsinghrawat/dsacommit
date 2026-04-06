import { Role } from "@/generated/prisma/enums";

export const APP_NAME = "DSA Commit";
export const APP_TAGLINE = "Discipline-first DSA preparation for placement-ready students.";
export const AUTH_COOKIE_NAME = "dsa-commit-session";
export const SESSION_DURATION_DAYS = 30;

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/roadmap",
  "/topics",
  "/problems",
  "/companies",
  "/mentors",
  "/community",
  "/profile",
  "/admin",
  "/company-portal",
];

export const PUBLIC_ROUTES = ["/", "/auth/signin", "/auth/signup", "/api/health"];

export const roleHomeMap: Record<Role, string> = {
  [Role.STUDENT]: "/dashboard",
  [Role.MENTOR]: "/dashboard",
  [Role.COMPANY]: "/company-portal",
  [Role.ADMIN]: "/admin",
};

export const roleLabels: Record<Role, string> = {
  [Role.STUDENT]: "Student",
  [Role.MENTOR]: "Mentor",
  [Role.COMPANY]: "Company",
  [Role.ADMIN]: "Admin",
};

export const defaultCredentials = {
  admin: { email: "admin@dsacommit.dev", password: "Admin@123" },
  memberPassword: "Commit@123",
};
