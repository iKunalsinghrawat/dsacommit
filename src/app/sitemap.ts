import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/base-url";

const routes = [
  "",
  "/auth/signin",
  "/auth/signup",
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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "" ? "weekly" : "daily",
    priority: route === "" ? 1 : 0.7,
  }));
}
