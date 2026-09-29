import { expect, it, vi } from "vitest";
import {
  buildRelevantCandidateContext,
  materializeCandidateContext,
  retrieveRelevantCandidateFacts,
} from "./retrieve";
import { RETRIEVAL_CONFIG } from "./model";
import { terms } from "./terms";
import {
  developerJob,
  drivingJob,
  mixedProfile,
} from "../../../tests/fixtures/retrieval";
import { item, requirement } from "../../../tests/fixtures/fit";
it("selects technical evidence without unrelated commercial-driving history", async () => {
  const r = await retrieveRelevantCandidateFacts(
    developerJob(),
    mixedProfile(),
  );
  expect(r.selectedCandidateFactIds).toEqual(
    expect.arrayContaining(["react", "typescript", "accessibility"]),
  );
  expect(r.selectedProjectIds).toEqual(["project"]);
  expect(r.selectedEducationIds).toEqual(["education"]);
  expect(r.selectedExperienceIds).toEqual(["developer"]);
  expect(r.selectedExperienceBulletIds).toEqual(["react-bullet"]);
  expect(r.selectedCandidateFactIds).not.toContain("dz");
  expect(r.selectedCandidateFactIds).not.toContain("route");
  expect(
    r.selections.every((s) => s.reasons.length > 0 && s.revision === 1),
  ).toBe(true);
  expect(JSON.stringify(r)).not.toContain("Example Software");
});
it("selects DZ evidence without irrelevant software projects", async () => {
  const r = await retrieveRelevantCandidateFacts(drivingJob(), mixedProfile());
  expect(r.selectedCandidateFactIds).toEqual(
    expect.arrayContaining(["dz", "route"]),
  );
  expect(r.selectedCandidateFactIds).not.toContain("react");
  expect(r.selectedProjectIds).toEqual([]);
  expect(r.selectedEducationIds).toEqual([]);
  expect(r.selectedExperienceIds).toEqual(["driver"]);
  expect(r.selectedExperienceBulletIds).toContain("service-bullet");
});
it("lets explicit customer-service evidence cross careers, retaining only its parent header", async () => {
  const job = developerJob();
  job.parsed.responsibilities = [requirement("Customer service")];
  const r = await retrieveRelevantCandidateFacts(job, mixedProfile());
  expect(r.selectedExperienceBulletIds).toContain("service-bullet");
  expect(r.selectedExperienceIds).toContain("driver");
  expect(r.selectedExperienceBulletIds).not.toContain("driving-bullet");
  expect(r.selections.find((s) => s.id === "service-bullet")?.priority).toBe(
    "transferable",
  );
  expect(r.selections.find((s) => s.id === "driver")?.priority).toBe("context");
});
it("orders required evidence before preferred, achievements and transferable", async () => {
  const r = await retrieveRelevantCandidateFacts(
    developerJob(),
    mixedProfile(),
  );
  const priorities = r.selections
    .filter((s) => s.priority !== "context")
    .map((s) => s.priority);
  expect(priorities.indexOf("preferred")).toBeGreaterThan(
    priorities.lastIndexOf("required"),
  );
});
it("does not infer adjacent skills, licence classes or general overlap", async () => {
  const job = developerJob();
  job.categories = [];
  job.parsed.title = null;
  job.parsed.skills = [requirement("Java")];
  job.parsed.preferredQualifications = [];
  job.parsed.educationRequirements = [];
  const profile = { items: [item("js", "fact", { title: "JavaScript" })] };
  expect(
    (await retrieveRelevantCandidateFacts(job, profile)).selections,
  ).toEqual([]);
  expect(terms("C++ C# .NET Node.js React.js")).toEqual([
    "c++",
    "c#",
    ".net",
    "node.js",
    "react",
  ]);
  const driver = drivingJob();
  driver.parsed.licences = [requirement("AZ licence")];
  expect(
    (await retrieveRelevantCandidateFacts(driver, mixedProfile()))
      .selectedCandidateFactIds,
  ).not.toContain("dz");
});
it("excludes drafts, sensitive items, summaries and personal data from context", async () => {
  const { context } = await buildRelevantCandidateContext(
    developerJob(),
    mixedProfile(),
  );
  expect(JSON.stringify(context)).not.toMatch(
    /private@example|Private health|React expert/,
  );
  expect(
    context.items.some((i) =>
      ["unverified", "sensitive", "personal", "summary"].includes(i.id),
    ),
  ).toBe(false);
  expect(context.items.every((i) => i.verified)).toBe(true);
});
it.each(["unverified", "expired", "future", "malformed"])(
  "excludes %s credentials",
  async (state) => {
    const p = mixedProfile(),
      c = p.items.find((i) => i.id === "dz")!;
    if (state === "unverified") c.verified = false;
    else if (state === "expired") c.values.valid_to = "2025-01-01";
    else if (state === "future") c.values.valid_from = "2030-01-01";
    else c.values.valid_to = "2026-02-31";
    expect(
      (await retrieveRelevantCandidateFacts(drivingJob(), p))
        .selectedCandidateFactIds,
    ).not.toContain("dz");
  },
);
it("excludes orphan bullets and future/unverified parent roles", async () => {
  for (const state of ["missing", "future", "unverified"]) {
    const p = mixedProfile();
    const role = p.items.find((i) => i.id === "developer")!;
    if (state === "missing") p.items = p.items.filter((i) => i !== role);
    else if (state === "future") role.values.start_date = "2030";
    else role.verified = false;
    expect(
      (await retrieveRelevantCandidateFacts(developerJob(), p))
        .selectedExperienceBulletIds,
    ).not.toContain("react-bullet");
  }
});
it("honors compact limits and preserves original source values exactly", async () => {
  const p = mixedProfile();
  for (let n = 0; n < 100; n++)
    p.items.push(
      item(`extra-${n}`, "project", {
        name: `Project ${n}`,
        description: "React " + "x".repeat(1000),
        technologies: "React",
        categories: "software",
      }),
    );
  const result = await buildRelevantCandidateContext(developerJob(), p);
  expect(result.selection.selections.length).toBeLessThanOrEqual(
    RETRIEVAL_CONFIG.maxItems,
  );
  expect(result.selection.sourceCharacters).toBeLessThanOrEqual(
    RETRIEVAL_CONFIG.maxCharacters,
  );
  expect(result.selection.selectedProjectIds.length).toBeLessThanOrEqual(3);
  expect(result.selection.omittedRelevantCount).toBeGreaterThan(0);
  expect(
    result.context.items.find((i) => i.id === "react-bullet")?.values
      .original_text,
  ).toBe(p.items.find((i) => i.id === "react-bullet")!.values.original_text);
  expect(
    result.context.items.every(
      (i) => !("source_reference" in i.values) && !("categories" in i.values),
    ),
  ).toBe(true);
});
it("does not truncate long claims into misleading excerpts", async () => {
  const p = {
    items: [
      item("long", "fact", { title: "React", description: "A".repeat(3000) }),
    ],
  };
  expect(
    (await retrieveRelevantCandidateFacts(developerJob(), p)).selections,
  ).toEqual([]);
});
it("is deterministic under profile reordering", async () => {
  const p = mixedProfile();
  expect(
    await retrieveRelevantCandidateFacts(developerJob(), {
      items: [...p.items].reverse(),
    }),
  ).toEqual(await retrieveRelevantCandidateFacts(developerJob(), p));
});
it("empty or irrelevant profiles produce empty context", async () => {
  expect(
    (await buildRelevantCandidateContext(developerJob(), { items: [] })).context
      .items,
  ).toEqual([]);
});
it("fails closed for invalid dates or duplicate IDs", async () => {
  await expect(
    retrieveRelevantCandidateFacts(
      { ...developerJob(), asOf: "2026-02-31" },
      mixedProfile(),
    ),
  ).rejects.toThrow();
  const p = mixedProfile();
  p.items.push(p.items[0]!);
  await expect(
    retrieveRelevantCandidateFacts(developerJob(), p),
  ).rejects.toThrow(/duplicate/);
});
it.each(["revision", "verification", "job", "date", "forged"])(
  "rejects %s changes before context use",
  async (change) => {
    const p = mixedProfile(),
      job = developerJob(),
      r = await retrieveRelevantCandidateFacts(job, p);
    if (change === "revision")
      p.items.find((i) => i.id === "react")!.revision++;
    if (change === "verification")
      p.items.find((i) => i.id === "react")!.verified = false;
    if (change === "job") job.parsed.skills.push(requirement("Python"));
    if (change === "date") job.asOf = "2026-09-30";
    if (change === "forged") r.selectedCandidateFactIds.push("not-a-source");
    expect(() => materializeCandidateContext(r, job, p)).toThrow();
  },
);
it("only exposes a bounded shortlist to an optional ranker", async () => {
  const rank = vi.fn(
    async (input: { candidates: readonly { excerpt: string }[] }) => {
      expect(input.candidates.length).toBeGreaterThan(0);
      return [];
    },
  );
  const r = await retrieveRelevantCandidateFacts(
    developerJob(),
    mixedProfile(),
    { ranker: { rank } },
  );
  expect(r.ranking).toBe("reranked");
  const payload = rank.mock.calls[0]![0] as unknown as {
    candidates: { excerpt: string }[];
  };
  expect(payload.candidates.length).toBeLessThanOrEqual(60);
  expect(
    payload.candidates.reduce((n, c) => n + c.excerpt.length, 0),
  ).toBeLessThanOrEqual(16000);
  expect(JSON.stringify(payload)).not.toMatch(
    /DZ licence|Private health|private@example/,
  );
});
it.each(["unknown", "duplicate", "extra", "invalid", "error"])(
  "falls back safely for %s ranker output",
  async (kind) => {
    const rank = async (input: { candidates: readonly { id: string }[] }) => {
      const id = input.candidates[0]!.id;
      if (kind === "error") throw new Error("offline");
      return kind === "unknown"
        ? [{ id: "invented", score: 100 }]
        : kind === "duplicate"
          ? [
              { id, score: 1 },
              { id, score: 2 },
            ]
          : kind === "extra"
            ? [{ id, score: 1, fact: "invented" }]
            : [{ id, score: Infinity }];
    };
    const base = await retrieveRelevantCandidateFacts(
        developerJob(),
        mixedProfile(),
      ),
      r = await retrieveRelevantCandidateFacts(developerJob(), mixedProfile(), {
        ranker: { rank },
      });
    expect(r).toEqual({ ...base, ranking: "fallback" });
  },
);

it("keeps safety achievements without interpreting absence of accidents as a negated skill", async () => {
  const p = mixedProfile();
  p.items.push(
    item("safe-driving", "bullet", {
      experience_id: "driver",
      original_text: "Drove 100,000 km without accidents.",
      categories: "driving",
    }),
  );
  expect(
    (await retrieveRelevantCandidateFacts(drivingJob(), p))
      .selectedExperienceBulletIds,
  ).toContain("safe-driving");
});
it("does not retrieve a database-driver project for driving experience", async () => {
  const p = mixedProfile();
  p.items.push(
    item("db-driver", "project", {
      name: "Database driver",
      description: "Implemented a database driver using TypeScript",
      technologies: "TypeScript",
    }),
  );
  const job = drivingJob();
  job.parsed.experienceRequirements = [requirement("DZ driver")];
  expect(
    (await retrieveRelevantCandidateFacts(job, p)).selectedProjectIds,
  ).not.toContain("db-driver");
});
it("bounds hanging optional rankers and falls back deterministically", async () => {
  vi.useFakeTimers();
  try {
    const pending = retrieveRelevantCandidateFacts(
      developerJob(),
      mixedProfile(),
      { ranker: { rank: () => new Promise(() => {}) } },
    );
    await vi.advanceTimersByTimeAsync(15000);
    expect((await pending).ranking).toBe("fallback");
  } finally {
    vi.useRealTimers();
  }
});

it("an optional ranking cannot promote preferred facts above required ones", async () => {
  const r = await retrieveRelevantCandidateFacts(
    developerJob(),
    mixedProfile(),
    {
      ranker: {
        rank: async ({ candidates }) =>
          candidates.map((c) => ({
            id: c.id,
            score: c.id.includes("accessibility") ? 100 : 0,
          })),
      },
    },
  );
  const facts = r.selections.filter((s) => s.kind === "fact");
  expect(facts[0]?.priority).toBe("required");
  expect(facts.at(-1)?.id).toBe("accessibility");
});
it("rejects removed parent IDs and unrelated forged source selections", async () => {
  const p = mixedProfile(),
    job = developerJob(),
    r = await retrieveRelevantCandidateFacts(job, p);
  r.selections = r.selections.filter((s) => s.id !== "developer");
  r.selectedExperienceIds = [];
  expect(() => materializeCandidateContext(r, job, p)).toThrow();
});
