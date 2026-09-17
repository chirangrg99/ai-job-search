import { z } from "zod";
export const applicationStatuses = [
  "interested",
  "preparing",
  "ready_to_apply",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "archived",
] as const;
export const applicationStatusSchema = z.enum(applicationStatuses);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export const provenanceSchema = z.enum([
  "VERIFIED",
  "AI_DRAFT",
  "NEEDS_INPUT",
  "UNSUPPORTED",
]);
export type Provenance = z.infer<typeof provenanceSchema>;
export const sensitivitySchema = z.enum(["public", "private", "sensitive"]);
