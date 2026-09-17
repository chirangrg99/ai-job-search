export type DatePrecision = "year" | "month" | "day";
/** Partial dates retain precision; stored endpoints are range bounds, not asserted days. */
export function parseProfileDate(
  value: string,
  end = false,
): { date: string | null; precision: DatePrecision } {
  if (!value) return { date: null, precision: "day" };
  if (!/^\d{4}(-\d{2})?(-\d{2})?$/.test(value))
    throw new Error("Use YYYY, YYYY-MM or YYYY-MM-DD.");
  const [y, m, d] = value.split("-").map(Number);
  const year = y!;
  const month = m ?? 1;
  if (year < 1900 || year > 2200 || month < 1 || month > 12)
    throw new Error("Enter a valid date between 1900 and 2200.");
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (d !== undefined && (d < 1 || d > days))
    throw new Error("Enter a valid calendar date.");
  const precision: DatePrecision =
    d !== undefined ? "day" : m !== undefined ? "month" : "year";
  const actualMonth = m ?? (end ? 12 : 1);
  const actualDay =
    d ?? (end ? new Date(Date.UTC(year, actualMonth, 0)).getUTCDate() : 1);
  return {
    date: `${year}-${String(actualMonth).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`,
    precision,
  };
}
export function displayProfileDate(
  date: string | null,
  precision: string = "day",
) {
  return date
    ? date.slice(0, precision === "year" ? 4 : precision === "month" ? 7 : 10)
    : "";
}
