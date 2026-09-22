import {
  requirementGroups,
  type ParsedJob,
} from "@/features/job-parser/schema";
import { canonical } from "./evidence";
import { qualification } from "./qualification";
import { affectedByConflict, type SourceConflict } from "./source-audit";
import type { Category, FitRequirement } from "./model";
export function buildRequirements(
  parsed: ParsedJob,
  conflicts: SourceConflict[] = [],
): FitRequirement[] {
  const map = new Map<string, FitRequirement>();
  // Specialized groups take precedence; a repeated passage earns credit only once.
  const rank = (group: string) =>
    [
      "licences",
      "certifications",
      "educationRequirements",
      "experienceRequirements",
      "skills",
      "technologies",
    ].includes(group)
      ? 0
      : group === "responsibilities"
        ? 2
        : 1;
  const groups = [...requirementGroups].sort((a, b) => rank(a) - rank(b));
  for (const group of groups)
    for (const item of parsed[group]) {
      const key = qualification(item.text);
      const existing = map.get(key);
      if (existing) {
        if (
          item.priority === "ambiguous" ||
          (existing.priority === "preferred" && item.priority === "required") ||
          (existing.priority === "required" && item.priority === "preferred")
        )
          existing.priority = "ambiguous";
        else if (existing.priority === "unspecified")
          existing.priority = item.priority;
        continue;
      }
      const category: Category =
        group === "licences" ||
        group === "certifications" ||
        /\b(licen[cs]e|certification|certified)\b/i.test(item.text)
          ? "credentials"
          : group === "experienceRequirements" ||
              /\b\d+\+?\s*(years?|months?)\b/i.test(item.text)
            ? "experience"
            : group === "educationRequirements"
              ? "education"
              : group === "skills" || group === "technologies"
                ? "skills"
                : item.priority === "preferred"
                  ? "preferred"
                  : "required";
      map.set(key, {
        id: "",
        text: item.text,
        evidence: item.evidence,
        priority: item.priority,
        category,
      });
    }
  for (const conflict of conflicts) {
    for (const requirement of map.values())
      if (
        requirement.priority === conflict.priority &&
        affectedByConflict(requirement.text, conflict)
      )
        requirement.priority = "ambiguous";
    // Preserve both literal variants in one review item instead of counting each threshold as an independent requirement.
    const covered = [...map.entries()].filter(
      ([, r]) =>
        r.priority === "ambiguous" && affectedByConflict(r.text, conflict),
    );
    for (const [key] of covered) map.delete(key);
    map.set(`conflict:${conflict.priority}:${conflict.subject}`, {
      id: "",
      text: `Conflicting ${conflict.priority} experience: ${conflict.subject}`,
      evidence: conflict.passages.join("\n\n"),
      category: "experience",
      priority: conflict.priority,
      needsReview: true,
    });
  }
  if (parsed.workAuthorizationWording)
    map.set("authorization", {
      id: "",
      ...parsed.workAuthorizationWording,
      priority: "required",
      category: "required",
    });
  return [...map.values()]
    .sort((a, b) => canonical(a.text).localeCompare(canonical(b.text)))
    .map((r, i) => ({ ...r, id: `requirement-${i + 1}` }));
}
