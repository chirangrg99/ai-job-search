import { describe, expect, it } from "vitest";
import { parseServerEnv, serverEnvSchema } from "./schema";

const publicPair = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
};

describe("server environment", () => {
  it("allows a shell without integrations and treats blank values as absent", () => {
    expect(
      parseServerEnv({
        OPENAI_API_KEY: "  ",
        ADZUNA_APP_ID: "",
        ADZUNA_APP_KEY: "",
      }),
    ).toMatchObject({ NODE_ENV: "development", OPENAI_API_KEY: undefined });
  });
  it("accepts supplied configuration and strips unrelated process variables", () => {
    expect(
      parseServerEnv({
        ...publicPair,
        NODE_ENV: "production",
        ADZUNA_APP_ID: "test-id",
        ADZUNA_APP_KEY: "test-key",
        UNRELATED_SECRET: "not-retained",
      }),
    ).not.toHaveProperty("UNRELATED_SECRET");
  });
  it.each([
    "not-a-url",
    "ftp://example.com",
    "https://user:password@example.com",
    "https://example.com?token=test",
  ])("rejects unsafe or malformed service URLs: %s", (url) => {
    expect(
      serverEnvSchema.safeParse({
        ...publicPair,
        NEXT_PUBLIC_SUPABASE_URL: url,
      }).success,
    ).toBe(false);
  });
  it("supports local Supabase HTTP URLs", () => {
    expect(
      serverEnvSchema.safeParse({
        ...publicPair,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }).success,
    ).toBe(true);
  });
  it.each([
    { NEXT_PUBLIC_SUPABASE_URL: publicPair.NEXT_PUBLIC_SUPABASE_URL },
    {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        publicPair.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
    { ADZUNA_APP_ID: "test-id" },
    { ADZUNA_APP_KEY: "test-key" },
    { SUPABASE_SERVICE_ROLE_KEY: "test-server-only" },
  ])("rejects partial configuration", (input) => {
    expect(() => parseServerEnv(input)).toThrow(
      "Invalid environment configuration",
    );
  });
  it("rejects private or legacy keys in the publishable key field", () => {
    for (const key of ["sb_secret_test", "eyJlegacy-jwt"])
      expect(
        serverEnvSchema.safeParse({
          ...publicPair,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }).success,
      ).toBe(false);
  });
  it("rejects public server credentials without leaking their values", () => {
    expect(() =>
      parseServerEnv({ NEXT_PUBLIC_OPENAI_API_KEY: "do-not-expose-me" }),
    ).toThrow(
      "Server credentials must not be public: NEXT_PUBLIC_OPENAI_API_KEY",
    );
  });
  it("sanitizes validation errors", () => {
    const secret = "do-not-log-this-value";
    try {
      parseServerEnv({
        ...publicPair,
        NEXT_PUBLIC_SUPABASE_URL: secret,
        OPENAI_API_KEY: secret,
      });
    } catch (error) {
      expect(String(error)).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(String(error)).not.toContain(secret);
      return;
    }
    throw new Error("Expected validation failure");
  });
  it("rejects unknown runtime modes", () => {
    expect(() => parseServerEnv({ NODE_ENV: "staging" })).toThrow("NODE_ENV");
  });
});

it("rejects malformed application origins without leaking raw inputs", () => {
  for (const APP_URL of [
    "malformed",
    "https://example.invalid/path",
    "https://user:secret@example.invalid/",
  ]) {
    expect(() => parseServerEnv({ APP_URL })).toThrow(
      "Invalid environment configuration: APP_URL",
    );
  }
  expect(parseServerEnv({ APP_URL: "http://localhost:3000" }).APP_URL).toBe(
    "http://localhost:3000",
  );
});
