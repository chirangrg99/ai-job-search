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

it.skipIf(!enabled)(
  "keeps anonymous snippet title and company unknown",
  async () => {
    const source =
      "Company Overview: The hiring organization provides global businesses with solutions for international payments, currency risk management, and growth support. Role Function and Purpose: As part of an agile team, you will contribute to advancing core international payment proce…";
    const result = await new OpenAIClient(
      process.env.OPENAI_API_KEY!,
    ).parseJobDescription(
      source,
      process.env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
    );
    const parsed = validateParsedJob(result.output, source);
    expect(parsed.title).toBeNull();
    expect(parsed.company).toBeNull();
  },
);

it.skipIf(!enabled)(
  "does not promote development benefits to duties or required skills",
  async () => {
    const source =
      "Software Application Developer Hybrid in Montreal Jeppesen ForeFlight is seeking a Software Application Developer with a passion for aviation. This position reports to the manager of Americas Production Configuration Services working out of the Montreal, Quebec office. This is a customer-facing position that will allow you to grow technically and enable opportunities to fine-tune soft skills such as problem solving and customer communication as well as provide you with business knowledge of thi…";
    const result = await new OpenAIClient(
      process.env.OPENAI_API_KEY!,
    ).parseJobDescription(
      source,
      process.env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
    );
    const parsed = validateParsedJob(result.output, source);
    expect(parsed.title?.text).toBe("Software Application Developer");
    expect(parsed.company?.text).toBe("Jeppesen ForeFlight");
    expect(parsed.responsibilities).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.employmentType).toBeNull();
    expect(parsed.scheduleRequirements).toEqual([]);
  },
);
