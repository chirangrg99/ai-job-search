/** Resolve formatting-only whitespace changes to literal source spans.
 * Words, punctuation, numbers and case must still match exactly. No fuzzy repair.
 */
export function literalEvidence(source: string, quote: string): string | null {
  if (!quote.trim()) return null;
  if (source.includes(quote)) return quote;
  let normalized = "";
  const starts: number[] = [],
    ends: number[] = [];
  for (const match of source.matchAll(/\s+|\S/gu)) {
    normalized += /^\s/u.test(match[0]) ? " " : match[0];
    // UTF-16 indexing matches String.indexOf, including supplementary characters.
    for (let n = 0; n < (/^\s/u.test(match[0]) ? 1 : match[0].length); n++) {
      starts.push(match.index);
      ends.push(match.index + match[0].length);
    }
  }
  const needle = quote.replace(/\s+/gu, " ").trim();
  const index = normalized.indexOf(needle);
  if (index < 0) return null;
  return source.slice(starts[index], ends[index + needle.length - 1]);
}
