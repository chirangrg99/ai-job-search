import { canonical } from "@/features/fit/evidence";
import { qualification } from "@/features/fit/qualification";
const stop = new Set(
  "a an and or the of in on at to for with as by is are be have has must required preferred experience experienced knowledge skills skill ability strong excellent good years year months month minimum least equivalent relevant work working role job team duties responsibilities company candidate qualification qualifications degree certification licence license valid general professional using use build built develop developed development".split(
    " ",
  ),
);
/** Preserve C++, C#, .NET and dotted technology names. No adjacent-skill expansion. */
export function terms(text: string): string[] {
  return [
    ...new Set(
      (
        canonical(text).match(
          /(?:\.[\p{L}]+|[\p{L}\p{N}]+(?:[.+#][\p{L}\p{N}+#]*)*)/gu,
        ) ?? []
      )
        .map((t) => qualification(t.replace(/\.$/, "")))
        .filter((t) => !stop.has(t) && !/^\d+$/.test(t)),
    ),
  ];
}
export function tags(value: string | boolean | undefined): string[] {
  return typeof value === "string"
    ? value.split(",").map(canonical).filter(Boolean)
    : [];
}
export function overlap(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(b);
  return a.filter((t) => set.has(t));
}
