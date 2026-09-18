import { z } from "zod";
import {
  employmentTypes,
  remoteModes,
  salaryPeriods,
} from "@/features/preferences/schema";
const text = z.string().trim().max(500);
export const safeJobUrl = z
  .url({ protocol: /^https?$/ })
  .max(3000)
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const u = new URL(value);
    return (
      !u.username &&
      !u.password &&
      !["app_key", "app_id", "api_key", "token", "access_token"].some((k) =>
        u.searchParams.has(k),
      )
    );
  }, "Use a public posting URL without credentials.");
const amount = z.number().finite().nonnegative().max(1e9).nullable();
export const manualJobSchema = z
  .object({
    title: text.min(1, "Enter a job title."),
    company: text,
    location: text,
    description: z
      .string()
      .trim()
      .min(1, "Paste the known job description.")
      .max(50000),
    descriptionComplete: z.boolean(),
    applicationUrl: z.union([safeJobUrl, z.literal("")]),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .or(z.literal("")),
    salaryMin: amount,
    salaryMax: amount,
    salaryCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
    salaryPeriod: z.enum(salaryPeriods).nullable(),
    employmentType: z.enum(employmentTypes).nullable(),
    remoteType: z.enum(remoteModes).nullable(),
  })
  .refine(
    (v) =>
      v.salaryMin === null ||
      v.salaryMax === null ||
      v.salaryMax >= v.salaryMin,
    { path: ["salaryMax"], message: "Maximum must not be below minimum." },
  );
export type ManualJobInput = z.infer<typeof manualJobSchema>;
export const discoveredJobSchema = z
  .object({
    provider: z.string().min(1).max(80),
    externalId: z.string().min(1).max(200),
    title: text.min(1),
    company: text.nullable(),
    location: text.nullable(),
    country: z.string().nullable(),
    description: z.string().max(50000).nullable(),
    descriptionComplete: z.boolean(),
    applicationUrl: safeJobUrl.nullable(),
    salaryMin: amount,
    salaryMax: amount,
    salaryCurrency: z.string().nullable(),
    salaryPeriod: z.enum(salaryPeriods).nullable(),
    salaryEstimated: z.boolean().nullable(),
    employmentType: z.enum(employmentTypes).nullable(),
    remoteType: z.enum(remoteModes).nullable(),
    postedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .refine(
    (v) =>
      v.salaryMin === null ||
      v.salaryMax === null ||
      v.salaryMax >= v.salaryMin,
    "Invalid salary range",
  );
export type DiscoveredJob = z.infer<typeof discoveredJobSchema>;
export const syncInputSchema = z
  .object({
    preferenceId: z.uuid(),
    page: z.number().int().min(1).max(100),
    pageSize: z.number().int().min(1).max(50),
  })
  .strict();
export type DiscoveryResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fields?: Record<string, string> };
