import "server-only";
import type { Preference } from "@/features/preferences/schema";
import type { ProviderQuery } from "./provider";
export function queriesForSearch(
  search: Preference,
  page: number,
  pageSize: number,
): ProviderQuery[] {
  if (!search.enabled)
    throw new Error("Enable this saved search before syncing.");
  const titles = search.target_titles.length
    ? search.target_titles
    : [undefined];
  const locations = search.target_locations.length
    ? search.target_locations
    : [undefined];
  if (titles.length * locations.length > 12)
    throw new Error(
      "This search needs more than 12 title/location queries. Split it into smaller searches before syncing.",
    );
  return titles.flatMap((title) =>
    locations.map((location) => ({
      title,
      keywords: search.keywords,
      excludedTitles: search.excluded_titles,
      excludedKeywords: search.excluded_keywords,
      employmentTypes: search.employment_types,
      remotePreferences: search.remote_preferences,
      minimumFitScore: search.minimum_fit_score,
      ...(search.min_salary !== null &&
      search.salary_currency &&
      search.salary_period
        ? {
            salary: {
              minimum: search.min_salary,
              currency: search.salary_currency,
              period: search.salary_period,
            },
          }
        : {}),
      location,
      ...(location && search.max_commute_km !== null
        ? { distanceKm: Math.ceil(search.max_commute_km) }
        : {}),
      page,
      pageSize,
    })),
  );
  // Adapters decide which filters have equivalent upstream semantics; never discard units here.
}
