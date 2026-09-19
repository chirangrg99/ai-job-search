import { z } from "zod";

const optionalValue = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );

const serviceUrl = z.url({ protocol: /^https?$/ }).refine((value) => {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}, "Use an HTTP(S) service URL without credentials, query, or fragment.");

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: optionalValue(
      serviceUrl.refine(
        (value) => URL.canParse(value) && new URL(value).pathname === "/",
        "Use the application origin only.",
      ),
    ),
    NEXT_PUBLIC_SUPABASE_URL: optionalValue(serviceUrl),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalValue(
      z
        .string()
        .trim()
        .regex(/^sb_publishable_[A-Za-z0-9_-]+$/),
    ),
    SUPABASE_SERVICE_ROLE_KEY: optionalValue(z.string().trim().min(1)),
    OPENAI_API_KEY: optionalValue(z.string().trim().min(1)),
    OPENAI_JOB_PARSER_MODEL: optionalValue(
      z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/),
    ),
    ADZUNA_APP_ID: optionalValue(z.string().trim().min(1)),
    ADZUNA_APP_KEY: optionalValue(z.string().trim().min(1)),
  })
  .superRefine((env, ctx) => {
    const pairs = [
      ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
      ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
    ] as const;
    for (const [first, second] of pairs) {
      if (Boolean(env[first]) !== Boolean(env[second])) {
        ctx.addIssue({
          code: "custom",
          path: [env[first] ? second : first],
          message: "Configure both values together.",
        });
      }
    }
    if (env.SUPABASE_SERVICE_ROLE_KEY && !env.NEXT_PUBLIC_SUPABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "Required for server administration.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Never propagate Zod's input or raw process.env into logs or client props. */
export function parseServerEnv(input: Record<string, unknown>): ServerEnv {
  const forbidden = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_OPENAI_API_KEY",
    "NEXT_PUBLIC_ADZUNA_APP_ID",
    "NEXT_PUBLIC_ADZUNA_APP_KEY",
  ];
  const exposed = forbidden.filter(
    (name) => input[name] !== undefined && input[name] !== "",
  );
  if (exposed.length)
    throw new Error(
      `Server credentials must not be public: ${exposed.join(", ")}`,
    );
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(
      `Invalid environment configuration: ${fields.join(", ")}. Check .env.example and configure related values together.`,
    );
  }
  return result.data;
}
