import { getAuthUrlConfig } from "@/lib/auth-config";

export function getBaseUrl() {
  const resolved = getAuthUrlConfig().value;

  if (resolved) {
    return resolved;
  }

  return "http://localhost:3000";
}
