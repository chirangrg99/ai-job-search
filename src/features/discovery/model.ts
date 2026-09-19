import type { Database } from "@/types/database";
import type { DiscoveredJob } from "./schema";
type Run = Database["public"]["Tables"]["job_sync_runs"]["Row"];
export interface DiscoveryOverview {
  searches: { id: string; name: string }[];
  sources: { provider: string; last_synced_at: string | null }[];
  runs: Pick<
    Run,
    | "id"
    | "provider"
    | "status"
    | "started_at"
    | "finished_at"
    | "received_count"
    | "rejected_count"
    | "error_message"
    | "pagination"
  >[];
  total: number;
  pending: number;
  items: {
    id: string;
    receivedAt: string;
    job: DiscoveredJob;
    outcome: string;
    likelyDuplicateOf: string | null;
  }[];
}
