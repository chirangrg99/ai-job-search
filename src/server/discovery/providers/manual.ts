import "server-only";
import { randomUUID } from "node:crypto";
import {
  manualJobSchema,
  discoveredJobSchema,
} from "@/features/discovery/schema";
import type { JobProvider } from "../provider";
export class ManualJobProvider implements JobProvider {
  readonly identifier = "manual";
  validateConfiguration() {
    return { valid: true };
  }
  mapResult(input: unknown) {
    const v = manualJobSchema.parse(input);
    return discoveredJobSchema.parse({
      ...v,
      provider: this.identifier,
      externalId: randomUUID(),
      company: v.company || null,
      location: v.location || null,
      country: v.country || null,
      applicationUrl: v.applicationUrl || null,
      descriptionComplete: v.descriptionComplete,
      salaryEstimated: false,
      postedAt: null,
    });
  }
  async search() {
    return {
      jobs: [],
      rejectedCount: 0,
      pagination: { page: 1, pageSize: 0, total: 0, nextPage: null },
    };
  }
}
