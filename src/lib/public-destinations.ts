import { createSearchParams } from "@/lib/utils";

export function getSafeRedirectPath(input?: string | null) {
  if (!input) {
    return null;
  }

  const value = input.trim();

  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth/")) {
    return null;
  }

  return value;
}

export function getSignInHref(nextPath?: string | null) {
  const safeNextPath = getSafeRedirectPath(nextPath);
  return safeNextPath
    ? `/auth/signin${createSearchParams({ next: safeNextPath })}`
    : "/auth/signin";
}

export function getSignUpHref(nextPath?: string | null) {
  const safeNextPath = getSafeRedirectPath(nextPath);
  return safeNextPath
    ? `/auth/signup${createSearchParams({ next: safeNextPath })}`
    : "/auth/signup";
}

export function getPublicCompaniesHref() {
  return "/explore/companies";
}

export function getPublicCompanyHref(slug: string) {
  return `${getPublicCompaniesHref()}/${slug}`;
}

export function getPublicMentorsHref() {
  return "/explore/mentors";
}

export function getPublicProfileHref(slug: string) {
  return `/profile/${slug}`;
}

export function getPublicMentorHref(slug: string) {
  return getPublicProfileHref(slug);
}

export function getPublicRoadmapHref(level?: string | null) {
  return `/explore/roadmap${createSearchParams({ level })}`;
}

export function getPublicLeaderboardHref(studentId?: string | null) {
  return studentId ? `/explore/leaderboard#student-${studentId}` : "/explore/leaderboard";
}
