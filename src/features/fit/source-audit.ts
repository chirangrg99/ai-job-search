import { canonical } from "./evidence";
export type SourceConflict = {
  subject: string;
  priority: "required" | "preferred";
  passages: string[];
};
const subjects: Record<string, string> = {
  "software development and programming": "software development",
  "développement logiciel et en programmation": "software development",
  python: "python",
  "linux/unix": "linux/unix",
};
const numbers: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
};
/** Bounded audit of explicit English/French minimum-tenure wording, not a general translation/parser. */
export function auditExperienceConflicts(source: string): SourceConflict[] {
  const sections = [
    ...source.matchAll(
      /Basic Qualifications|Required Qualifications|Preferred Qualifications|Qualifications de base|Qualifications préférentielles|Key Responsibilities|Principales responsabilités|About(?: us| the company)?|Why You Should Join|Benefits|Avantages|À propos de/giu,
    ),
  ];
  const patterns = [
    /\b(\d+(?:\.\d+)?)\+?\s*(years?|months?)[’']?\s*(?:of\s+)?experience\s+(?:with|in)\s+(software development and programming|python)\b/giu,
    /\b(\d+(?:\.\d+)?)\+?\s*(years?|months?)[’']?\s*experience effectively working in a (linux\/unix) environment/giu,
    /\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\d+)\s*(ans?|mois)\s*(?:ou plus\s*)?d[’']expérience\s+(?:en |du langage )(développement logiciel et en programmation|python)\b/giu,
    /\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\d+)\s*(ans?|mois)\s*(?:ou plus\s*)?d[’']expérience de travail efficace dans un environnement (linux\/unix)/giu,
  ];
  const groups = new Map<
    string,
    {
      subject: string;
      priority: SourceConflict["priority"];
      rows: { months: number; language: string; text: string }[];
    }
  >();
  patterns.forEach((pattern, index) => {
    for (const match of source.matchAll(pattern)) {
      const heading =
        sections.filter((s) => s.index < match.index).at(-1)?.[0] ?? "";
      const priority = /Preferred|préférentielles/iu.test(heading)
        ? "preferred"
        : /Basic|Required|de base/iu.test(heading)
          ? "required"
          : null;
      if (!priority) continue;
      const subject = subjects[canonical(match[3]!)];
      if (!subject) continue;
      const amount = numbers[canonical(match[1]!)] ?? Number(match[1]);
      const months = amount * (/month|mois/iu.test(match[2]!) ? 1 : 12);
      const key = `${priority}:${subject}`,
        group = groups.get(key) ?? { subject, priority, rows: [] };
      group.rows.push({
        months,
        language: index < 2 ? "en" : "fr",
        text: match[0],
      });
      groups.set(key, group);
    }
  });
  return [...groups.values()]
    .filter(
      (g) =>
        new Set(g.rows.map((r) => r.language)).size > 1 &&
        new Set(g.rows.map((r) => r.months)).size > 1,
    )
    .map((g) => ({
      subject: g.subject,
      priority: g.priority,
      passages: [...new Set(g.rows.map((r) => r.text))],
    }))
    .sort((a, b) =>
      `${a.priority}:${a.subject}`.localeCompare(`${b.priority}:${b.subject}`),
    );
}
export function affectedByConflict(
  text: string,
  conflict: SourceConflict,
): boolean {
  const normalized = canonical(text);
  // Both the threshold and activity must be present; unrelated duties/technology tags are unaffected.
  return conflict.passages.some(
    (p) =>
      normalized.includes(canonical(p)) || canonical(p).includes(normalized),
  );
}
