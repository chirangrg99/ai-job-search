import "server-only";
import type { DiscoveredJob } from "@/features/discovery/schema";
export interface ProviderQuery {
  title?: string;
  keywords: string[];
  location?: string;
  distanceKm?: number;
  salaryMinimum?: number;
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
  configuration: "Configure both Adzuna server credentials to sync jobs.",
  invalid_query: "The provider query is invalid.",
  rate_limit:
    "The API request budget or provider rate limit was reached. Try again after the cooldown or quota reset.",
  authentication:
    "Adzuna rejected the server credentials. Check the provider account configuration.",
  provider_error:
    "Adzuna is temporarily unavailable or rejected the request. Try again later.",
  malformed_response:
    "Adzuna returned an invalid response. No invalid records were accepted.",
  timeout: "The request timed out. Try syncing a smaller page.",
};
export class ProviderError extends Error {
  constructor(readonly code: ProviderErrorCode) {
    super(messages[code]);
    this.name = "ProviderError";
  }
}
