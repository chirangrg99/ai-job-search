import { createHash } from "node:crypto";
import { parsedJobSchema } from "@/features/job-parser/schema";
import type { RetrievalJob } from "./model";
/** Node/server context boundary; never exposes the job or profile inside its identifier. */
export function jobFingerprint(job: RetrievalJob) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        parsed: parsedJobSchema.parse(job.parsed),
        asOf: job.asOf,
        categories: [...(job.categories ?? [])].sort(),
      }),
    )
    .digest("hex");
}
