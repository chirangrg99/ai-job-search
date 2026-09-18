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
      location,
      ...(location && search.max_commute_km !== null
        ? { distanceKm: Math.ceil(search.max_commute_km) }
        : {}),
      page,
      pageSize,
    })),
  );
  // Salary period is not documented in search responses; do not apply a saved hourly/yearly threshold in incompatible provider units.
}
