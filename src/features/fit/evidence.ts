import type { CandidateProfile } from "@/features/profile/model";
import { itemTitle } from "@/features/profile/model";
import { parseProfileDate } from "@/features/profile/dates";
import type { CandidateEvidence } from "./model";
export const canonical = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^[•−\s]+|[.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
const tags = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
/** Conservative bounds: latest possible start, earliest possible end. Unknown dates earn no duration. */
export function dateBound(value: string, latest: boolean): string | null {
  try {
    return parseProfileDate(value, latest).date;
  } catch {
    return null;
  }
}
export function verifiedEvidence(
  profile: CandidateProfile,
  asOf: string,
): CandidateEvidence[] {
  const verifiedRoles = new Map(
    profile.items
      .filter((i) => i.kind === "experience" && i.verified)
      .map((i) => [i.id, i]),
  );
  return profile.items
    .flatMap((item): CandidateEvidence[] => {
      if (!item.verified || item.kind === "personal" || item.kind === "summary")
        return [];
      const v = item.values,
        s = (key: string) =>
          typeof v[key] === "string" ? (v[key] as string) : "";
      const parent =
        item.kind === "bullet" ? verifiedRoles.get(s("experience_id")) : null;
      if (item.kind === "bullet" && !parent) return [];
      if (item.kind === "credential" || item.kind === "fact") {
        const from = dateBound(s("valid_from"), true),
          to = dateBound(s("valid_to"), false);
        if ((from && from > asOf) || (to && to < asOf)) return [];
      }
      const role = parent?.values ?? v;
      if (
        (item.kind === "experience" || parent) &&
        (dateBound(String(role.start_date ?? ""), false) ?? "") > asOf
      )
        return [];
      const start =
        item.kind === "experience" || parent
          ? dateBound(String(role.start_date ?? ""), true)
          : null;
      const end =
        item.kind === "experience" || parent
          ? role.currently_employed === true
            ? asOf
            : dateBound(String(role.end_date ?? ""), false)
          : null;
      const claims =
        item.kind === "fact"
          ? [s("title"), s("value_text"), s("description")]
          : item.kind === "credential"
            ? [s("title")]
            : item.kind === "bullet"
              ? [...tags(s("skills")), s("original_text")]
              : item.kind === "project"
                ? [
                    ...tags(s("technologies")),
                    s("description"),
                    s("achievements"),
                  ]
                : item.kind === "education"
                  ? [`${s("credential")} ${s("field_of_study")}`.trim()]
                  : [s("title")];
      const quote = [
        ...new Set([
          itemTitle(item),
          item.kind === "bullet" ? s("original_text") : s("description"),
          item.kind === "education" ? claims[0] : "",
          item.kind === "project" ? s("technologies") : "",
          item.kind === "bullet" ? s("skills") : "",
          s("value_text"),
          s("achievements"),
          ...(item.kind === "experience"
            ? [
                s("company"),
                `Start: ${s("start_date") || "Unknown"}; end: ${v.currently_employed === true ? "Current" : s("end_date") || "Unknown"}`,
              ]
            : []),
        ]),
      ]
        .filter(Boolean)
        .join("\n");
      return [
        {
          id: item.id,
          kind: item.kind,
          revision: String(item.revision),
          label: itemTitle(item),
          quote,
          claims: claims.filter(Boolean),
          start,
          end,
          parentId: parent?.id ?? null,
          sensitive: s("sensitivity") === "sensitive",
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function durationYears(
  evidence: CandidateEvidence[],
  asOf: string,
): number {
  const ranges = evidence
    .flatMap((e) =>
      e.start && e.end && e.start <= e.end && e.start <= asOf
        ? [
            [
              Date.parse(e.start),
              Date.parse(e.end < asOf ? e.end : asOf),
            ] as const,
          ]
        : [],
    )
    .sort((a, b) => a[0] - b[0]);
  if (!ranges.length) return 0;
  const merged: [number, number][] = [];
  let start = ranges[0]![0],
    end = ranges[0]![1];
  for (const [a, b] of ranges.slice(1)) {
    if (a > end) {
      merged.push([start, end]);
      start = a;
      end = b;
    } else end = Math.max(end, b);
  }
  merged.push([start, end]);
  function anniversary(date: Date, months: number) {
    const first = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
    );
    const last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return Date.UTC(
      first.getUTCFullYear(),
      first.getUTCMonth(),
      Math.min(date.getUTCDate(), last),
    );
  }
  return (
    merged.reduce((sum, [a, b]) => {
      const from = new Date(a),
        to = new Date(b);
      let months =
        (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
        to.getUTCMonth() -
        from.getUTCMonth();
      if (anniversary(from, months) > b) months--;
      const current = anniversary(from, months),
        next = anniversary(from, months + 1);
      return sum + months + (b - current) / (next - current);
    }, 0) / 12
  );
}
