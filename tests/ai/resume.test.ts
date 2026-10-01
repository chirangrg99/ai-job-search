import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  OpenAIResumeClient,
  DEFAULT_RESUME_MODEL,
} from "../../src/server/resume/ai";
import { resumeFixture } from "../fixtures/resume";
import { resumeDraftSchema } from "../../src/features/resume/schema";
import { validateGeneratedApplication } from "../../src/features/resume/validate";
const enabled =
  process.env.RUN_RESUME_AI_INTEGRATION === "1" &&
  Boolean(process.env.OPENAI_API_KEY);
it.skipIf(!enabled)(
  "generates and validates a synthetic resume without acquiring job-only tools",
  async () => {
    const { job, context } = await resumeFixture();
    job.parsed.skills.push({
      text: "Kubernetes",
      evidence: "Kubernetes",
      priority: "required",
    });
    const ai = new OpenAIResumeClient(
      process.env.OPENAI_API_KEY!,
      process.env.OPENAI_RESUME_MODEL ?? DEFAULT_RESUME_MODEL,
    );
    const generated = await ai.generate(job.parsed, context);
    const draft = resumeDraftSchema.parse(generated.output);
    const validation = validateGeneratedApplication(
      draft,
      context,
      await ai.review(draft, context),
    );
    expect(validation.passed, JSON.stringify(validation.issues)).toBe(true);
    expect(JSON.stringify(draft)).not.toContain("Kubernetes");
  },
  150000,
);
