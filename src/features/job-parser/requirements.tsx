import { requirementGroups, type ParsedJob } from "./schema";
const labels: Record<(typeof requirementGroups)[number], string> = {
  responsibilities: "Responsibilities",
  requiredQualifications: "Required qualifications",
  preferredQualifications: "Preferred qualifications",
  skills: "Skills",
  technologies: "Technologies",
  licences: "Licences",
  certifications: "Certifications",
  educationRequirements: "Education requirements",
  experienceRequirements: "Experience requirements",
  physicalRequirements: "Physical requirements",
  scheduleRequirements: "Schedule requirements",
};
export function ParsedRequirements({ data }: { data: ParsedJob }) {
  return (
    <div className="space-y-5">
      <p className="rounded-md bg-primary-soft p-3 text-sm">
        AI_DRAFT · Extracted from this posting. Review the source evidence; this
        is not verified candidate information.
      </p>
      <section className="space-y-3 rounded-lg border bg-surface p-5">
        <h2 className="text-section font-semibold">Explicit posting details</h2>
        {(
          [
            ["title", "Title"],
            ["company", "Company"],
            ["location", "Location"],
            ["employmentType", "Employment type"],
            ["workAuthorizationWording", "Work authorization wording"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <h3 className="text-sm font-semibold">{label}</h3>
            <p className="text-sm">
              {data[key]?.text ?? "Not explicitly stated in this source."}
            </p>
            {data[key] && (
              <blockquote className="mt-1 border-l-2 pl-3 text-sm whitespace-pre-wrap text-text-secondary">
                {data[key].evidence}
              </blockquote>
            )}
          </div>
        ))}
        <div>
          <h3 className="text-sm font-semibold">Salary wording</h3>
          {data.salary ? (
            <>
              <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-wrap">
                {data.salary.evidence}
              </blockquote>
              <p className="text-sm text-text-secondary">
                Minimum: {data.salary.minimum ?? "Unknown"} · Maximum:{" "}
                {data.salary.maximum ?? "Unknown"} · Currency:{" "}
                {data.salary.currency ?? "Unknown"} · Period:{" "}
                {data.salary.period ?? "Unknown"}
              </p>
            </>
          ) : (
            <p className="text-sm">Not explicitly stated in this source.</p>
          )}
        </div>
      </section>
      {requirementGroups.map((key) => (
        <section
          key={key}
          className="space-y-3 rounded-lg border bg-surface p-5"
        >
          <h2 className="text-section font-semibold">{labels[key]}</h2>
          {!data[key].length ? (
            <p className="text-sm text-text-secondary">
              None extracted from this source.
            </p>
          ) : (
            <ul className="space-y-4">
              {data[key].map((item, index) => (
                <li key={index}>
                  <p className="font-medium">{item.text}</p>
                  <p className="text-xs text-text-secondary">
                    {item.priority === "ambiguous"
                      ? "NEEDS_INPUT · Ambiguous wording"
                      : item.priority === "unspecified"
                        ? "Priority not stated"
                        : item.priority === "required"
                          ? "Required"
                          : "Preferred"}
                  </p>
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3 text-sm text-primary">
                      View source evidence
                    </summary>
                    <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-wrap text-text-secondary">
                      {item.evidence}
                    </blockquote>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {data.ambiguities.length > 0 && (
        <section className="rounded-lg border bg-warning-soft p-5">
          <h2 className="font-semibold">NEEDS_INPUT · Ambiguous passages</h2>
          <ul className="mt-3 space-y-3">
            {data.ambiguities.map((item, i) => (
              <li key={i}>
                <p>{item.text}</p>
                <blockquote className="text-sm whitespace-pre-wrap">
                  {item.evidence}
                </blockquote>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
