import { z } from "zod";
import {
  contextSchema,
  resumeDraftSchema,
  validationSchema,
  RESUME_VERSION,
} from "./schema";
import { retrievalResultSchema } from "@/features/retrieval/model";
export const resumeEnvelopeSchema = z.strictObject({
  version: z.literal(RESUME_VERSION),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  context: contextSchema,
  selection: retrievalResultSchema,
  draft: resumeDraftSchema,
});
export type ResumeEnvelope = z.infer<typeof resumeEnvelopeSchema>;
export type SavedResume = {
  id: string;
  createdAt: string;
  model: string;
  promptVersion: string;
  content: ResumeEnvelope;
  validation: z.infer<typeof validationSchema>;
};
