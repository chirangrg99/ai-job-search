import { expect, it } from "vitest";
import { matchJobToProfile, initialMatches, scoreMatches } from "./engine";
import { verifiedEvidence, durationYears } from "./evidence";
import { emptyPreference } from "@/features/preferences/schema";
import { emptyParsedJob } from "../../../tests/fixtures/job-descriptions";
import {
  strongInput,
  strongJob,
  strongProfile,
  input,
  item,
  requirement,
  asOf,
} from "../../../tests/fixtures/fit";
it("scores an obvious strong match with traceable verified sources", () => {
  const r = matchJobToProfile(strongInput());
  expect(r.fitScore).toBe(100);
  expect(r.recommendation).toBe("strong_apply");
  expect(r.matchedRequirements.every((m) => m.sources.length)).toBe(true);
});
it("scores a poor match without inventing adjacent skills", () => {
  const r = matchJobToProfile(
    input([item("java", "fact", { title: "Java" })], strongJob()),
  );
  expect(r.fitScore).toBe(0);
  expect(r.recommendation).toBe("skip");
  expect(r.matchedRequirements).toHaveLength(0);
});
it("caps an otherwise strong profile missing a mandatory licence", () => {
  const i = strongInput();
  i.parsed.licences = [requirement("Valid DZ licence")];
  const r = matchJobToProfile(i);
  expect(r.fitScore).toBeLessThanOrEqual(39);
  expect(r.recommendation).toBe("skip");
  expect(
    r.missingRequiredRequirements.some((m) => m.category === "credentials"),
  ).toBe(true);
});
it("missing preferred qualifications cost less than missing required qualifications", () => {
  const i = strongInput();
  i.parsed.preferredQualifications.push({
    text: "Docker",
    evidence: "Docker",
    priority: "preferred",
  });
  const preferred = matchJobToProfile(i);
  i.parsed.preferredQualifications.pop();
  i.parsed.requiredQualifications = [
    { text: "Docker", evidence: "Docker", priority: "required" },
  ];
  const required = matchJobToProfile(i);
  expect(preferred.fitScore).toBeGreaterThan(required.fitScore);
  expect(preferred.missingPreferredRequirements).toHaveLength(1);
});
it("labels transferable evidence and never gives exact credit", () => {
  const i = input([item("customer", "fact", { title: "Customer service" })], {
    ...emptyParsedJob(),
    skills: [requirement("Client communication")],
  });
  const matches = initialMatches(i);
  matches[0] = {
    ...matches[0]!,
    status: "transferable",
    sources: [i.candidates[0]!],
    method: "semantic",
  };
  const r = scoreMatches(i, matches);
  expect(r.fitScore).toBe(25);
  expect(r.partialRequirements[0]?.status).toBe("transferable");
  expect(r.matchedRequirements).toHaveLength(0);
});
it("shows insufficient evidence for an empty/unverified profile", () => {
  const i = input(
    [item("react", "fact", { title: "React" }, false)],
    strongJob(),
  );
  const r = matchJobToProfile(i);
  expect(r.sufficientEvidence).toBe(false);
  expect(r.recommendation).toBe("maybe");
  expect(r.fitScore).toBe(0);
});
it("same stored inputs produce exactly the same result", () =>
  expect(matchJobToProfile(strongInput())).toEqual(
    matchJobToProfile(strongInput()),
  ));
it("duplicate passages across groups do not count twice", () => {
  const i = strongInput();
  i.parsed.technologies = [...i.parsed.skills];
  expect(matchJobToProfile(i)).toEqual(matchJobToProfile(strongInput()));
});
it("conflicting priorities remain ambiguous", () => {
  const i = strongInput();
  i.parsed.requiredQualifications = [
    { text: "React", evidence: "React", priority: "required" },
  ];
  expect(
    matchJobToProfile(i).matches.find((m) => m.text === "React")?.status,
  ).toBe("unknown");
});
it("unverified roles invalidate dependent bullet evidence", () => {
  const p = {
    items: [
      item("role", "experience", { title: "Developer" }, false),
      item("bullet", "bullet", {
        experience_id: "role",
        skills: "Python",
        original_text: "Built Python tools",
      }),
    ],
  };
  expect(verifiedEvidence(p, asOf)).toHaveLength(0);
});
it("expired or future credentials receive no credit", () => {
  const p = {
    items: [
      item("old", "credential", { title: "DZ licence", valid_to: "2025" }),
      item("future", "credential", { title: "DZ licence", valid_from: "2027" }),
    ],
  };
  expect(verifiedEvidence(p, asOf)).toHaveLength(0);
});
it("uses conservative partial dates and merges overlapping roles", () => {
  const p = {
    items: [
      item("a", "experience", {
        title: "Developer",
        start_date: "2020",
        end_date: "2022",
      }),
      item("b", "experience", {
        title: "Developer",
        start_date: "2021",
        end_date: "2023",
      }),
    ],
  };
  const sources = verifiedEvidence(p, asOf);
  expect(durationYears(sources, asOf)).toBeLessThan(2.01);
  expect(durationYears(sources, asOf)).toBeGreaterThan(1.99);
});
it("current roles use the stored evaluation date and never future tenure", () => {
  const p = {
    items: [
      item("a", "experience", {
        title: "Developer",
        start_date: "2025-09-21",
        currently_employed: true,
      }),
      item("future", "experience", {
        title: "Developer",
        start_date: "2028-01-01",
        currently_employed: true,
      }),
    ],
  };
  expect(durationYears(verifiedEvidence(p, asOf), asOf)).toBeCloseTo(1, 2);
});
it("unknown dates and skill-only evidence cannot establish years", () => {
  const i = input([item("python", "fact", { title: "Python" })], {
    ...emptyParsedJob(),
    experienceRequirements: [requirement("2 years experience with Python")],
  });
  expect(matchJobToProfile(i).fitScore).toBe(0);
});
it("partial conjunction is never an exact match", () => {
  const i = input([item("r", "fact", { title: "React" })], {
    ...emptyParsedJob(),
    skills: [requirement("React and TypeScript")],
  });
  expect(matchJobToProfile(i).partialRequirements[0]?.status).toBe("partial");
});
it("honors OR alternatives", () => {
  const i = input([item("r", "fact", { title: "React" })], {
    ...emptyParsedJob(),
    skills: [requirement("React or Vue")],
  });
  expect(matchJobToProfile(i).fitScore).toBe(100);
});
it.each(["JavaScript", "C++", "C#"])(
  "does not credit adjacent language %s from C or Java",
  (technology) => {
    const i = input(
      [item("r", "fact", { title: "Java" }), item("c", "fact", { title: "C" })],
      { ...emptyParsedJob(), skills: [requirement(technology)] },
    );
    expect(matchJobToProfile(i).matchedRequirements).toHaveLength(0);
  },
);
it("does not credit negated profile claims or infer legal declarations", () => {
  const i = input([item("x", "fact", { title: "No Python experience" })], {
    ...emptyParsedJob(),
    skills: [requirement("Python")],
    workAuthorizationWording: {
      text: "Must be legally able to work in Canada",
      evidence: "Must be legally able to work in Canada",
    },
  });
  expect(matchJobToProfile(i).matchedRequirements).toHaveLength(0);
});
it("job with no extracted requirements cannot score 100 from a saved search", () => {
  const i = input(strongProfile.items, emptyParsedJob());
  expect(matchJobToProfile(i).sufficientEvidence).toBe(false);
});
it("compares salary only within the same currency and period", () => {
  const i = strongInput();
  i.search = {
    ...emptyPreference,
    id: "search",
    name: "Search",
    updated_at: "2026-09-20T00:00:00Z",
    min_salary: 60000,
    salary_currency: "CAD",
    salary_period: "year",
  };
  i.parsed.salary = {
    minimum: 70000,
    maximum: 80000,
    currency: "USD",
    period: "year",
    evidence: "USD 70000–80000 per year",
  };
  expect(
    matchJobToProfile(i).matches.find((m) => m.id === "compensation")?.status,
  ).toBe("unknown");
  i.parsed.salary.currency = "CAD";
  expect(
    matchJobToProfile(i).matches.find((m) => m.id === "compensation")?.status,
  ).toBe("exact");
  i.parsed.salary.minimum = 50000;
  expect(
    matchJobToProfile(i).matches.find((m) => m.id === "compensation")?.status,
  ).toBe("partial");
});
it("requires exact location and known work arrangement without guessing commute", () => {
  const i = strongInput();
  i.search = {
    ...emptyPreference,
    id: "search",
    name: "Local",
    updated_at: "2026-09-20T00:00:00Z",
    target_locations: ["Toronto"],
    remote_preferences: ["remote"],
    max_commute_km: 10,
  };
  i.parsed.location = {
    text: "Toronto, Ontario",
    evidence: "Toronto, Ontario",
  };
  i.remoteType = "onsite";
  const r = matchJobToProfile(i);
  expect(r.matches.find((m) => m.id === "location")?.status).toBe("unknown");
  expect(r.matches.find((m) => m.id === "work-mode")?.status).toBe("missing");
  expect(r.matches.find((m) => m.id === "commute")?.status).toBe("unknown");
});
it("a skill bullet does not prove the skill was used for the entire role", () => {
  const i = input(
    [
      item("role", "experience", {
        title: "Developer",
        start_date: "2020-01-01",
        end_date: "2026-01-01",
      }),
      item("bullet", "bullet", {
        experience_id: "role",
        skills: "Python",
        original_text: "Used Python",
      }),
    ],
    {
      ...emptyParsedJob(),
      experienceRequirements: [requirement("2 years experience with Python")],
    },
  );
  expect(matchJobToProfile(i).fitScore).toBe(0);
});
it("expired time-bound facts are not credited", () => {
  expect(
    verifiedEvidence(
      {
        items: [
          item("old", "fact", {
            title: "Safety clearance",
            valid_to: "2020-01-01",
          }),
        ],
      },
      asOf,
    ),
  ).toHaveLength(0);
});
