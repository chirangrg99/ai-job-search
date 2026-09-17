import { describe, expect, it } from "vitest";
import {
  applicationStatuses,
  applicationStatusSchema,
  provenanceSchema,
} from "./domain";
describe("application states", () => {
  it.each(applicationStatuses)("accepts %s", (status) =>
    expect(applicationStatusSchema.parse(status)).toBe(status),
  );
  it("rejects undefined status and invented provenance", () => {
    expect(
      applicationStatusSchema.safeParse("automatically_submitted").success,
    ).toBe(false);
    expect(provenanceSchema.safeParse("probably_true").success).toBe(false);
  });
});
