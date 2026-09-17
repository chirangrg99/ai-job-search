import { fields } from "./fields";
import type { ProfileItem } from "./model";
export function EntryDetails({ item }: { item: ProfileItem }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {fields[item.kind].map((f) => {
        const v = item.values[f.name];
        if (f.name === "end_date" && item.values.currently_employed)
          return null;
        return (
          <div
            key={f.name}
            className={f.type === "textarea" ? "sm:col-span-2" : ""}
          >
            <dt className="font-medium text-text-secondary">{f.label}</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] whitespace-pre-wrap">
              {typeof v === "boolean"
                ? v
                  ? "Yes"
                  : "No"
                : v || "Not provided"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
