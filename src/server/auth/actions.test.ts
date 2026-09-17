import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  signin: vi.fn(),
  signup: vi.fn(),
  signout: vi.fn(),
  profile: vi.fn(),
  config: vi.fn(),
  env: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/server/supabase/config", () => ({
  getSupabaseConfig: mocks.config,
}));
vi.mock("@/server/env", () => ({ getServerEnv: mocks.env }));
vi.mock("@/server/auth/guard", () => ({
  ensureCandidateProfile: mocks.profile,
}));
vi.mock("@/server/supabase/client", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signInWithPassword: mocks.signin,
      signUp: mocks.signup,
      signOut: mocks.signout,
    },
  }),
}));
import { authenticate, signOut } from "@/app/login/actions";
function form(intent = "signin") {
  const data = new FormData();
  data.set("email", "test@example.invalid");
  data.set("password", "synthetic-test-password");
  data.set("intent", intent);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({});
  mocks.env.mockReturnValue({ APP_URL: "http://localhost:3000" });
  mocks.profile.mockResolvedValue(undefined);
});
it("validates server inputs before contacting auth", async () => {
  const data = form();
  data.set("email", "bad");
  expect((await authenticate({}, data)).fields?.email).toBeTruthy();
  expect(mocks.signin).not.toHaveBeenCalled();
});
it("fails closed when auth is not configured", async () => {
  mocks.config.mockReturnValue(null);
  expect((await authenticate({}, form())).error).toContain("not configured");
  expect(mocks.signin).not.toHaveBeenCalled();
});
it("does not reveal raw provider errors", async () => {
  mocks.signin.mockResolvedValue({
    error: { message: "sensitive provider detail" },
  });
  const state = await authenticate({}, form());
  expect(state.error).toContain("Unable to sign in");
  expect(JSON.stringify(state)).not.toContain("sensitive provider detail");
  expect(mocks.profile).not.toHaveBeenCalled();
});
it("initializes a profile only after successful sign-in", async () => {
  mocks.signin.mockResolvedValue({ error: null });
  await expect(authenticate({}, form())).rejects.toThrow("redirect:/");
  expect(mocks.profile).toHaveBeenCalledOnce();
});
it("waits for confirmation without creating a profile", async () => {
  mocks.signup.mockResolvedValue({ error: null, data: { session: null } });
  expect((await authenticate({}, form("signup"))).message).toContain(
    "Check your email",
  );
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.signup).toHaveBeenCalledWith(
    expect.objectContaining({
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    }),
  );
});
it("requires a trusted app origin for sign-up", async () => {
  mocks.env.mockReturnValue({});
  expect((await authenticate({}, form("signup"))).error).toContain(
    "not configured",
  );
  expect(mocks.signup).not.toHaveBeenCalled();
});
it("reports outages without provider details", async () => {
  mocks.signin.mockRejectedValue(new Error("private error"));
  expect((await authenticate({}, form())).error).toBe(
    "Authentication is temporarily unavailable. Please try again.",
  );
});
it("signs out the current device and redirects", async () => {
  mocks.signout.mockResolvedValue({ error: null });
  await expect(signOut()).rejects.toThrow("redirect:/login");
  expect(mocks.signout).toHaveBeenCalledWith({ scope: "local" });
});
