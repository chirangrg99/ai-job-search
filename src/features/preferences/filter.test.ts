import { describe, expect, it } from "vitest";
import { containsTerm, filterJob, type FilterJob } from "./filter";
import { emptyPreference, type Preference } from "./schema";
const run = (job: FilterJob = {}, overrides: Partial<Preference> = {}) =>
  filterJob(job, { ...emptyPreference, name: "Search", ...overrides });
const code = (result: ReturnType<typeof run>, code: string, outcome: string) =>
  expect(result.reasons).toContainEqual(
    expect.objectContaining({ code, outcome }),
  );
it("allows unconstrained jobs and returns complementary flags", () =>
  expect(run()).toEqual({
    pass: true,
    fail: false,
    reasons: [expect.objectContaining({ outcome: "pass" })],
  }));
it("does not process paused searches", () =>
  code(run({}, { enabled: false }), "search_paused", "fail"));
describe("title and keyword rules", () => {
  it.each([
    ["Senior Frontend Developer", "frontend developer", true],
    ["Writer", "IT", false],
    ["IT Support", "it", true],
    ["C++ Developer", "C++", true],
    ["C# Developer", "C++", false],
    ["React developer", "React", true],
    ["ReactNative developer", "React", false],
    ["ＮＯＤＥ developer", "node", true],
    ["Développeur logiciel", "développeur", true],
    ["a.b", "a.b", true],
    ["axb", "a.b", false],
  ])("phrase boundary %s / %s", (text, term, expected) =>
    expect(containsTerm(text, term)).toBe(expected),
  );
  it("accepts any target title", () =>
    expect(
      run(
        { title: "Senior Frontend Developer" },
        { target_titles: ["Help Desk", "Frontend Developer"] },
      ).pass,
    ).toBe(true));
  it("rejects a known non-target title", () =>
    code(
      run({ title: "Driver" }, { target_titles: ["Developer"] }),
      "title_mismatch",
      "fail",
    ));
  it("keeps unknown titles eligible", () =>
    code(
      run({}, { target_titles: ["Developer"] }),
      "title_unknown",
      "unknown",
    ));
  it("exclusion wins over inclusion", () =>
    expect(
      run(
        { title: "Senior Developer" },
        { target_titles: ["Developer"], excluded_titles: ["Senior"] },
      ).fail,
    ).toBe(true));
  it("requires every keyword with complete description", () =>
    code(
      run(
        {
          title: "Developer",
          description: "TypeScript",
          descriptionComplete: true,
        },
        { keywords: ["TypeScript", "SQL"] },
      ),
      "required_keywords_missing",
      "fail",
    ));
  it("does not reject absent keywords in incomplete text", () => {
    const r = run({ description: "TypeScript" }, { keywords: ["SQL"] });
    expect(r.pass).toBe(true);
    code(r, "required_keywords_missing", "unknown");
  });
  it("rejects observed excluded keyword even in incomplete description", () =>
    expect(
      run(
        { description: "Night shift" },
        { excluded_keywords: ["night shift"] },
      ).fail,
    ).toBe(true));
  it("blank descriptions remain unknown even marked complete", () =>
    expect(
      run({ description: "", descriptionComplete: true }, { keywords: ["SQL"] })
        .pass,
    ).toBe(true));
  it("does not search keywords across field boundaries", () =>
    expect(
      run(
        {
          title: "Customer",
          description: "service",
          descriptionComplete: true,
        },
        { keywords: ["customer service"] },
      ).fail,
    ).toBe(true));
});
describe("structured location, work mode, employment and commute", () => {
  it("rejects confirmed work mode mismatch", () =>
    expect(
      run(
        { remoteType: "onsite" },
        { remote_preferences: ["remote", "hybrid"] },
      ).fail,
    ).toBe(true));
  it("unknown mode stays eligible", () =>
    expect(run({}, { remote_preferences: ["remote"] }).pass).toBe(true));
  it("accepts one employment type", () =>
    expect(
      run(
        {
          employmentTypes: ["contract", "full_time"],
          employmentTypesComplete: true,
        },
        { employment_types: ["full_time"] },
      ).pass,
    ).toBe(true));
  it("rejects complete type mismatch", () =>
    expect(
      run(
        { employmentTypes: ["part_time"], employmentTypesComplete: true },
        { employment_types: ["full_time"] },
      ).fail,
    ).toBe(true));
  it("retains incomplete employment data", () =>
    expect(
      run(
        { employmentTypes: ["part_time"] },
        { employment_types: ["full_time"] },
      ).pass,
    ).toBe(true));
  it("matches any canonical location case-insensitively", () =>
    expect(
      run(
        { locations: [" Toronto, ON "], locationsComplete: true },
        { target_locations: ["Ottawa, ON", "toronto, on"] },
      ).pass,
    ).toBe(true));
  it("does not bypass remote geographic restrictions", () =>
    expect(
      run(
        { locations: ["USA"], locationsComplete: true, remoteType: "remote" },
        { target_locations: ["Canada"] },
      ).fail,
    ).toBe(true));
  it("free-form or incomplete locations do not establish mismatch", () =>
    expect(
      run(
        { locations: ["Greater Toronto Area"] },
        { target_locations: ["Toronto"] },
      ).pass,
    ).toBe(true));
  it.each([
    [49, true],
    [50, true],
    [50.01, false],
    [0, true],
  ])("commute %s at max50", (distance, pass) =>
    expect(
      run({ commuteKm: distance, remoteType: "hybrid" }, { max_commute_km: 50 })
        .pass,
    ).toBe(pass),
  );
  it.each([null, undefined, -1, NaN, Infinity])(
    "unknown/invalid distance %s",
    (distance) =>
      code(
        run({ commuteKm: distance }, { max_commute_km: 0 }),
        "commute_unknown",
        "unknown",
      ),
  );
  it("fully remote work skips commute only", () =>
    expect(
      run({ remoteType: "remote", commuteKm: 500 }, { max_commute_km: 10 })
        .pass,
    ).toBe(true));
});
describe("salary comparisons", () => {
  const pref = {
    min_salary: 100,
    salary_currency: "CAD",
    salary_period: "hour" as const,
  };
  it.each([
    [50, 99, false],
    [50, 100, true],
    [100, 120, true],
    [null, 99, false],
    [50, null, true],
    [100, null, true],
    [null, null, true],
  ])("range %s–%s", (min, max, pass) =>
    expect(
      run({ salary: { min, max, currency: "CAD", period: "hour" } }, pref).pass,
    ).toBe(pass),
  );
  it("overlap is explicitly unconfirmed", () =>
    code(
      run(
        { salary: { min: 90, max: 120, currency: "CAD", period: "hour" } },
        pref,
      ),
      "salary_unconfirmed",
      "unknown",
    ));
  it.each([
    { currency: "USD", period: "hour" as const },
    { currency: "CAD", period: "year" as const },
    { currency: null, period: "hour" as const },
    { currency: "CAD", period: null },
  ])("does not compare incompatible units %o", (salary) =>
    code(
      run({ salary: { ...salary, max: 1 } }, pref),
      "salary_incomparable",
      "unknown",
    ),
  );
  it.each([
    [200, 100],
    [-1, 10],
    [NaN, 10],
    [0, Infinity],
  ])("invalid range %s–%s", (min, max) =>
    code(
      run({ salary: { min, max, currency: "CAD", period: "hour" } }, pref),
      "salary_invalid",
      "unknown",
    ),
  );
  it("zero salary is not treated as absent", () =>
    expect(
      run(
        { salary: { max: 0, currency: "CAD", period: "hour" } },
        { ...pref, min_salary: 1 },
      ).fail,
    ).toBe(true));
  it("missing salary stays eligible with a reason", () => {
    const r = run({}, pref);
    expect(r.pass).toBe(true);
    code(r, "salary_incomparable", "unknown");
  });
});
describe("fit scores and independent strategies", () => {
  it.each([
    [79, false],
    [80, true],
    [100, true],
    [null, true],
    [NaN, true],
    [101, true],
  ])("fit score %s", (score, pass) =>
    expect(run({ fitScore: score }, { minimum_fit_score: 80 }).pass).toBe(pass),
  );
  it("fit not generated by filter", () =>
    code(run({}, { minimum_fit_score: 80 }), "fit_pending", "unknown"));
  it("same job can pass one search and fail another without mutation", () => {
    const job = { title: "Delivery Driver" };
    const a = { ...emptyPreference, name: "A", target_titles: ["Driver"] };
    const b = { ...emptyPreference, name: "B", target_titles: ["Developer"] };
    const before = JSON.stringify([job, a, b]);
    expect(filterJob(job, a).pass).toBe(true);
    expect(filterJob(job, b).fail).toBe(true);
    expect(JSON.stringify([job, a, b])).toBe(before);
  });
  it("returns all clear reasons, not just the first", () => {
    const r = run(
      { title: "Driver", remoteType: "onsite", commuteKm: 100 },
      {
        target_titles: ["Developer"],
        remote_preferences: ["remote"],
        max_commute_km: 20,
      },
    );
    expect(r.reasons.filter((x) => x.outcome === "fail")).toHaveLength(3);
  });
});
