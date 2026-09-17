// @vitest-environment node
import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ create: vi.fn(), config: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
vi.mock("./config", () => ({ getSupabaseConfig: mocks.config }));
import { refreshSession } from "./session";
it("preserves refreshed cookies in the request and response and prevents caching", async () => {
  mocks.config.mockReturnValue({
    url: "https://example.invalid",
    publishableKey: "synthetic-test-value",
  });
  mocks.create.mockImplementation((_url, _key, options) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          {
            name: "session-test",
            value: "synthetic-session",
            options: { httpOnly: true, path: "/", sameSite: "lax" },
          },
        ]);
        return { data: { user: null }, error: null };
      },
    },
  }));
  const request = new NextRequest("http://localhost:3000/jobs");
  const response = await refreshSession(request);
  expect(request.cookies.get("session-test")?.value).toBe("synthetic-session");
  expect(response.cookies.get("session-test")?.httpOnly).toBe(true);
  expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("does not create a client without config", async () => {
  mocks.create.mockClear();
  mocks.config.mockReturnValue(null);
  await refreshSession(new NextRequest("http://localhost:3000"));
  expect(mocks.create).not.toHaveBeenCalled();
});

it("permits public auth routes without creating a redirect loop", async () => {
  mocks.config.mockReturnValue(null);
  for (const path of ["/login", "/auth/callback"]) {
    const response = await refreshSession(
      new NextRequest(`http://localhost:3000${path}`),
    );
    expect(response.headers.get("location")).toBeNull();
  }
});
it("lets a server-confirmed user through", async () => {
  mocks.config.mockReturnValue({
    url: "https://example.invalid",
    publishableKey: "synthetic-test-value",
  });
  mocks.create.mockReturnValue({
    auth: {
      getUser: async () => ({
        data: { user: { id: "verified", is_anonymous: false } },
        error: null,
      }),
    },
  });
  const response = await refreshSession(
    new NextRequest("http://localhost:3000/profile"),
  );
  expect(response.headers.get("location")).toBeNull();
});
