import { createHash } from "node:crypto";
import {
  discoveredJobSchema,
  type DiscoveredJob,
} from "@/features/discovery/schema";
import { employmentTypes, salaryPeriods } from "@/features/preferences/schema";

export const FINGERPRINT_VERSION = "v1";
export const whitespace = (value: string) =>
  value.normalize("NFKC").replace(/\s+/gu, " ").trim();
const words = (value: string | null) =>
  value === null
    ? null
    : whitespace(value)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^\p{L}\p{N}+#]+/gu, " ")
        .trim()
        .replace(/ +/g, " ") || null;
export const normalizeCompany = words;
export const normalizeTitle = words;
export const normalizeLocation = words;

/** Remove only known tracking keys. Unknown parameters, path case and routing fragments may identify jobs. */
export function normalizeUrl(value: string | null): string | null {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password)
    return null;
  for (const key of [...url.searchParams.keys()]) {
    if (
      /^utm_/i.test(key) ||
      /^(gclid|fbclid|msclkid|mc_cid|mc_eid)$/i.test(key)
    )
      url.searchParams.delete(key);
  }
  if (/^#(?:top|apply|description)$/i.test(url.hash)) url.hash = "";
  url.searchParams.sort();
  return url.toString();
}
export function normalizeSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
) {
  const amount = (n: number | null) =>
    n !== null && Number.isFinite(n) && n >= 0 ? n : null;
  const minimum = amount(min),
    maximum = amount(max);
  return {
    min: minimum,
    max:
      minimum !== null && maximum !== null && maximum < minimum
        ? null
        : maximum,
    currency:
      currency && /^[a-z]{3}$/i.test(currency.trim())
        ? currency.trim().toUpperCase()
        : null,
    period: salaryPeriods.find((p) => p === period) ?? null,
  };
}
export function normalizeEmployment(value: string | null) {
  const normalized = value
    ? whitespace(value).toLowerCase().replace(/[ -]+/g, "_")
    : null;
  return employmentTypes.find((v) => v === normalized) ?? null;
}
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function normalizeJob(input: DiscoveredJob) {
  const raw = discoveredJobSchema.parse(input);
  const company = normalizeCompany(raw.company);
  const title = normalizeTitle(raw.title);
  const location = normalizeLocation(raw.location);
  // Keep meaningful content punctuation and numbers; C++, C# and changed metrics are distinct.
  const content = raw.description
    ? whitespace(raw.description).toLowerCase()
    : null;
  const salary = normalizeSalary(
    raw.salaryMin,
    raw.salaryMax,
    raw.salaryCurrency,
    raw.salaryPeriod,
  );
  const employmentType = normalizeEmployment(raw.employmentType);
  const canonicalUrl = normalizeUrl(raw.applicationUrl);
  const fingerprint = `${FINGERPRINT_VERSION}:${hash([company, title, location, raw.country?.toUpperCase() ?? null, content])}`;
  const strongContent = Boolean(
    company &&
    title &&
    location &&
    content &&
    content.length >= 80 &&
    raw.descriptionComplete,
  );
  // Only this production adapter currently guarantees a stable upstream external ID.
  const reliableId = raw.provider === "adzuna";
  const url = canonicalUrl ? new URL(canonicalUrl) : null;
  const postingUrl = Boolean(
    url &&
    (url.searchParams.has("jobId") ||
      url.searchParams.has("job_id") ||
      url.searchParams.has("gh_jid") ||
      (url.pathname.split("/").filter(Boolean).length >= 2 &&
        !/\/(?:jobs|careers|search|vacancies)\/?$/i.test(url.pathname))),
  );
  return {
    version: FINGERPRINT_VERSION,
    company,
    title,
    location,
    canonicalUrl,
    postingUrl,
    fingerprint,
    strongContent,
    reliableId,
    salary,
    employmentType,
    signature: hash([
      company,
      title,
      location,
      content,
      raw.descriptionComplete,
      salary,
      employmentType,
      raw.remoteType,
      raw.salaryEstimated,
      raw.postedAt,
      canonicalUrl,
    ]),
    raw,
  };
}
export type NormalizedJob = ReturnType<typeof normalizeJob>;
export const deduplicationStates = [
  "new",
  "exact_duplicate",
  "likely_duplicate",
  "updated_existing",
] as const;
export type DeduplicationState = (typeof deduplicationStates)[number];
