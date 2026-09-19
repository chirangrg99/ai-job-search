import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { OpenAIClient } from "../../src/server/ai/client";
import { DEFAULT_PARSER_MODEL } from "../../src/server/job-parser/prompt";
import { validateParsedJob } from "../../src/features/job-parser/schema";
import { frontendDescription } from "../fixtures/job-descriptions";
const enabled =
  process.env.RUN_AI_INTEGRATION === "1" && Boolean(process.env.OPENAI_API_KEY);
it.skipIf(!enabled)(
  "extracts an artificial fixture with real Structured Outputs",
  async () => {
    const result = await new OpenAIClient(
      process.env.OPENAI_API_KEY!,
    ).parseJobDescription(
      frontendDescription,
      process.env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
    );
    const parsed = validateParsedJob(result.output, frontendDescription);
    expect(parsed.requiredQualifications.length).toBeGreaterThan(0);
    expect(parsed.preferredQualifications.length).toBeGreaterThan(0);
  },
);
