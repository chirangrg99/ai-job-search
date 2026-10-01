import { buildRelevantCandidateContext } from "../../src/features/retrieval";
import { mixedProfile, developerJob } from "./retrieval";
import {
  claimsOf,
  type Claim,
  type ResumeDraft,
} from "../../src/features/resume/schema";
export const resumeClaim = (
  text: string,
  sourceId: string,
  field: string,
  quote = text,
): Claim => ({ text, sources: [{ sourceId, field, quote }] });
export function resumeDraft(): ResumeDraft {
  return {
    headline: resumeClaim(
      "Frontend Developer",
      "experience:developer",
      "title",
    ),
    professionalSummary: [
      resumeClaim(
        "Delivered React interfaces.",
        "bullet:react-bullet",
        "original_text",
        "Delivered React interfaces and reduced load time by 20%.",
      ),
    ],
    skills: [
      resumeClaim("React", "fact:react", "title"),
      resumeClaim("TypeScript", "fact:typescript", "title"),
    ],
    experiences: [
      {
        sourceId: "experience:developer",
        bullets: [
          resumeClaim(
            "Delivered React interfaces and reduced load time by 20%.",
            "bullet:react-bullet",
            "original_text",
          ),
        ],
      },
    ],
    projects: [],
    education: ["education:education"],
    licencesCertifications: [],
  };
}
export const approvedReview = (draft: ResumeDraft) => ({
  claims: claimsOf(draft).map((c) => ({
    path: c.path,
    verdict: "supported" as const,
    reason: "Directly supported by cited evidence.",
  })),
});
export async function resumeFixture() {
  const job = developerJob();
  const { context, selection } = await buildRelevantCandidateContext(
    job,
    mixedProfile(),
  );
  return { job, context, selection, draft: resumeDraft() };
}
