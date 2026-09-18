"use client";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { savePreference } from "@/app/(workspace)/preferences/actions";
import {
  preferenceSchema,
  remoteModes,
  employmentTypes,
  salaryPeriods,
  label,
  type SavedSearch,
} from "./schema";
import { formValues, formInput, type SearchForm } from "./form";
import { preferenceSummary } from "./summary";
const control =
  "min-h-11 w-full rounded-md border border-input bg-surface px-3 py-2 text-base";
const fields = [
  {
    name: "name",
    label: "Search name",
    hint: "A name that distinguishes this search.",
  },
  {
    name: "target_titles",
    label: "Target titles",
    multiline: true,
    hint: "One title phrase per line. Any may match. Leave blank for any title.",
  },
  {
    name: "excluded_titles",
    label: "Excluded titles",
    multiline: true,
    hint: "One phrase per line. Matching title phrases reject a job.",
  },
  {
    name: "keywords",
    label: "Required keywords",
    multiline: true,
    hint: "One phrase per line. All are required in the title or complete description.",
  },
  {
    name: "excluded_keywords",
    label: "Excluded keywords",
    multiline: true,
    hint: "One phrase per line. Any matching phrase rejects a job.",
  },
  {
    name: "target_locations",
    label: "Locations",
    multiline: true,
    hint: "One location per line; any may match. Include city and region on the same line. Unknown or unnormalized locations stay eligible for review.",
  },
  {
    name: "min_salary",
    label: "Minimum salary",
    number: true,
    hint: "Optional. Compared only with the same currency and period.",
  },
  {
    name: "salary_currency",
    label: "Salary currency",
    hint: "Three-letter code, such as CAD or USD. Required when a minimum is set.",
  },
  {
    name: "max_commute_km",
    label: "Maximum commute distance (km)",
    number: true,
    hint: "Optional, 0–2000 km from your commute origin. Applies when reliable distance is available; fully remote roles skip this check.",
  },
  {
    name: "minimum_fit_score",
    label: "Minimum fit score",
    number: true,
    hint: "Optional, 0–100. Evaluated when a fit score exists; no score is generated here.",
  },
];
export function SearchEditor({
  search,
  onClose,
  onSaved,
}: {
  search?: SavedSearch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<SearchForm>({ defaultValues: formValues(search) });
  const values = useWatch({ control: form.control });
  const preview = preferenceSchema.safeParse(formInput(values as SearchForm));
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const { isDirty, isSubmitting: pending, errors } = form.formState;
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  function close() {
    if (pending) return;
    if (isDirty) setDiscard(true);
    else onClose();
  }
  async function submit(values: SearchForm) {
    setError("");
    form.clearErrors();
    const input = formInput(values);
    const parsed = preferenceSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        form.setError(String(issue.path[0]), { message: issue.message });
      form.setFocus(String(parsed.error.issues[0]?.path[0]));
      setError("Check the highlighted fields.");
      return;
    }
    try {
      const result = await savePreference(
        input,
        search ? { id: search.id, updated_at: search.updated_at } : undefined,
      );
      if (result.ok) {
        onSaved();
        return;
      }
      setError(result.error);
      for (const [key, message] of Object.entries(result.fields ?? {}))
        form.setError(key, { message });
    } catch {
      setError(
        "Could not save. Your edits remain here; check your connection and retry.",
      );
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent
        className="w-full gap-0 sm:max-w-xl"
        showCloseButton={!pending}
      >
        <SheetHeader className="border-b p-6 pr-14">
          <SheetTitle>
            {search ? "Edit saved search" : "New saved search"}
          </SheetTitle>
          <SheetDescription>
            Independent criteria for one master profile. These are saved
            preferences, not temporary Jobs filters.
          </SheetDescription>
        </SheetHeader>
        {discard ? (
          <div className="space-y-4 p-6" role="alert">
            <h3 className="font-semibold">Discard unsaved changes?</h3>
            <Button onClick={() => setDiscard(false)}>Keep editing</Button>
            <Button variant="outline" onClick={onClose}>
              Discard changes
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={form.handleSubmit(submit)}
            className="flex min-h-0 flex-1 flex-col"
            aria-busy={pending}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    htmlFor={`search-${field.name}`}
                  >
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      id={`search-${field.name}`}
                      rows={3}
                      className={control}
                      disabled={pending}
                      aria-invalid={!!errors[field.name]}
                      aria-describedby={`help-${field.name} error-${field.name}`}
                      {...form.register(field.name)}
                    />
                  ) : (
                    <Input
                      id={`search-${field.name}`}
                      type={field.number ? "number" : "text"}
                      step={field.name === "minimum_fit_score" ? "1" : "any"}
                      disabled={pending}
                      aria-invalid={!!errors[field.name]}
                      aria-describedby={`help-${field.name} error-${field.name}`}
                      {...form.register(field.name)}
                    />
                  )}
                  <p
                    id={`help-${field.name}`}
                    className="text-xs text-text-secondary"
                  >
                    {field.hint}
                  </p>
                  <p id={`error-${field.name}`} className="text-sm text-danger">
                    {errors[field.name]?.message}
                  </p>
                </div>
              ))}
              <div className="space-y-2">
                <label
                  htmlFor="search-salary_period"
                  className="block text-sm font-medium"
                >
                  Salary period
                </label>
                <select
                  id="search-salary_period"
                  className={control}
                  disabled={pending}
                  aria-invalid={!!errors.salary_period}
                  aria-describedby="error-salary_period"
                  {...form.register("salary_period")}
                >
                  <option value="">Not set</option>
                  {salaryPeriods.map((period) => (
                    <option key={period} value={period}>
                      Per {period}
                    </option>
                  ))}
                </select>
                <p id="error-salary_period" className="text-sm text-danger">
                  {errors.salary_period?.message}
                </p>
              </div>
              {(
                [
                  ["remote_preferences", "Work modes", remoteModes],
                  ["employment_types", "Employment types", employmentTypes],
                ] as const
              ).map(([name, title, options]) => (
                <fieldset key={name} disabled={pending} className="space-y-2">
                  <legend className="text-sm font-medium">{title}</legend>
                  <p className="text-xs text-text-secondary">
                    Select any acceptable options. None selected means any.
                  </p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {options.map((option) => (
                      <label
                        key={option}
                        className="flex min-h-11 items-center gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          value={option}
                          className="size-5 accent-primary"
                          {...form.register(name)}
                        />
                        {label(option)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  disabled={pending}
                  {...form.register("enabled")}
                />
                Enable this search
              </label>
              <div className="space-y-2 rounded-md bg-surface-subtle p-4">
                <h3 className="font-medium">Criteria preview</h3>
                <p className="text-sm [overflow-wrap:anywhere]">
                  {preview.success
                    ? preferenceSummary(preview.data)
                    : "Complete the search name and resolve invalid fields to preview your criteria."}
                </p>
                <p className="text-xs text-text-secondary">
                  Unknown data stays eligible for review with reasons. A salary
                  range overlapping your minimum does not guarantee it. No jobs
                  are fetched yet.
                </p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
            <footer className="flex flex-wrap gap-3 border-t p-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={close}
              >
                Cancel
              </Button>
            </footer>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
