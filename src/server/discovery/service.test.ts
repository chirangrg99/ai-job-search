import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { syncSearch, importManualJob } from "./service";
import { queriesForSearch } from "./query-plan";
import { ManualJobProvider } from "./providers/manual";
import { emptyPreference } from "@/features/preferences/schema";
import { ProviderError } from "./provider";
const input = {
  preferenceId: "52000000-0000-4000-8000-000000000001",
  page: 1,
  pageSize: 20,
};
const manual = {
  title: "Role",
  company: "Company",
  location: "Toronto",
  country: "CA",
  description: "Known posting description",
  descriptionComplete: false,
  applicationUrl: "https://example.com/job",
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
  employmentType: null,
  remoteType: null,
};
function fixture() {
  const repo = {
    owner: vi.fn(),
    enabledSearch: vi.fn().mockResolvedValue({
      ...emptyPreference,
      name: "Search",
      target_titles: ["Role", "Technician"],
    }),
    start: vi.fn().mockResolvedValue("run"),
    accept: vi.fn(),
    finish: vi.fn().mockResolvedValue(2),
    overview: vi.fn(),
  };
  const page = {
    jobs: [new ManualJobProvider().mapResult(manual)],
    rejectedCount: 0,
    pagination: { page: 1, pageSize: 20, total: 1, nextPage: null },
  };
  const provider = {
    identifier: "adzuna",
    validateConfiguration: () => ({ valid: true }),
    mapResult: vi.fn(),
    search: vi.fn().mockResolvedValue(page),
  };
  return { repo, provider, page };
}
it("expands alternative title/location combinations without joining alternatives as required words", () => {
  const queries = queriesForSearch(
    {
      ...emptyPreference,
      name: "Search",
      target_titles: ["A", "B"],
      target_locations: ["X", "Y"],
      keywords: ["Required"],
      min_salary: 20,
      salary_currency: "CAD",
      salary_period: "hour",
    },
    2,
    10,
  );
  expect(queries).toHaveLength(4);
  expect(queries[0]).toMatchObject({
    title: "A",
    location: "X",
    keywords: ["Required"],
    page: 2,
    pageSize: 10,
  });
  expect(queries[0]).not.toHaveProperty("salaryMinimum");
});
it("rejects disabled and excessively broad query plans", () => {
  expect(() =>
    queriesForSearch({ ...emptyPreference, enabled: false }, 1, 20),
  ).toThrow("Enable");
  expect(() =>
    queriesForSearch(
      { ...emptyPreference, target_titles: Array(13).fill("Title") },
      1,
      20,
    ),
  ).toThrow("12");
});
it("passes mapped jobs to normalization intake and persists timestamps/outcome", async () => {
  const { repo, provider, page } = fixture();
  expect((await syncSearch(repo, provider, input)).ok).toBe(true);
  expect(repo.accept).toHaveBeenCalledWith("run", page.jobs);
  expect(repo.start).toHaveBeenCalledWith("adzuna", input.preferenceId);
  expect(repo.finish).toHaveBeenCalledWith(
    "run",
    expect.objectContaining({
      status: "completed",
      pagination: expect.any(Array),
    }),
  );
});
it("records partial success while preserving completed pages", async () => {
  const { repo, provider } = fixture();
  provider.search.mockRejectedValueOnce(new ProviderError("provider_error"));
  expect((await syncSearch(repo, provider, input)).ok).toBe(false);
  expect(repo.finish).toHaveBeenCalledWith(
    "run",
    expect.objectContaining({ status: "failed" }),
  );
  provider.search
    .mockReset()
    .mockResolvedValueOnce({
      jobs: [],
      rejectedCount: 0,
      pagination: { page: 1, pageSize: 20, total: 0, nextPage: null },
    })
    .mockRejectedValueOnce(new ProviderError("rate_limit"));
  await syncSearch(repo, provider, input);
  expect(repo.finish).toHaveBeenLastCalledWith(
    "run",
    expect.objectContaining({ status: "partial", code: "rate_limit" }),
  );
});
it("records malformed skips as a partial outcome", async () => {
  const { repo, provider, page } = fixture();
  provider.search.mockResolvedValue({ ...page, rejectedCount: 1 });
  await syncSearch(repo, provider, input);
  expect(repo.finish).toHaveBeenCalledWith(
    "run",
    expect.objectContaining({
      status: "partial",
      rejected: 2,
      code: "invalid_records",
    }),
  );
});
it("checks ownership before provider access", async () => {
  const { repo, provider } = fixture();
  repo.enabledSearch.mockRejectedValue(new Error("foreign"));
  await expect(syncSearch(repo, provider, input)).rejects.toThrow("foreign");
  expect(provider.search).not.toHaveBeenCalled();
  expect(repo.start).not.toHaveBeenCalled();
});
it("validates input before any data access", async () => {
  const { repo, provider } = fixture();
  expect((await syncSearch(repo, provider, { ...input, page: -1 })).ok).toBe(
    false,
  );
  expect(repo.enabledSearch).not.toHaveBeenCalled();
});
it("records missing configuration instead of successful zero results", async () => {
  const { repo, provider } = fixture();
  provider.validateConfiguration = () => ({ valid: false });
  expect((await syncSearch(repo, provider, input)).ok).toBe(false);
  expect(provider.search).not.toHaveBeenCalled();
  expect(repo.finish).toHaveBeenCalledWith(
    "run",
    expect.objectContaining({ code: "configuration" }),
  );
});
it("enforces a bounded sync deadline", async () => {
  const { repo, provider } = fixture();
  const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(180001);
  await syncSearch(repo, provider, input, now);
  expect(provider.search).not.toHaveBeenCalled();
  expect(repo.finish).toHaveBeenCalledWith(
    "run",
    expect.objectContaining({ code: "timeout" }),
  );
});
it("imports a manual description without HTTP and assigns an independent identity", async () => {
  const { repo } = fixture();
  expect((await importManualJob(repo, manual)).ok).toBe(true);
  expect(repo.accept).toHaveBeenCalledWith("run", [
    expect.objectContaining({
      provider: "manual",
      title: "Role",
      descriptionComplete: false,
    }),
  ]);
  const p = new ManualJobProvider();
  expect(p.mapResult(manual).externalId).not.toBe(
    p.mapResult(manual).externalId,
  );
});
it.each([
  { title: "" },
  { description: "" },
  { applicationUrl: "file:///etc/passwd" },
  { salaryMin: 20, salaryMax: 10 },
])("rejects invalid manual entry %o", async (overrides) => {
  const { repo } = fixture();
  expect((await importManualJob(repo, { ...manual, ...overrides })).ok).toBe(
    false,
  );
  expect(repo.start).not.toHaveBeenCalled();
});
