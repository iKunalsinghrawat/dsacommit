function normalizeBaseUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getBaseUrl() {
  return (
    normalizeBaseUrl(process.env.AUTH_URL) ??
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(process.env.URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL) ??
    normalizeBaseUrl(process.env.DEPLOY_PRIME_URL) ??
    "http://localhost:3000"
  );
}
