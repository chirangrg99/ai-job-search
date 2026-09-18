// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AdzunaJobProvider, retryAfterSeconds } from "./adzuna";
const row = {
  id: "123",
  title: "Developer",
  description: "Snippet",
  redirect_url: "https://www.adzuna.ca/jobs/land/ad/123",
  company: { display_name: "Example" },
  location: { display_name: "Toronto" },
  created: "2026-09-01T12:00:00Z",
  salary_min: 50000,
  salary_max: 70000,
  salary_is_predicted: "0",
  contract_time: "full_time",
};
const query = { keywords: ["TypeScript"], page: 1, pageSize: 20 };
function fixture(body: unknown = { count: 1, results: [row] }) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
  const sleep = vi.fn(async () => {});
  const reserveRequest = vi.fn(async () => true);
  const cooldown = vi.fn(async () => {});
  const provider = new AdzunaJobProvider(
    { appId: "test-id", appKey: "test-key" },
    {
      fetch: fetcher,
      sleep,
      reserveRequest,
      cooldown,
      now: () => Date.parse("2026-09-01T00:00:00Z"),
    },
  );
  return { provider, fetcher, sleep, reserveRequest, cooldown };
}
it("maps only the provider-neutral DTO and marks snippets/unknown salary period", async () => {
  const { provider, fetcher } = fixture();
  const result = await provider.search({
    ...query,
    title: "Developer",
    location: "Toronto",
    distanceKm: 20,
    salary: { minimum: 50000, currency: "CAD", period: "year" },
  });
  expect(result.jobs[0]).toMatchObject({
    provider: "adzuna",
    externalId: "123",
    descriptionComplete: false,
    salaryPeriod: null,
    salaryEstimated: false,
    employmentType: "full_time",
    country: "CA",
  });
  expect(result.jobs[0]).not.toHaveProperty("__CLASS__");
  const url = new URL(String(fetcher.mock.calls[0]?.[0]));
  expect(url.origin).toBe("https://api.adzuna.com");
  expect(url.pathname).toBe("/v1/api/jobs/ca/search/1");
  expect(url.searchParams.get("title_only")).toBe("Developer");
  expect(url.searchParams.get("what_and")).toBe("TypeScript");
  expect(url.searchParams.get("where")).toBe("Toronto");
  expect(url.searchParams.get("distance")).toBe("20");
  expect(url.searchParams.has("salary_min")).toBe(false);
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    cache: "no-store",
    redirect: "error",
  });
});
it("reports pagination without automatically draining subsequent pages", async () => {
  const { provider, fetcher } = fixture({ count: 100, results: [row] });
  const result = await provider.search({ ...query, page: 2 });
  expect(result.pagination).toEqual({
    page: 2,
    pageSize: 20,
    total: 100,
    nextPage: 3,
  });
  expect(fetcher).toHaveBeenCalledOnce();
});
it("returns an honest empty page", async () => {
  const { provider } = fixture({ count: 0, results: [] });
  expect(await provider.search(query)).toEqual({
    jobs: [],
    rejectedCount: 0,
    pagination: { page: 1, pageSize: 20, total: 0, nextPage: null },
  });
});
it("does not loop on empty pages with stale totals", async () => {
  const { provider } = fixture({ count: 100, results: [] });
  expect((await provider.search(query)).pagination.nextPage).toBeNull();
});
it("ends pagination at application cap", async () => {
  const { provider } = fixture({ count: 100000, results: [row] });
  expect(
    (await provider.search({ ...query, page: 100 })).pagination.nextPage,
  ).toBeNull();
});
it.each([401, 403, 410, 400, 404])(
  "does not retry permanent HTTP %s or disclose response body",
  async (status) => {
    const { provider, fetcher, sleep } = fixture();
    fetcher.mockResolvedValue(new Response("secret body", { status }));
    await expect(provider.search(query)).rejects.not.toThrow("secret body");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  },
);
it.each([500, 502, 503, 504, 408])(
  "retries transient HTTP %s at most three times",
  async (status) => {
    const { provider, fetcher, reserveRequest, sleep } = fixture();
    fetcher.mockImplementation(
      async () => new Response("private provider text", { status }),
    );
    await expect(provider.search(query)).rejects.toMatchObject({
      code: "provider_error",
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(reserveRequest).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  },
);
it("recovers after one transient failure", async () => {
  const { provider, fetcher } = fixture();
  fetcher.mockResolvedValueOnce(new Response("", { status: 503 }));
  expect((await provider.search(query)).jobs).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("bounds network retries and sanitizes credential-bearing network errors", async () => {
  const { provider, fetcher } = fixture();
  fetcher.mockRejectedValue(
    new Error("https://api.adzuna.com?app_key=test-key"),
  );
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "provider_error",
  });
  try {
    await provider.search(query);
  } catch (e) {
    expect(String(e)).not.toContain("test-key");
  }
  expect(fetcher).toHaveBeenCalledTimes(6);
});
it("honors 429 via a durable cooldown, with no immediate retry", async () => {
  const { provider, fetcher, cooldown } = fixture();
  fetcher.mockResolvedValue(
    new Response("", { status: 429, headers: { "retry-after": "120" } }),
  );
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "rate_limit",
  });
  expect(cooldown).toHaveBeenCalledWith(120);
  expect(fetcher).toHaveBeenCalledOnce();
});
it.each([
  [null, 60],
  ["bad", 60],
  ["0", 1],
  ["45", 45],
  ["Tue, 01 Sep 2026 00:02:00 GMT", 120],
])("retry-after %s", (value, expected) =>
  expect(retryAfterSeconds(value, Date.parse("2026-09-01T00:00:00Z"))).toBe(
    expected,
  ),
);
it("stops before HTTP when global budget is exhausted", async () => {
  const { provider, fetcher, reserveRequest } = fixture();
  reserveRequest.mockResolvedValue(false);
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "rate_limit",
  });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  {},
  { count: 1 },
  { count: -1, results: [] },
  { count: 1, results: {} },
])("rejects malformed envelope %o", async (body) => {
  const { provider, fetcher } = fixture(body);
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "malformed_response",
  });
  expect(fetcher).toHaveBeenCalledOnce();
});
it("rejects invalid JSON without logging it", async () => {
  const { provider, fetcher } = fixture();
  fetcher.mockResolvedValue(new Response("not json"));
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "malformed_response",
  });
});
it("bounds response bytes", async () => {
  const { provider, fetcher } = fixture();
  fetcher.mockResolvedValue(new Response("x".repeat(2_000_001)));
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "malformed_response",
  });
});
it("skips malformed items while preserving good results", async () => {
  const { provider } = fixture({
    count: 4,
    results: [
      row,
      { ...row, id: "bad", title: "" },
      { ...row, id: "unsafe", redirect_url: "javascript:alert(1)" },
      { ...row, id: "range", salary_max: 1 },
    ],
  });
  const result = await provider.search(query);
  expect(result.jobs).toHaveLength(1);
  expect(result.rejectedCount).toBe(3);
});
it("missing optional fields remain unknown", () => {
  const { provider } = fixture();
  expect(provider.mapResult({ id: "1", title: "Title" })).toMatchObject({
    company: null,
    description: null,
    applicationUrl: null,
    salaryMin: null,
    salaryEstimated: null,
    remoteType: null,
  });
});
it.each([
  {},
  { appId: "id" },
  { appKey: "key" },
  { appId: " ", appKey: "key" },
])("validates incomplete credentials without HTTP %o", async (config) => {
  const { fetcher, sleep, reserveRequest, cooldown } = fixture();
  const provider = new AdzunaJobProvider(config, {
    fetch: fetcher,
    sleep,
    reserveRequest,
    cooldown,
    now: Date.now,
  });
  expect(provider.validateConfiguration().valid).toBe(false);
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "configuration",
  });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([{ page: 0 }, { pageSize: 51 }, { page: 1.5 }, { distanceKm: -1 }])(
  "validates request controls %o",
  async (overrides) => {
    const { provider, fetcher } = fixture();
    await expect(
      provider.search({ ...query, ...overrides }),
    ).rejects.toMatchObject({ code: "invalid_query" });
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("maps exclusion and one employment option without turning title exclusions into global exclusions", async () => {
  const { provider, fetcher } = fixture();
  await provider.search({
    ...query,
    title: "Delivery Driver",
    excludedTitles: ["Senior"],
    excludedKeywords: ["commission", "customer service"],
    employmentTypes: ["part_time"],
    remotePreferences: ["remote"],
    minimumFitScore: 60,
  });
  const params = new URL(String(fetcher.mock.calls[0]?.[0])).searchParams;
  expect(params.get("title_only")).toBe("Delivery Driver");
  expect(params.get("what_exclude")).toBe("commission");
  expect(params.get("part_time")).toBe("1");
  expect(params.get("sort_dir")).toBe("down");
  expect(params.has("remote")).toBe(false);
  expect(params.has("what_phrase")).toBe(false);
});
it.each([
  ["full_time", "contract"],
  ["internship"],
  ["temporary"],
  [],
] as const)(
  "does not narrow alternative or unsupported employment preferences %j",
  async (...types) => {
    const { provider, fetcher } = fixture();
    await provider.search({ ...query, employmentTypes: [...types] });
    const params = new URL(String(fetcher.mock.calls[0]?.[0])).searchParams;
    for (const key of ["full_time", "part_time", "contract", "permanent"])
      expect(params.has(key)).toBe(false);
  },
);
it("classifies documented HTTP 410 as an authentication failure", async () => {
  const { provider, fetcher } = fixture();
  fetcher.mockResolvedValue(new Response("private", { status: 410 }));
  await expect(provider.search(query)).rejects.toMatchObject({
    code: "authentication",
  });
  expect(fetcher).toHaveBeenCalledOnce();
});
