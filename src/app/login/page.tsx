import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfig } from "@/server/supabase/config";
import { getServerEnv } from "@/server/env";
import { authenticate } from "./actions";
export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = !!getSupabaseConfig();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <section
        className="w-full max-w-md space-y-6 rounded-lg border bg-surface p-6 shadow-sm sm:p-8"
        aria-labelledby="login-title"
      >
        <header className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-primary-hover">
            CAREER WORKSPACE
          </p>
          <h1 id="login-title" className="text-page font-semibold">
            Your application assistant
          </h1>
          <p className="text-text-secondary">
            Sign in to your private career workspace.
          </p>
        </header>
        {error === "confirmation" && (
          <p role="alert" className="text-sm text-danger">
            This confirmation link could not be verified. Open the latest link
            in the browser where you created your account, or try signing in.
          </p>
        )}
        {error === "signout" && (
          <p role="alert" className="text-sm text-danger">
            Sign-out could not be completed. Please try again from your
            workspace.
          </p>
        )}
        {configured ? (
          <AuthForm
            action={authenticate}
            canSignUp={!!getServerEnv().APP_URL}
          />
        ) : (
          <p
            role="status"
            className="rounded-md bg-surface-subtle p-4 text-sm text-text-secondary"
          >
            Sign-in is not configured yet. The workspace owner needs to finish
            account setup.
          </p>
        )}
      </section>
    </main>
  );
}
