import { z } from "zod";
import type { CandidateProfile, ProfileItem } from "@/features/profile/model";
import { verifiedEvidence } from "@/features/fit/evidence";
import { parseProfileDate } from "@/features/profile/dates";
import { negativeClaim } from "@/features/fit/qualification";
import {
  RETRIEVAL_CONFIG,
  sourceKinds,
  type ResumeSource,
  type SourceKind,
} from "./model";
export const sourceKey = (s: { kind: string; id: string }) =>
  `${s.kind}:${s.id}`;
const fields: Record<SourceKind, readonly string[]> = {
  fact: ["title", "fact_type", "description", "value_text"],
  credential: [
    "title",
    "fact_type",
    "description",
    "value_text",
    "valid_from",
    "valid_to",
  ],
  experience: [
    "title",
    "company",
    "location",
    "start_date",
    "end_date",
    "currently_employed",
    "employment_type",
  ],
  bullet: ["experience_id", "original_text", "skills"],
  project: ["name", "description", "technologies", "achievements", "url"],
  education: [
    "institution",
    "credential",
    "field_of_study",
    "location",
    "start_date",
    "end_date",
  ],
};
const declarations =
  /\b(work authori[sz]ation|visa|immigration|citizenship|criminal|social insurance|sin number|passport|medical|disability|religion|marital|date of birth)\b/i;
export function checkDate(asOf: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf))
    throw new Error("Use an explicit YYYY-MM-DD evaluation date.");
  parseProfileDate(asOf);
}
export function sourceCharacters(source: ResumeSource) {
  return JSON.stringify(source).length;
}
export type EligibleSource = {
  source: ResumeSource;
  item: ProfileItem;
  claims: string[];
  text: string;
};
export function eligibleSources(
  profile: CandidateProfile,
  asOf: string,
): EligibleSource[] {
  checkDate(asOf);
  const seen = new Set<string>();
  for (const item of profile.items) {
    const key = sourceKey(item);
    if (
      seen.has(key) ||
      !item.id ||
      !Number.isInteger(item.revision) ||
      item.revision < 1
    )
      throw new Error("Invalid or duplicate candidate source identity.");
    seen.add(key);
  }
  const items = new Map(profile.items.map((i) => [sourceKey(i), i]));
  const evidence = verifiedEvidence(profile, asOf);
  return evidence
    .flatMap((e) => {
      const item = items.get(sourceKey(e))!;
      if (!sourceKinds.includes(item.kind as SourceKind)) return [];
      const kind = item.kind as SourceKind,
        values: ResumeSource["values"] = {};
      for (const field of fields[kind]) {
        const value = item.values[field];
        if (value !== undefined) values[field] = value;
      }
      const text = Object.values(values)
        .filter((v) => typeof v === "string")
        .join("\n");
      if (
        e.sensitive ||
        declarations.test(text) ||
        negativeClaim.test(
          e.quote.replace(
            /\b(?:without|no)\s+(?:accidents|incidents|injuries|violations)\b/gi,
            "",
          ),
        )
      )
        return [];
      try {
        for (const field of [
          "start_date",
          "end_date",
          "valid_from",
          "valid_to",
        ]) {
          const value = item.values[field];
          if (typeof value === "string" && value) parseProfileDate(value);
        }
        if (kind === "education") {
          const start = String(values.start_date ?? "");
          if (start && parseProfileDate(start).date! > asOf) return [];
        }
      } catch {
        return [];
      }
      const source: ResumeSource = {
        id: item.id,
        kind,
        revision: item.revision,
        parentId: e.parentId,
        verified: true,
        values,
      };
      if (sourceCharacters(source) > RETRIEVAL_CONFIG.maxSourceCharacters)
        return [];
      return [{ source, item, claims: e.claims, text }];
    })
    .filter(
      (e, _, all) =>
        !e.source.parentId ||
        all.some(
          (p) =>
            p.source.kind === "experience" && p.source.id === e.source.parentId,
        ),
    );
}
export const rankResponseSchema = z
  .array(
    z.strictObject({
      id: z.string(),
      score: z.number().finite().min(0).max(100),
    }),
  )
  .max(RETRIEVAL_CONFIG.maxShortlist);
