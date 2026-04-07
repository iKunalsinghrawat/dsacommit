const AUTH_SECRET_KEYS = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const;
const AUTH_URL_KEYS = ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"] as const;
const PLATFORM_URL_KEYS = ["VERCEL_PROJECT_PRODUCTION_URL", "URL", "VERCEL_URL", "DEPLOY_PRIME_URL"] as const;

type AuthSecretKey = (typeof AUTH_SECRET_KEYS)[number];
type AuthUrlKey = (typeof AUTH_URL_KEYS)[number];

function readFirstEnvValue<const T extends readonly string[]>(keys: T) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value && value !== "undefined" && value !== "null") {
      return {
        key,
        value,
      } as {
        key: T[number];
        value: string;
      };
    }
  }

  return null;
}

function normalizeBaseUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function shouldIgnoreResolvedUrl(value: string) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getAuthSecretConfig() {
  return readFirstEnvValue(AUTH_SECRET_KEYS) as { key: AuthSecretKey; value: string } | null;
}

export function getAuthSecret() {
  return getAuthSecretConfig()?.value ?? null;
}

export function requireAuthSecret() {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("Authentication secret is not configured. Set AUTH_SECRET or NEXTAUTH_SECRET.");
  }

  return new TextEncoder().encode(secret);
}

export function getAuthUrlConfig() {
  const explicitUrl =
    (readFirstEnvValue(AUTH_URL_KEYS) as { key: AuthUrlKey; value: string } | null) ??
    (readFirstEnvValue(PLATFORM_URL_KEYS) as {
      key: (typeof PLATFORM_URL_KEYS)[number];
      value: string;
    } | null);

  if (explicitUrl) {
    const normalizedExplicitUrl = normalizeBaseUrl(explicitUrl.value);

    if (normalizedExplicitUrl && !shouldIgnoreResolvedUrl(normalizedExplicitUrl)) {
      return {
        key: explicitUrl.key,
        value: normalizedExplicitUrl,
      } as const;
    }
  }

  const platformUrl = readFirstEnvValue(PLATFORM_URL_KEYS) as {
    key: (typeof PLATFORM_URL_KEYS)[number];
    value: string;
  } | null;

  if (!platformUrl) {
    return {
      key: null,
      value: process.env.NODE_ENV === "production" ? "" : "http://localhost:3000",
    } as const;
  }

  const normalizedPlatformUrl = normalizeBaseUrl(platformUrl.value);

  return {
    key: platformUrl.key,
    value: normalizedPlatformUrl ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"),
  } as const;
}

export function getAuthRuntimeSummary() {
  const secretConfig = getAuthSecretConfig();
  const urlConfig = getAuthUrlConfig();

  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasAuthSecret: Boolean(secretConfig),
    authSecretSource: secretConfig?.key ?? null,
    authUrlSource: urlConfig.key,
    authUrl: urlConfig.value,
  };
}
