"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "./schema";

type Props = {
  action: (state: AuthState, form: FormData) => Promise<AuthState>;
  canSignUp: boolean;
};
export function AuthForm({ action, canSignUp }: Props) {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"signin" | "signup">("signin");
  const [state, submit, pending] = useActionState(action, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.fields?.email) emailRef.current?.focus();
    else if (state.fields?.password) passwordRef.current?.focus();
    else if (state.error) errorRef.current?.focus();
  }, [state]);
  return (
    <form action={submit} className="space-y-6" aria-busy={pending}>
      <input type="hidden" name="intent" value={intent} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          aria-invalid={!!state.fields?.email}
          aria-describedby={state.fields?.email ? "email-error" : undefined}
        />
        {state.fields?.email && (
          <p id="email-error" className="text-sm text-danger">
            {state.fields.email}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete={
            intent === "signup" ? "new-password" : "current-password"
          }
          required
          minLength={intent === "signup" ? 12 : 1}
          maxLength={256}
          aria-invalid={!!state.fields?.password}
          aria-describedby={
            state.fields?.password
              ? "password-error"
              : intent === "signup"
                ? "password-help"
                : undefined
          }
        />
        {intent === "signup" && (
          <p id="password-help" className="text-sm text-text-secondary">
            Use at least 12 characters.
          </p>
        )}
        {state.fields?.password && (
          <p id="password-error" className="text-sm text-danger">
            {state.fields.password}
          </p>
        )}
      </div>
      {state.error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md bg-danger-soft p-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-md bg-success-soft p-3 text-sm text-success"
        >
          {state.message}
        </p>
      )}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending
          ? "Please wait…"
          : intent === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>
      {canSignUp && (
        <Button
          className="w-full whitespace-normal"
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setIntent(intent === "signin" ? "signup" : "signin")}
        >
          {intent === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </Button>
      )}
    </form>
  );
}
