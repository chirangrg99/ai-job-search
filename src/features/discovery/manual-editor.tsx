"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  employmentTypes,
  remoteModes,
  salaryPeriods,
  label,
} from "@/features/preferences/schema";
import { manualJobSchema } from "./schema";
import { addManualJob } from "@/app/(workspace)/jobs/actions";
const fields = [
  ["title", "Job title"],
  ["company", "Company"],
  ["location", "Location"],
  ["country", "Country code"],
  ["applicationUrl", "Original posting URL"],
  ["description", "Job description"],
  ["salaryMin", "Advertised salary minimum"],
  ["salaryMax", "Advertised salary maximum"],
  ["salaryCurrency", "Salary currency"],
] as const;
const control =
  "min-h-11 w-full rounded-md border border-input bg-surface px-3 py-2";
export function ManualJobEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<Record<string, string | boolean>>({
    defaultValues: {
      title: "",
      company: "",
      location: "",
      country: "",
      applicationUrl: "",
      description: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "",
      salaryPeriod: "",
      employmentType: "",
      remoteType: "",
      descriptionComplete: false,
    },
  });
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
  async function save(values: Record<string, string | boolean>) {
    form.clearErrors();
    setError("");
    const input = {
      ...values,
      country: String(values.country).trim().toUpperCase(),
      salaryMin: String(values.salaryMin).trim()
        ? Number(values.salaryMin)
        : null,
      salaryMax: String(values.salaryMax).trim()
        ? Number(values.salaryMax)
        : null,
      salaryCurrency:
        String(values.salaryCurrency).trim().toUpperCase() || null,
      salaryPeriod: values.salaryPeriod || null,
      employmentType: values.employmentType || null,
      remoteType: values.remoteType || null,
    };
    const parsed = manualJobSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        form.setError(String(issue.path[0]), { message: issue.message });
      form.setFocus(String(parsed.error.issues[0]?.path[0]));
      setError("Check the highlighted fields.");
      return;
    }
    try {
      const result = await addManualJob(parsed.data);
      if (result.ok) onSaved(result.message);
      else setError(result.error);
    } catch {
      setError(
        "Could not save. Your input remains here; check your connection and retry.",
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
          <SheetTitle>Add job manually</SheetTitle>
          <SheetDescription>
            Enter known posting fields and paste its description. Unknown values
            stay blank. No website is scraped.
          </SheetDescription>
        </SheetHeader>
        {discard ? (
          <div className="space-y-4 p-6" role="alert">
            <h3>Discard unsaved job?</h3>
            <Button onClick={() => setDiscard(false)}>Keep editing</Button>
            <Button variant="outline" onClick={onClose}>
              Discard changes
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={form.handleSubmit(save)}
            className="flex min-h-0 flex-1 flex-col"
            aria-busy={pending}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {fields.map(([name, title]) => (
                <div key={name} className="space-y-2">
                  <label
                    htmlFor={`job-${name}`}
                    className="block text-sm font-medium"
                  >
                    {title}
                    {name === "title" || name === "description"
                      ? " (required)"
                      : ""}
                  </label>
                  {name === "description" ? (
                    <textarea
                      id={`job-${name}`}
                      rows={8}
                      className={control}
                      aria-invalid={!!errors[name]}
                      aria-describedby={`job-${name}-error`}
                      disabled={pending}
                      {...form.register(name)}
                    />
                  ) : (
                    <Input
                      id={`job-${name}`}
                      type={
                        name === "salaryMin" || name === "salaryMax"
                          ? "number"
                          : "text"
                      }
                      step="any"
                      aria-invalid={!!errors[name]}
                      aria-describedby={`job-${name}-error`}
                      disabled={pending}
                      {...form.register(name)}
                    />
                  )}
                  <p id={`job-${name}-error`} className="text-sm text-danger">
                    {errors[name]?.message}
                  </p>
                </div>
              ))}
              <p className="text-xs text-text-secondary">
                Country uses two letters (CA); currency uses three (CAD). Salary
                values are optional and must come from the posting.
              </p>
              {(
                [
                  ["salaryPeriod", "Salary period", salaryPeriods],
                  ["employmentType", "Employment type", employmentTypes],
                  ["remoteType", "Work mode", remoteModes],
                ] as const
              ).map(([name, title, options]) => (
                <div key={name} className="space-y-2">
                  <label
                    htmlFor={`job-${name}`}
                    className="block text-sm font-medium"
                  >
                    {title}
                  </label>
                  <select
                    id={`job-${name}`}
                    className={control}
                    disabled={pending}
                    {...form.register(name)}
                  >
                    <option value="">Not provided</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {label(option)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  disabled={pending}
                  {...form.register("descriptionComplete")}
                />
                This is the full job description
              </label>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
            <footer className="flex gap-3 border-t p-4">
              <Button disabled={pending} type="submit">
                {pending ? "Saving…" : "Add job"}
              </Button>
              <Button
                disabled={pending}
                variant="outline"
                type="button"
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
