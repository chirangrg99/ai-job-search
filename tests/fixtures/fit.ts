import type {
  ProfileItem,
  CandidateProfile,
} from "../../src/features/profile/model";
import { emptyParsedJob } from "./job-descriptions";
import type { ParsedJob } from "../../src/features/job-parser/schema";
import type { FitInput } from "../../src/features/fit/engine";
import { verifiedEvidence } from "../../src/features/fit/evidence";
export const asOf = "2026-09-21";
export function item(
  id: string,
  kind: ProfileItem["kind"],
  values: ProfileItem["values"],
  verified = true,
): ProfileItem {
  return {
    id,
    kind,
    values,
    verified,
    revision: 1,
    verifiedAt: verified ? "2026-09-20T00:00:00Z" : null,
  };
}
export function requirement(
  text: string,
  priority: "required" | "preferred" | "ambiguous" | "unspecified" = "required",
) {
  return { text, evidence: text, priority };
}
export function input(items: ProfileItem[], parsed: ParsedJob): FitInput {
  return {
    candidates: verifiedEvidence({ items }, asOf),
    parsed,
    search: null,
    remoteType: null,
    asOf,
    sourceComplete: true,
  };
}
export const strongProfile: CandidateProfile = {
  items: [
    item("react", "fact", { title: "React", fact_type: "skill" }),
    item("ts", "fact", { title: "TypeScript", fact_type: "skill" }),
    item("role", "experience", {
      title: "Frontend Developer",
      company: "Example",
      start_date: "2022-01-01",
      end_date: "2026-01-01",
      currently_employed: false,
    }),
    item("education", "education", {
      institution: "Example",
      credential: "BSc",
      field_of_study: "Computer Science",
    }),
  ],
};
export function strongJob(): ParsedJob {
  return {
    ...emptyParsedJob(),
    skills: [requirement("React and TypeScript")],
    experienceRequirements: [
      requirement("2+ years experience as a Frontend Developer"),
    ],
    educationRequirements: [requirement("BSc Computer Science")],
    preferredQualifications: [
      { text: "React", evidence: "React", priority: "preferred" },
    ],
  };
}
export function strongInput() {
  return input(strongProfile.items, strongJob());
}
