import "server-only";
import {
  manualJobSchema,
  syncInputSchema,
  type DiscoveryResult,
} from "@/features/discovery/schema";
import type { DiscoveryRepository } from "./repository";
import { ProviderError, type JobProvider } from "./provider";
import { queriesForSearch } from "./query-plan";
import { ManualJobProvider } from "./providers/manual";
export async function syncSearch(
  repo: DiscoveryRepository,
  provider: JobProvider,
  input: unknown,
  now: () => number = Date.now,
): Promise<DiscoveryResult> {
  const parsed = syncInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Select an enabled search, page 1–100 and 1–50 results per query.",
    };
  const { preferenceId, page, pageSize } = parsed.data;
  const search = await repo.enabledSearch(preferenceId);
  const queries = queriesForSearch(search, page, pageSize);
  const run = await repo.start(provider.identifier, preferenceId);
  let rejected = 0,
    completed = 0;
  const pagination: {
    query: number;
    page: number;
    pageSize: number;
    total: number;
    nextPage: number | null;
  }[] = [];
  const deadline = now() + 180000;
  try {
    if (!provider.validateConfiguration().valid)
      throw new ProviderError("configuration");
    for (const [index, query] of queries.entries()) {
      if (now() >= deadline) throw new ProviderError("timeout");
      const result = await provider.search(query);
      await repo.accept(run, result.jobs);
      rejected += result.rejectedCount;
      completed++;
      pagination.push({ query: index + 1, ...result.pagination });
    }
  } catch (error) {
    const known = error instanceof ProviderError;
    const code = known ? error.code : "persistence";
    const message = known
      ? error.message
      : "The sync could not finish. Previously received jobs are preserved; retry after checking the connection.";
    await repo.finish(run, {
      status: completed ? "partial" : "failed",
      rejected,
      code,
      message,
      pagination,
    });
    return { ok: false, error: message };
  }
  const count = await repo.finish(run, {
    status: rejected ? "partial" : "completed",
    rejected,
    code: rejected ? "invalid_records" : null,
    message: rejected
      ? `${rejected} malformed provider records were skipped.`
      : null,
    pagination,
  });
  return {
    ok: true,
    message: `Received ${count} intake records from ${completed} queries.${rejected ? ` Skipped ${rejected} malformed records.` : ""} ${pagination.some((p) => p.nextPage) ? "More pages are available; choose the next page to continue." : "No further pages were reported."}`,
  };
}
export async function importManualJob(
  repo: DiscoveryRepository,
  input: unknown,
): Promise<DiscoveryResult> {
  const parsed = manualJobSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the job fields.",
      fields: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    };
  const provider = new ManualJobProvider();
  const dto = provider.mapResult(parsed.data);
  const run = await repo.start(provider.identifier, null);
  try {
    await repo.accept(run, [dto]);
  } catch {
    await repo.finish(run, {
      status: "failed",
      rejected: 0,
      code: "persistence",
      message: "The manual job could not be saved.",
      pagination: [],
    });
    return {
      ok: false,
      error: "Could not save this job. Check received records before retrying.",
    };
  }
  await repo.finish(run, {
    status: "completed",
    rejected: 0,
    code: null,
    message: null,
    pagination: [],
  });
  return { ok: true, message: "Manual job received for normalization." };
}
