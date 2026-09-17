import type { ProfileKind } from "./schema";
export type Field = {
  name: string;
  label: string;
  type?: "textarea" | "checkbox" | "select";
  options?: string[];
  hint?: string;
};
const source: Field = {
  name: "source_reference",
  label: "Source reference",
  hint: "Optional: where this information comes from, such as an employment record or certificate. Do not include secrets.",
};
const categories: Field = {
  name: "categories",
  label: "Categories / tags",
  hint: "Comma-separated tags. An item can have several categories; custom tags are welcome.",
};
const start: Field = {
  name: "start_date",
  label: "Start date",
  hint: "Optional. YYYY, YYYY-MM or YYYY-MM-DD; leave unknown dates blank.",
};
const end: Field = { name: "end_date", label: "End date", hint: start.hint };
const sensitivity: Field = {
  name: "sensitivity",
  label: "Sensitivity",
  type: "select",
  options: ["public", "private", "sensitive"],
  hint: "Describes content sensitivity; your profile remains private.",
};
export const fields: Record<ProfileKind, Field[]> = {
  personal: [
    { name: "full_name", label: "Full name" },
    { name: "preferred_name", label: "Preferred name" },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone" },
    { name: "city", label: "City" },
    { name: "province", label: "Province / state" },
    { name: "country", label: "Country" },
    { name: "linkedin_url", label: "LinkedIn URL" },
    { name: "portfolio_url", label: "Portfolio URL" },
    { name: "github_url", label: "GitHub URL" },
    source,
  ],
  summary: [
    {
      name: "professional_summary",
      label: "Professional summary",
      type: "textarea",
      hint: "Use only facts you can personally confirm.",
    },
    source,
  ],
  experience: [
    { name: "company", label: "Company" },
    { name: "title", label: "Job title" },
    { name: "location", label: "Location" },
    start,
    {
      name: "currently_employed",
      label: "I currently work here",
      type: "checkbox",
    },
    end,
    { name: "employment_type", label: "Employment type" },
    categories,
    source,
  ],
  bullet: [
    { name: "original_text", label: "Experience bullet", type: "textarea" },
    { name: "skills", label: "Skills", hint: "Comma-separated." },
    { name: "keywords", label: "Keywords", hint: "Comma-separated." },
    categories,
    source,
  ],
  education: [
    { name: "institution", label: "Institution" },
    { name: "credential", label: "Credential" },
    { name: "field_of_study", label: "Field of study" },
    { name: "location", label: "Location" },
    start,
    end,
    categories,
    source,
  ],
  fact: [
    {
      name: "fact_type",
      label: "Type",
      type: "select",
      options: ["skill", "fact"],
    },
    { name: "title", label: "Title" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "value_text", label: "Detail / value" },
    { name: "keywords", label: "Keywords", hint: "Comma-separated." },
    sensitivity,
    categories,
    source,
  ],
  credential: [
    {
      name: "fact_type",
      label: "Type",
      type: "select",
      options: ["licence", "certification"],
    },
    { name: "title", label: "Licence / certification name" },
    { name: "description", label: "Issuer and details", type: "textarea" },
    {
      name: "value_text",
      label: "Credential reference",
      hint: "Optional; avoid sensitive identification numbers.",
    },
    { name: "valid_from", label: "Issued / valid from", hint: start.hint },
    { name: "valid_to", label: "Expires / valid to", hint: start.hint },
    { name: "keywords", label: "Keywords", hint: "Comma-separated." },
    sensitivity,
    categories,
    source,
  ],
  project: [
    { name: "name", label: "Project name" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "technologies", label: "Technologies", hint: "Comma-separated." },
    {
      name: "achievements",
      label: "Achievements",
      type: "textarea",
      hint: "One factual achievement per line. Do not invent metrics.",
    },
    { name: "url", label: "Project URL" },
    categories,
    source,
  ],
};
export function defaultValues(
  kind: ProfileKind,
  values: Record<string, string | boolean> = {},
) {
  const result: Record<string, string | boolean> = {};
  for (const f of fields[kind])
    result[f.name] =
      values[f.name] ??
      (f.type === "checkbox"
        ? false
        : f.name === "sensitivity"
          ? "private"
          : (f.options?.[0] ?? ""));
  if (kind === "bullet") result.experience_id = values.experience_id ?? "";
  return result;
}
