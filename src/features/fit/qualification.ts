import { canonical } from "./evidence";
/** Reviewed spelling expansions only. No broader skill, degree-level or jurisdiction inference. */
const aliases: Record<string, string> = {
  js: "javascript",
  reactjs: "react",
  "react.js": "react",
  nodejs: "node.js",
  ts: "typescript",
};
export function qualification(value: string): string {
  let text = canonical(value).replace(
    / (?:is required|is preferred|required|preferred)$/u,
    "",
  );
  text = text.replace(
    /^(?:required:\s*|must (?:have|possess) |(?:a |an )?valid |(?:hands-on )?experience (?:with|in|using) |knowledge of |proficiency in |proficient in )/u,
    "",
  );
  text = text
    .replace(/^b\.?sc\.?\s+/u, "bachelor of science ")
    .replace(/^m\.?sc\.?\s+/u, "master of science ")
    .replace(/^b\.?a\.?\s+/u, "bachelor of arts ");
  text = text.replace(
    /^(bachelor of science|master of science|bachelor of arts) (?:degree )?(?:in )?/u,
    "$1 ",
  );
  text = text.replace(
    /^(?:class )?([a-z]{1,2}) (?:driver'?s? )?licen[cs]e$/u,
    "$1 licence",
  );
  return aliases[text] ?? text;
}
export const negativeClaim =
  /\b(no|not|without|never|lack|lacks|learning|beginner|expired)\b/i;
export type Conditions =
  { atom: string } | { operator: "and" | "or"; children: Conditions[] };
/** Mixed ungrouped operators are ambiguous, rather than silently choosing a precedence. */
export function conditions(value: string, depth = 0): Conditions | null {
  if (depth > 5) return null;
  let text = value.trim();
  let level = 0;
  const cuts: { start: number; end: number; operator: "and" | "or" }[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") level++;
    else if (text[i] === ")") {
      level--;
      if (level < 0) return null;
    } else if (level === 0) {
      const match = text.slice(i).match(/^(?:\s+(and|or)\s+|,\s*(?:and\s+)?)/u);
      if (match) {
        cuts.push({
          start: i,
          end: i + match[0].length,
          operator: match[1] === "or" ? "or" : "and",
        });
        i += match[0].length - 1;
      }
    }
  }
  if (level !== 0) return null;
  if (!cuts.length) {
    if (text.startsWith("(") && text.endsWith(")"))
      return conditions(text.slice(1, -1), depth + 1);
    return text ? { atom: qualification(text) } : null;
  }
  if (new Set(cuts.map((c) => c.operator)).size > 1 || cuts.length > 20)
    return null;
  let start = 0;
  const children: Conditions[] = [];
  for (const cut of cuts) {
    const child = conditions(text.slice(start, cut.start), depth + 1);
    if (!child) return null;
    children.push(child);
    start = cut.end;
  }
  text = text.slice(start);
  const last = conditions(text, depth + 1);
  if (!last) return null;
  children.push(last);
  return { operator: cuts[0]!.operator, children };
}
