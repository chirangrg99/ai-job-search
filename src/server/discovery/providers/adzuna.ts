import "server-only";
import { z } from "zod";
import {
  discoveredJobSchema,
  type DiscoveredJob,
} from "@/features/discovery/schema";
import {
  ProviderError,
  type JobProvider,
  type ProviderPage,
  type ProviderQuery,
} from "../provider";
const credentials = z.object({
  appId: z.string().trim().min(1).max(200),
  appKey: z.string().trim().min(1).max(500),
});
const querySchema = z.object({
  title: z.string().max(120).optional(),
  keywords: z.array(z.string().max(120)).max(50),
  location: z.string().max(120).optional(),
  distanceKm: z.number().int().min(0).max(2000).optional(),
  salaryMinimum: z.number().int().nonnegative().optional(),
  page: z.number().int().min(1).max(100),
  pageSize: z.number().int().min(1).max(50),
});
const resultSchema = z.object({
  id: z
    .union([z.string().min(1), z.number().int().nonnegative()])
    .transform(String),
  title: z.string().trim().min(1).max(500),
  company: z.object({ display_name: z.string().max(500).optional() }).nullish(),
  location: z
    .object({ display_name: z.string().max(500).optional() })
    .nullish(),
  description: z.string().max(50000).nullish(),
  redirect_url: z.string().nullish(),
  created: z.string().datetime({ offset: true }).nullish(),
  salary_min: z.number().finite().nonnegative().nullish(),
  salary_max: z.number().finite().nonnegative().nullish(),
  salary_is_predicted: z
    .union([z.literal(0), z.literal(1), z.literal("0"), z.literal("1")])
    .nullish(),
  contract_time: z.string().nullish(),
  contract_type: z.string().nullish(),
});
const envelope = z.object({
  count: z.number().int().nonnegative(),
  results: z.array(z.unknown()).max(50),
});
export interface AdzunaDependencies {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  reserveRequest: () => Promise<boolean>;
  cooldown: (seconds: number) => Promise<void>;
  now: () => number;
}
export function retryAfterSeconds(value: string | null, now: number): number {
  if (!value) return 60;
  const numeric = Number(value);
  const seconds =
    Number.isFinite(numeric) && numeric >= 0
      ? numeric
      : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds)
    ? Math.max(1, Math.min(31536000, Math.ceil(seconds)))
    : 60;
}
export class AdzunaJobProvider implements JobProvider {
  readonly identifier = "adzuna";
  constructor(
    private readonly config: { appId?: string; appKey?: string },
    private readonly deps: AdzunaDependencies,
  ) {}
  validateConfiguration() {
    return credentials.safeParse(this.config).success
      ? { valid: true }
      : { valid: false, message: new ProviderError("configuration").message };
  }
  mapResult(input: unknown): DiscoveredJob {
    const r = resultSchema.safeParse(input);
    if (!r.success) throw new ProviderError("malformed_response");
    const v = r.data;
    const mapped = discoveredJobSchema.safeParse({
      provider: this.identifier,
      externalId: v.id,
      title: v.title,
      company: v.company?.display_name ?? null,
      location: v.location?.display_name ?? null,
      country: "CA",
      description: v.description ?? null,
      descriptionComplete: false,
      applicationUrl: v.redirect_url ?? null,
      salaryMin: v.salary_min ?? null,
      salaryMax: v.salary_max ?? null,
      salaryCurrency:
        v.salary_min != null || v.salary_max != null ? "CAD" : null,
      // The API response does not supply a salary period. Preserve unknown rather than infer.
      salaryPeriod: null,
      salaryEstimated:
        v.salary_is_predicted == null
          ? null
          : String(v.salary_is_predicted) === "1",
      employmentType:
        v.contract_time === "full_time"
          ? "full_time"
          : v.contract_time === "part_time"
            ? "part_time"
            : v.contract_type === "contract"
              ? "contract"
              : null,
      remoteType: null,
      postedAt: v.created ?? null,
    });
    if (!mapped.success) throw new ProviderError("malformed_response");
    return mapped.data;
  }
  async search(input: ProviderQuery): Promise<ProviderPage> {
    const c = credentials.safeParse(this.config);
    if (!c.success) throw new ProviderError("configuration");
    const q = querySchema.safeParse(input);
    if (!q.success) throw new ProviderError("invalid_query");
    const query = q.data;
    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/ca/search/${query.page}`,
    );
    url.searchParams.set("app_id", c.data.appId);
    url.searchParams.set("app_key", c.data.appKey);
    url.searchParams.set("results_per_page", String(query.pageSize));
    url.searchParams.set("content-type", "application/json");
    url.searchParams.set("sort_by", "date");
    if (query.title) url.searchParams.set("what_phrase", query.title);
    if (query.keywords.length)
      url.searchParams.set("what", query.keywords.join(" "));
    if (query.location) {
      url.searchParams.set("where", query.location);
      if (query.distanceKm !== undefined)
        url.searchParams.set("distance", String(query.distanceKm));
    }
    if (query.salaryMinimum !== undefined) {
      url.searchParams.set("salary_min", String(query.salaryMinimum));
      url.searchParams.set("salary_include_unknown", "1");
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!(await this.deps.reserveRequest()))
        throw new ProviderError("rate_limit");
      let response: Response;
      try {
        response = await this.deps.fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        if (attempt === 2) throw new ProviderError("provider_error");
        await this.deps.sleep(1000 * 2 ** attempt);
        continue;
      }
      if (response.status === 429) {
        await this.deps.cooldown(
          retryAfterSeconds(
            response.headers.get("retry-after"),
            this.deps.now(),
          ),
        );
        throw new ProviderError("rate_limit");
      }
      if (response.status === 401 || response.status === 403)
        throw new ProviderError("authentication");
      if (response.status === 408 || response.status >= 500) {
        if (attempt === 2) throw new ProviderError("provider_error");
        await this.deps.sleep(1000 * 2 ** attempt);
        continue;
      }
      if (!response.ok) throw new ProviderError("provider_error");
      let raw: unknown;
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error();
        let size = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2_000_000) {
            await reader.cancel();
            throw new Error();
          }
          chunks.push(value);
        }
        raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new ProviderError("malformed_response");
      }
      const parsed = envelope.safeParse(raw);
      if (!parsed.success) throw new ProviderError("malformed_response");
      const jobs: DiscoveredJob[] = [];
      let rejectedCount = 0;
      for (const entry of parsed.data.results) {
        try {
          jobs.push(this.mapResult(entry));
        } catch {
          rejectedCount++;
        }
      }
      const hasMore =
        parsed.data.results.length > 0 &&
        query.page * query.pageSize < parsed.data.count &&
        query.page < 100;
      return {
        jobs,
        rejectedCount,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: parsed.data.count,
          nextPage: hasMore ? query.page + 1 : null,
        },
      };
    }
    throw new ProviderError("provider_error");
  }
}
