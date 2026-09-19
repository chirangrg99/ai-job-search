"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { discoveryRepository } from "@/server/discovery/repository";
import { createAdzunaProvider } from "@/server/discovery/factory";
import { syncSearch, importManualJob } from "@/server/discovery/service";
import type { DiscoveryResult } from "@/features/discovery/schema";
export async function syncJobs(input: unknown): Promise<DiscoveryResult> {
  const { client, user } = await requireUser();
  try {
    return await syncSearch(
      discoveryRepository(client, user.id),
      createAdzunaProvider(client),
      input,
    );
  } catch {
    return {
      ok: false,
      error:
        "Sync could not finish. Check your enabled search and sync history. An active sync may need up to six minutes before retrying.",
    };
  } finally {
    revalidatePath("/jobs");
  }
}
export async function addManualJob(input: unknown): Promise<DiscoveryResult> {
  const { client, user } = await requireUser();
  try {
    return await importManualJob(discoveryRepository(client, user.id), input);
  } catch {
    return {
      ok: false,
      error:
        "Could not finish the import. Your input remains here. Check received records before retrying.",
    };
  } finally {
    revalidatePath("/jobs");
  }
}

export async function processPendingJobs(): Promise<DiscoveryResult> {
  const { client, user } = await requireUser();
  try {
    const counts = await discoveryRepository(client, user.id).processPending();
    return {
      ok: true,
      message: `Processed up to 100 pending jobs: ${counts.new} new, ${counts.exact_duplicate} exact duplicates, ${counts.updated_existing} updates, ${counts.likely_duplicate} likely duplicates kept separately.`,
    };
  } catch {
    return {
      ok: false,
      error:
        "Processing could not finish. Completed jobs are preserved. Retry processing pending jobs.",
    };
  } finally {
    revalidatePath("/jobs");
  }
}
