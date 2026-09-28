import { expect, it } from "vitest";
import { matchJobToProfile } from "@/features/fit/engine";
import { strongInput } from "../../../tests/fixtures/fit";
import {
  dashboardCounts,
  detailHref,
  jobsHref,
  reviewJobs,
  reviewQuerySchema,
  salaryText,
} from "./model";
import { reviewJobFixture as fixture } from "../../../tests/fixtures/job-review";
const strong = fixture({
  fit: {
    state: "current",
    result: matchJobToProfile(strongInput()),
    preferenceId: null,
    searchName: "Profile only",
    mode: "rules",
    analyzedAt: "2026-09-28T10:00:00Z",
  },
});
it("combines all labelled filters and normalizes text", () => {
  const q = reviewQuerySchema.parse({
    q: " FRONTEND   acme ",
    location: "TORONTO",
    search: strong.searchIds[0],
    remote: "hybrid",
    employment: "full_time",
    source: "adzuna",
    status: "new",
    minFit: "80",
    fit: "strong",
  });
  expect(
    reviewJobs([strong, fixture({ id: "wrong", location: "Ottawa" })], q).items,
  ).toEqual([strong]);
});
it.each([
  "q",
  "location",
  "search",
  "remote",
  "employment",
  "source",
  "status",
])("filters %s independently", (key) => {
  const wrong =
    key === "search"
      ? "83000000-0000-4000-8000-000000000009"
      : key === "status"
        ? "archived"
        : "other";
  expect(
    reviewJobs([strong], reviewQuerySchema.parse({ [key]: wrong })).total,
  ).toBe(0);
});
it("never treats unknown, stale or insufficient fit as zero/current", () => {
  const low = fixture({
    id: "zero",
    fit: {
      ...strong.fit,
      state: "current",
      result: {
        ...matchJobToProfile(strongInput()),
        fitScore: 0,
        sufficientEvidence: true,
        recommendation: "skip",
      },
      preferenceId: null,
      searchName: "Profile only",
      mode: "rules",
      analyzedAt: "now",
    },
  });
  const insufficient = fixture({
    id: "empty",
    fit: {
      ...low.fit,
      state: "current",
      result: {
        ...matchJobToProfile(strongInput()),
        sufficientEvidence: false,
      },
      preferenceId: null,
      searchName: "Profile only",
      mode: "rules",
      analyzedAt: "now",
    },
  });
  expect(
    reviewJobs(
      [fixture(), fixture({ fit: { state: "stale" } }), insufficient, low],
      reviewQuerySchema.parse({ minFit: "0" }),
    ).items,
  ).toEqual([low]);
  expect(
    reviewJobs([insufficient], reviewQuerySchema.parse({ fit: "insufficient" }))
      .total,
  ).toBe(1);
});
it("sorts score descending with unknown last and stable ties", () => {
  expect(
    reviewJobs(
      [fixture({ id: "z" }), strong, { ...strong, id: "b" }],
      reviewQuerySchema.parse({ sort: "fit" }),
    ).items.map((j) => j.id),
  ).toEqual(["b", "job-a", "z"]);
});
it.each(["newest", "oldest", "title", "company", "posted"])(
  "supports %s sorting without mutating inputs",
  (sort) => {
    const a = fixture({
        id: "a",
        title: "Alpha",
        company: "Alpha",
        discoveredAt: "2026-01-01",
        postedAt: "2026-01-01",
      }),
      b = fixture({
        id: "b",
        title: "Beta",
        company: "Beta",
        discoveredAt: "2026-02-01",
        postedAt: "2026-02-01",
      }),
      input = [b, a];
    const first = ["newest", "posted"].includes(sort) ? "b" : "a";
    expect(
      reviewJobs(input, reviewQuerySchema.parse({ sort })).items[0]?.id,
    ).toBe(first);
    expect(input).toEqual([b, a]);
  },
);
it("filters before pagination over more than 50 jobs and clamps page", () => {
  const jobs = Array.from({ length: 105 }, (_, i) =>
    fixture({ id: String(i).padStart(3, "0") }),
  );
  const result = reviewJobs(jobs, reviewQuerySchema.parse({ page: "999" }));
  expect(result).toMatchObject({ page: 6, pages: 6, total: 105 });
  expect(result.items).toHaveLength(5);
});
it("sanitizes hostile query shapes and preserves filter URLs", () => {
  const q = reviewQuerySchema.parse({
    page: ["2"],
    minFit: "NaN",
    search: "bad",
    sort: "bad",
    q: "C++ & React",
  });
  expect(q).toMatchObject({ minFit: null, search: "", sort: "newest" });
  const url = new URL(jobsHref(q, { page: 2 }), "https://local.test");
  expect(url.searchParams.get("q")).toBe("C++ & React");
  expect(url.searchParams.get("page")).toBe("2");
});
it("links to exactly the displayed assessment context", () => {
  expect(detailHref(strong)).toContain("fit=rules");
  const j = fixture({
    fit: {
      state: "current",
      result: matchJobToProfile(strongInput()),
      preferenceId: "saved",
      searchName: "Search",
      mode: "semantic",
      analyzedAt: "now",
    },
  });
  expect(detailHref(j)).toBe("/jobs/job-a?search=saved&fit=semantic");
});
it("keeps missing salary units and estimated amounts explicit", () => {
  expect(
    salaryText(
      fixture({
        salaryPeriod: null,
        salaryCurrency: null,
        salaryEstimated: true,
      }),
    ),
  ).toContain("Currency unknown 50,000–70,000 / period unknown (estimated)");
  expect(salaryText(fixture({ salaryMin: null, salaryMax: null }))).toBe(
    "Salary not provided",
  );
  expect(salaryText(fixture({ salaryMin: 0, salaryMax: null }))).toContain(
    "From 0",
  );
});
it("counts unique stored jobs and recent submissions even after interview progression", () => {
  const now = new Date("2026-09-28T12:00:00Z");
  expect(
    dashboardCounts(
      [
        strong,
        fixture({
          id: "b",
          status: "ready_to_apply",
          discoveredAt: "2026-08-01",
        }),
        fixture({
          id: "c",
          status: "interview",
          submittedAt: "2026-09-20",
          discoveredAt: "2026-08-01",
        }),
        fixture({
          id: "d",
          status: "applied",
          submittedAt: "2026-01-01",
          discoveredAt: "2026-08-01",
        }),
      ],
      now,
    ),
  ).toEqual({ newJobs: 1, strong: 1, ready: 1, applied: 1 });
});
