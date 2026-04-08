import { afterEach, describe, expect, it } from "vitest";

import { getAuthRuntimeSummary, getAuthSecret, getAuthSecretConfig, getAuthUrlConfig } from "@/lib/auth-config";

const originalEnv = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  NODE_ENV: process.env.NODE_ENV,
};

function restoreEnvValue(key: keyof typeof originalEnv, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  restoreEnvValue("AUTH_SECRET", originalEnv.AUTH_SECRET);
  restoreEnvValue("NEXTAUTH_SECRET", originalEnv.NEXTAUTH_SECRET);
  restoreEnvValue("AUTH_URL", originalEnv.AUTH_URL);
  restoreEnvValue("NEXTAUTH_URL", originalEnv.NEXTAUTH_URL);
  restoreEnvValue("NEXT_PUBLIC_APP_URL", originalEnv.NEXT_PUBLIC_APP_URL);
  restoreEnvValue("VERCEL_URL", originalEnv.VERCEL_URL);
  restoreEnvValue("NODE_ENV", originalEnv.NODE_ENV);
});

describe("auth config", () => {
  it("falls back to NEXTAUTH_SECRET when AUTH_SECRET is missing", () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "legacy-secret";

    expect(getAuthSecret()).toBe("legacy-secret");
    expect(getAuthSecretConfig()).toEqual({
      key: "NEXTAUTH_SECRET",
      value: "legacy-secret",
    });
  });

  it("prefers AUTH_SECRET when both secret envs are set", () => {
    process.env.AUTH_SECRET = "primary-secret";
    process.env.NEXTAUTH_SECRET = "legacy-secret";

    expect(getAuthSecretConfig()).toEqual({
      key: "AUTH_SECRET",
      value: "primary-secret",
    });
  });

  it("uses AUTH_URL ahead of NEXTAUTH_URL and public URL fallbacks", () => {
    process.env.AUTH_URL = "https://auth.example.com";
    process.env.NEXTAUTH_URL = "https://nextauth.example.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com";

    expect(getAuthUrlConfig()).toEqual({
      key: "AUTH_URL",
      value: "https://auth.example.com",
    });
  });

  it("exposes a safe runtime summary without leaking secrets", () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    process.env.NEXTAUTH_URL = "app.example.com";

    expect(getAuthRuntimeSummary()).toMatchObject({
      hasAuthSecret: true,
      authSecretSource: "NEXTAUTH_SECRET",
      authUrlSource: "NEXTAUTH_URL",
      authUrl: "https://app.example.com",
    });
  });

  it("ignores localhost auth URLs in production and falls back to platform URLs", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.VERCEL_URL = "dsa-commit.vercel.app";

    expect(getAuthUrlConfig()).toEqual({
      key: "VERCEL_URL",
      value: "https://dsa-commit.vercel.app",
    });
  });
});
