import type { ProfileKind } from "./schema";
export type ProfileItem = {
  id: string;
  kind: ProfileKind;
  revision: number;
  verified: boolean;
  verifiedAt: string | null;
  values: Record<string, string | boolean>;
};
export type CandidateProfile = { items: ProfileItem[] };
export const sectionNames: Record<ProfileKind, string> = {
  personal: "Personal information",
  summary: "Professional summary",
  experience: "Work experience",
  bullet: "Experience bullet",
  education: "Education",
  fact: "Skills / facts",
  credential: "Licences / certifications",
  project: "Projects",
};
export const sections: ProfileKind[] = [
  "personal",
  "summary",
  "experience",
  "education",
  "fact",
  "credential",
  "project",
];
export const categorySuggestions = [
  "software",
  "frontend",
  "backend",
  "cloud",
  "IT support",
  "customer service",
  "driving",
  "delivery",
  "warehouse",
  "safety",
  "general",
];
export function itemTitle(i: ProfileItem): string {
  const v = i.values;
  return String(
    v.full_name ||
      v.title ||
      v.institution ||
      v.name ||
      v.original_text ||
      sectionNames[i.kind],
  );
}
export function hasContent(i: ProfileItem) {
  return i.kind === "personal"
    ? Boolean(i.values.full_name)
    : i.kind === "summary"
      ? Boolean(i.values.professional_summary)
      : true;
}
export function profileHealth(items: ProfileItem[]) {
  const populated = items.filter(hasContent);
  const core = sections.filter((k) => k !== "credential" && k !== "project");
  const missing = core.filter((k) => !populated.some((i) => i.kind === k));
  return {
    completeness: Math.round(
      ((core.length - missing.length) / core.length) * 100,
    ),
    missing,
    verified: populated.filter((i) => i.verified).length,
    unverified: populated.filter((i) => !i.verified).length,
  };
}
