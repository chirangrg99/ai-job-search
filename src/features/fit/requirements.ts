import {
  requirementGroups,
  type ParsedJob,
} from "@/features/job-parser/schema";
import { canonical } from "./evidence";
import type { Category, FitRequirement } from "./model";
export function buildRequirements(parsed: ParsedJob): FitRequirement[] {
  const map = new Map<string, FitRequirement>();
  // Specialized groups take precedence; a repeated passage earns credit only once.
  const groups = [...requirementGroups].sort(
    (a, b) =>
      Number(
        ["requiredQualifications", "preferredQualifications"].includes(a),
      ) -
      Number(["requiredQualifications", "preferredQualifications"].includes(b)),
  );
  for (const group of groups)
    for (const item of parsed[group]) {
      const key = canonical(item.text);
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
