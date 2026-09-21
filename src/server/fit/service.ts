import "server-only";
import { z } from "zod";
import { initialMatches, scoreMatches } from "@/features/fit/engine";
import type { FitActionResult } from "@/features/fit/model";
import type { FitRepository } from "./repository";
import { applySemantic, shortlist, type SemanticClient } from "./semantic";
export const fitRequestSchema = z.strictObject({
  jobId: z.uuid(),
  preferenceId: z.uuid().nullable().default(null),
  mode: z.enum(["rules", "semantic"]).default("rules"),
});
export async function assessFit(
  repo: FitRepository,
  ai: SemanticClient | null,
  raw: unknown,
  asOf = new Date().toISOString().slice(0, 10),
): Promise<FitActionResult> {
  const request = fitRequestSchema.parse(raw);
  const snapshot = await repo.load(
    request.jobId,
    request.preferenceId,
    request.mode,
    asOf,
  );
  if (await repo.current(snapshot)) return { ok: true, cached: true };
  let matches = initialMatches(snapshot.input);
  let semanticOutput: unknown = null;
  if (request.mode === "semantic") {
    const comparisons = shortlist(matches, snapshot.input.candidates);
    if (comparisons.length) {
      if (!ai)
        return {
          ok: false,
          error:
            "Semantic comparison is not configured. Use rules-only assessment.",
        };
      semanticOutput = await ai.compare(comparisons);
      matches = applySemantic(
        matches,
        snapshot.input.candidates,
        comparisons,
        semanticOutput,
      );
    }
  }
  // Recheck after optional model latency. Changed source inputs cannot publish a current result.
  const fresh = await repo.load(
    request.jobId,
    request.preferenceId,
    request.mode,
    asOf,
  );
  if (fresh.hash !== snapshot.hash)
    return {
      ok: false,
      error:
        "Profile, posting or saved search changed. Assess again using the current information.",
    };
  await repo.save(
    snapshot,
    scoreMatches(snapshot.input, matches),
    semanticOutput,
  );
  return { ok: true, cached: false };
}
