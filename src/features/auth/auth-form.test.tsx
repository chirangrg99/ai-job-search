import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";
import { authInputSchema } from "./schema";
it("labels inputs, supports password managers, and submits sign-in", async () => {
  const user = userEvent.setup();
  const action = vi.fn().mockResolvedValue({ error: "Unable to sign in." });
  render(<AuthForm action={action} canSignUp />);
  await user.type(screen.getByLabelText("Email"), "test@example.invalid");
  await user.type(screen.getByLabelText("Password"), "synthetic-test-password");
  expect(screen.getByLabelText("Password")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(action).toHaveBeenCalledOnce());
  expect(action.mock.calls[0]?.[1].get("intent")).toBe("signin");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to sign in.",
  );
});
it("offers explicit account creation with a new-password hint", async () => {
  const user = userEvent.setup();
  render(<AuthForm action={vi.fn()} canSignUp />);
  await user.click(
    screen.getByRole("button", { name: "New here? Create an account" }),
  );
  expect(screen.getByLabelText("Password")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  expect(screen.getByRole("button", { name: "Create account" })).toBeVisible();
});
it("validates new account strength without blocking legacy sign-in passwords", () => {
  const data = {
    email: "test@example.invalid",
    password: "short",
    intent: "signin",
  };
  expect(authInputSchema.safeParse(data).success).toBe(true);
  expect(authInputSchema.safeParse({ ...data, intent: "signup" }).success).toBe(
    false,
  );
  expect(authInputSchema.safeParse({ ...data, email: "bad" }).success).toBe(
    false,
  );
});
