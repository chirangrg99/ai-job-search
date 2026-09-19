// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  normalizeCompany,
  normalizeTitle,
  normalizeLocation,
  normalizeUrl,
  normalizeSalary,
  normalizeEmployment,
  normalizeJob,
  whitespace,
} from "./normalize";
import type { DiscoveredJob } from "@/features/discovery/schema";
export const posting: DiscoveredJob = {
  provider: "adzuna",
  externalId: "123",
  title: "Frontend Developer",
  company: "Example, Inc.",
  location: "Toronto, ON",
  country: "CA",
  description:
    "Build accessible customer interfaces with TypeScript and collaborate with the platform team on reliable software delivery.",
  descriptionComplete: true,
  applicationUrl: "https://example.com/jobs/123",
  salaryMin: 50000,
  salaryMax: 70000,
  salaryCurrency: "CAD",
  salaryPeriod: "year",
  salaryEstimated: false,
  employmentType: "full_time",
  remoteType: null,
  postedAt: "2026-09-01T00:00:00Z",
};
it.each([
  ["  A\n B\t C ", "A B C"],
  ["Ｆｒｏｎｔｅｎｄ", "Frontend"],
  ["A\u00a0B", "A B"],
])("normalizes whitespace %s", (a, b) => expect(whitespace(a)).toBe(b));
it.each(["Example, Inc.", "EXAMPLE INC", " Example  Inc "])(
  "company formatting %s",
  (v) => expect(normalizeCompany(v)).toBe("example inc"),
);
it.each([
  "Front-End Developer",
  "FRONT END DEVELOPER",
  "Front / End Developer",
])("title formatting %s", (v) =>
  expect(normalizeTitle(v)).toBe("front end developer"),
);
it.each(["Toronto, ON", " TORONTO ON ", "Toronto — ON"])(
  "location formatting %s",
  (v) => expect(normalizeLocation(v)).toBe("toronto on"),
);
it.each([
  ["C++ Developer", "C Developer"],
  ["C# Developer", "C Developer"],
  ["Developer II", "Developer III"],
  ["React Native Developer", "React Developer"],
])("keeps meaningful distinctions %s", (a, b) =>
  expect(normalizeTitle(a)).not.toBe(normalizeTitle(b)),
);
it.each([
  "utm_source=x",
  "utm_medium=email&utm_campaign=spring",
  "gclid=abc",
  "fbclid=abc",
  "msclkid=abc",
  "UTM_SOURCE=x",
  "mc_eid=abc",
])("removes known tracking %s", (q) =>
  expect(normalizeUrl(`https://example.com/jobs/123?${q}`)).toBe(
    "https://example.com/jobs/123",
  ),
);
it("sorts query keys without removing job identity", () =>
  expect(
    normalizeUrl("https://EXAMPLE.com:443/jobs?z=2&jobId=123&utm_source=x"),
  ).toBe("https://example.com/jobs?jobId=123&z=2"));
it.each([
  "https://example.com/jobs/124",
  "https://example.com/Jobs/123",
  "http://example.com/jobs/123",
  "https://example.com/jobs/123?ref=another",
  "https://example.com/jobs/123#/job/456",
])("does not collapse unknown identity distinctions %s", (u) =>
  expect(normalizeUrl(u)).not.toBe(normalizeUrl(posting.applicationUrl)),
);
it.each([
  null,
  "not a url",
  "javascript:alert(1)",
  "https://user:pass@example.com/job",
])("rejects invalid URL %s", (v) => expect(normalizeUrl(v)).toBeNull());
it("normalizes salary without annualization or currency conversion", () =>
  expect(normalizeSalary(25, 30, " cad ", "hour")).toEqual({
    min: 25,
    max: 30,
    currency: "CAD",
    period: "hour",
  }));
it.each([
  [NaN, -1],
  [Infinity, 10],
  [20, 10],
])("invalid salary fields %s %s", (a, b) => {
  const s = normalizeSalary(a, b, "$", "unknown");
  expect(s.currency).toBeNull();
  expect(s.period).toBeNull();
  expect(s.min === null || s.min >= 0).toBe(true);
  expect(s.max === null || s.min === null || s.max >= s.min).toBe(true);
});
it.each([
  ["Full-Time", "full_time"],
  [" part time ", "part_time"],
  ["permanent", null],
  [null, null],
  ["Contract", "contract"],
])("employment %s", (a, b) => expect(normalizeEmployment(a)).toBe(b));
describe("versioned content fingerprint", () => {
  it("is stable with casing, spacing, company punctuation; preserves raw originals", () => {
    const a = normalizeJob(posting);
    const b = normalizeJob({
      ...posting,
      title: " FRONTEND   DEVELOPER ",
      company: "EXAMPLE INC",
      description: posting.description!.toUpperCase(),
    });
    expect(a.fingerprint).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(a.raw).toEqual(posting);
  });
  it.each([
    { location: "Ottawa, ON" },
    { title: "Backend Developer" },
    { company: "Other Inc" },
    {
      description:
        "Similar role but a different team and different requirements.",
    },
    { country: "US" },
  ])("separates distinct content %o", (change) =>
    expect(normalizeJob({ ...posting, ...change }).fingerprint).not.toBe(
      normalizeJob(posting).fingerprint,
    ),
  );
  it("salary updates retain identity but change update signature", () => {
    const a = normalizeJob(posting),
      b = normalizeJob({ ...posting, salaryMin: 55000 });
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.signature).not.toBe(b.signature);
  });
  it.each([
    { descriptionComplete: false },
    { description: "Short text" },
    { company: null },
    { location: null },
  ])("weak data is never sufficient alone %o", (change) =>
    expect(normalizeJob({ ...posting, ...change }).strongContent).toBe(false),
  );
  it("manual generated IDs and unknown providers are not reliable external identity", () => {
    expect(normalizeJob({ ...posting, provider: "manual" }).reliableId).toBe(
      false,
    );
    expect(normalizeJob({ ...posting, provider: "future" }).reliableId).toBe(
      false,
    );
  });
  it.each([
    "https://example.com",
    "https://example.com/careers",
    "https://example.com/company/jobs",
  ])("listing URL is not a posting identity %s", (applicationUrl) =>
    expect(normalizeJob({ ...posting, applicationUrl }).postingUrl).toBe(false),
  );
});
