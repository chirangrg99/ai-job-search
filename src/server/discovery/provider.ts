import "server-only";
import type { Preference } from "@/features/preferences/schema";
import type { DiscoveredJob } from "@/features/discovery/schema";
export interface ProviderQuery {
  title?: string;
  keywords: string[];
  location?: string;
  distanceKm?: number;
  excludedTitles?: string[];
  excludedKeywords?: string[];
  employmentTypes?: Preference["employment_types"];
  remotePreferences?: Preference["remote_preferences"];
  minimumFitScore?: number | null;
  salary?: {
    minimum: number;
    currency: string;
    period: NonNullable<Preference["salary_period"]>;
  };
  page: number;
  pageSize: number;
}
export interface ProviderPage {
  jobs: DiscoveredJob[];
  rejectedCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    nextPage: number | null;
  };
}
export interface JobProvider {
  readonly identifier: string;
  validateConfiguration(): { valid: boolean; message?: string };
  mapResult(input: unknown): DiscoveredJob;
  search(query: ProviderQuery): Promise<ProviderPage>;
}
export type ProviderErrorCode =
  | "configuration"
  | "invalid_query"
  | "rate_limit"
  | "authentication"
  | "provider_error"
  | "malformed_response"
  | "timeout";
const messages: Record<ProviderErrorCode, string> = {
  configuration: "Configure the job provider credentials to sync jobs.",
  invalid_query:
    "The job provider rejected the search parameters. Check the saved titles and geographic locations; retrying unchanged will not help.",
  rate_limit:
    "The API request budget or provider rate limit was reached. Try again after the cooldown or quota reset.",
  authentication:
    "The job provider rejected the server credentials. Check the provider account configuration.",
  provider_error:
    "The job provider is temporarily unavailable or rejected the request. Try again later.",
  malformed_response:
    "The job provider returned an invalid response. No invalid records were accepted.",
  timeout: "The request timed out. Try syncing a smaller page.",
};
export class ProviderError extends Error {
  constructor(readonly code: ProviderErrorCode) {
    super(messages[code]);
    this.name = "ProviderError";
  }
}
