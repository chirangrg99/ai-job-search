import { expect, it } from "vitest";
import { emptyParsedJob } from "../../../tests/fixtures/job-descriptions";
import {
  input,
  item,
  requirement,
  strongInput,
  asOf,
} from "../../../tests/fixtures/fit";
import { matchJobToProfile } from "./engine";
import { auditExperienceConflicts } from "./source-audit";
import { verifiedEvidence, durationYears } from "./evidence";
import { qualification } from "./qualification";
const status = (required: string, claims: string[]) =>
  matchJobToProfile(
    input(
      claims.map((title, i) => item(String(i), "fact", { title })),
      { ...emptyParsedJob(), skills: [requirement(required)] },
    ),
  ).matches[0]?.status;
it.each([
  ["Experience using ReactJS required.", ["React"], "exact"],
  ["React and TypeScript or Vue", ["Vue"], "unknown"],
  ["(React or Vue) and TypeScript", ["Vue", "TypeScript"], "exact"],
  ["(React or Vue) and TypeScript", ["Vue"], "partial"],
  ["React or (Vue and TypeScript)", ["Vue"], "partial"],
  ["React or (Vue and TypeScript)", ["React"], "exact"],
  ["React, TypeScript, and SQL", ["React", "TypeScript", "SQL"], "exact"],
  ["React and (Vue or TypeScript", ["React", "Vue"], "unknown"],
  ["Advanced React", ["React"], "unknown"],
  ["React Native", ["React"], "unknown"],
  ["C++", ["C"], "unknown"],
  ["Research and development", ["Research and development"], "exact"],
] as const)("handles %s conservatively", (text, claims, expected) =>
  expect(status(text, [...claims])).toBe(expected),
);
it("expands specific degree spellings but not levels or fields", () => {
  expect(qualification("B.Sc. Computer Science")).toBe(
    qualification("Bachelor of Science in Computer Science"),
  );
  const i = input(
    [
      item("degree", "education", {
        institution: "Test",
        credential: "BSc",
        field_of_study: "Computer Science",
      }),
    ],
    {
      ...emptyParsedJob(),
      educationRequirements: [
        requirement("Bachelor of Science in Computer Science"),
      ],
    },
  );
  expect(matchJobToProfile(i).fitScore).toBe(100);
  i.parsed.educationRequirements = [
    requirement("Master of Science in Computer Science"),
  ];
  expect(matchJobToProfile(i).fitScore).toBe(0);
});
it("matches spelling variants of the same licence without upgrading its class", () => {
  const i = input([item("dz", "credential", { title: "DZ licence" })], {
    ...emptyParsedJob(),
    licences: [requirement("A valid Class DZ driver's license")],
  });
  expect(matchJobToProfile(i).fitScore).toBe(100);
  i.parsed.licences = [requirement("AZ licence")];
  expect(matchJobToProfile(i).fitScore).toBe(0);
});
it("merges repeated requirements with neutral wrappers or aliases", () => {
  const i = strongInput();
  i.parsed.technologies = [requirement("Experience using ReactJS")];
  i.parsed.skills = [requirement("React")];
  i.parsed.preferredQualifications = [];
  const r = matchJobToProfile(i);
  expect(r.matches.filter((m) => m.category === "skills")).toHaveLength(1);
});
it("accepts minimum occupation tenure wording without inferring skill tenure", () => {
  const i = strongInput();
  i.parsed.experienceRequirements = [
    requirement("At least 2 years of experience as a Frontend Developer"),
  ];
  expect(matchJobToProfile(i).fitScore).toBe(100);
});
it("does not credit a future role or dependent bullet", () => {
  const i = {
    items: [
      item("future", "experience", {
        title: "Developer",
        start_date: "2028-01-01",
        currently_employed: true,
      }),
      item("b", "bullet", {
        experience_id: "future",
        skills: "Python",
        original_text: "Build software",
      }),
    ],
  };
  expect(verifiedEvidence(i, asOf)).toHaveLength(0);
});
it("supports verified dates before the Unix epoch", () => {
  const e = verifiedEvidence(
    {
      items: [
        item("historical", "experience", {
          title: "Driver",
          start_date: "1960-01-01",
          end_date: "1965-01-01",
        }),
      ],
    },
    asOf,
  );
  expect(durationYears(e, asOf)).toBeCloseTo(5, 1);
});
const bilingual = `Basic Qualifications (Required Skills/Experience):
• 2+ years’ experience with software development and programming.
• 6+ months’ experience with Python.
Preferred Qualifications (Education/Experience):
• 2+ years’ experience with software development and programming.
Qualifications de base (compétences/expérience requises) :
• Un an ou plus d’expérience en développement logiciel et en programmation.
• Six mois ou plus d’expérience du langage Python.
Qualifications préférentielles (formation/expérience) :
• Trois ans ou plus d’expérience en développement logiciel et en programmation.`;
it("detects differing thresholds in the same priority across English/French", () => {
  const conflicts = auditExperienceConflicts(bilingual);
  expect(conflicts).toHaveLength(2);
  expect(conflicts.every((c) => c.passages.length === 2)).toBe(true);
  expect(conflicts.some((c) => c.subject === "python")).toBe(false);
  for (const c of conflicts)
    for (const p of c.passages) expect(bilingual).toContain(p);
});
it("does not confuse required and preferred thresholds", () => {
  const source = `Basic Qualifications: 1 year experience with Python.\nQualifications préférentielles: Trois ans ou plus d’expérience du langage Python.`;
  expect(auditExperienceConflicts(source)).toEqual([]);
});
it("does not audit marketing tenure or unknown wording", () => {
  expect(
    auditExperienceConflicts(
      `About us: 2 years experience with Python. Un an ou plus d’expérience du langage Python.`,
    ),
  ).toEqual([]);
});
it("surfaces source conflict even if the parser omitted the French requirement", () => {
  const i = strongInput();
  i.sourceConflicts = auditExperienceConflicts(bilingual);
  i.parsed.experienceRequirements = [
    requirement(
      "2+ years’ experience with software development and programming.",
    ),
  ];
  const r = matchJobToProfile(i);
  expect(r.matches.filter((m) => m.needsReview)).toHaveLength(2);
  expect(r.concerns.some((c) => c.includes("English/French"))).toBe(true);
  expect(r.missingPreferredRequirements.some((m) => m.needsReview)).toBe(true);
  expect(
    r.missingRequiredRequirements.filter((m) => m.needsReview),
  ).toHaveLength(1);
});
it.each([
  ["2025-01-01", "2025-07-01", "6 months experience as a Developer"],
  ["2025-01-01", "2026-01-01", "1 year experience as a Developer"],
])("uses calendar anniversaries for %s through %s", (start, end, text) => {
  const i = input(
    [
      item("role", "experience", {
        title: "Developer",
        start_date: start,
        end_date: end,
      }),
    ],
    { ...emptyParsedJob(), experienceRequirements: [requirement(text)] },
  );
  expect(matchJobToProfile(i).fitScore).toBe(100);
});
it("a positive fact title cannot override a negated source statement", () => {
  const i = input(
    [item("r", "fact", { title: "React", description: "No React experience" })],
    { ...emptyParsedJob(), skills: [requirement("React")] },
  );
  expect(matchJobToProfile(i).fitScore).toBe(0);
});
it("NoSQL is a skill name, not a negation", () =>
  expect(status("NoSQL", ["NoSQL"])).toBe("exact"));
