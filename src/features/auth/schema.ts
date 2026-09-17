import { z } from "zod";
export const authInputSchema = z
  .object({
    email: z.email("Enter a valid email address.").max(254).trim(),
    password: z
      .string()
      .min(1, "Enter your password.")
      .max(256, "Password is too long."),
    intent: z.enum(["signin", "signup"]),
  })
  .superRefine((value, ctx) => {
    if (value.intent === "signup" && value.password.length < 12) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Use at least 12 characters for a new account.",
      });
    }
  });
export type AuthState = {
  error?: string;
  message?: string;
  fields?: { email?: string; password?: string };
};
