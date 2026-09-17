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
import { saveProfileEntry } from "@/app/(workspace)/profile/actions";
import { fields, defaultValues } from "./fields";
import { entrySchema, type ProfileKind } from "./schema";
import { categorySuggestions, sectionNames, type ProfileItem } from "./model";
const control =
  "min-h-11 w-full rounded-md border border-input bg-surface px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
export function EntryEditor({
  kind,
  item,
  experienceId,
  onClose,
  onSaved,
}: {
  kind: ProfileKind;
  item?: ProfileItem;
  experienceId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<Record<string, string | boolean>>({
    defaultValues: defaultValues(kind, {
      ...item?.values,
      ...(experienceId ? { experience_id: experienceId } : {}),
    }),
  });
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting;
  const current = useWatch({
    control: form.control,
    name: "currently_employed",
  });
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (pending) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function submit(values: Record<string, string | boolean>) {
    setError("");
    form.clearErrors();
    const input = { ...values, kind };
    const check = entrySchema.safeParse(input);
    if (!check.success) {
      for (const issue of check.error.issues)
        form.setError(String(issue.path[0]), { message: issue.message });
      form.setFocus(String(check.error.issues[0]?.path[0]));
      setError("Check the highlighted fields.");
      return;
    }
    try {
      const result = await saveProfileEntry(
        input,
        item ? { kind, id: item.id, revision: item.revision } : undefined,
      );
      if (result.ok) {
        onSaved();
        return;
      }
      setError(result.error);
      for (const [key, message] of Object.entries(result.fields ?? {}))
        form.setError(key, { message });
      if (result.fields) form.setFocus(Object.keys(result.fields)[0] ?? "");
    } catch {
      setError(
        "Your changes were not saved. Check your connection and sign-in, then retry.",
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
            {item ? "Edit" : "Add"} {sectionNames[kind].toLowerCase()}
          </SheetTitle>
          <SheetDescription>
            Save your information, then review and verify it separately. Editing
            a verified item requires new confirmation.
          </SheetDescription>
        </SheetHeader>
        {discard ? (
          <div className="space-y-4 p-6" role="alert">
            <h3 className="font-semibold">Discard unsaved changes?</h3>
            <p>Your saved profile will remain unchanged.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setDiscard(false)}>Keep editing</Button>
              <Button variant="outline" onClick={onClose}>
                Discard changes
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(submit)}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            aria-busy={pending}
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
              {fields[kind].map((f) => {
                const invalid = form.formState.errors[f.name];
                const id = `profile-${f.name}`;
                const disabled =
                  pending || (f.name === "end_date" && current === true);
                return (
                  <div key={f.name} className="space-y-2">
                    <label
                      htmlFor={id}
                      className={`text-sm font-medium ${f.type === "checkbox" ? "flex min-h-11 items-center gap-3" : "block"}`}
                    >
                      {f.type === "checkbox" && (
                        <input
                          id={id}
                          type="checkbox"
                          className="size-5 accent-primary"
                          disabled={pending}
                          {...form.register(f.name, {
                            onChange: (e) => {
                              if (e.target.checked)
                                form.setValue("end_date", "", {
                                  shouldDirty: true,
                                });
                            },
                          })}
                        />
                      )}
                      {f.label}
                    </label>
                    {f.type !== "checkbox" &&
                      (f.type === "textarea" ? (
                        <textarea
                          id={id}
                          rows={5}
                          className={control}
                          disabled={pending}
                          readOnly={f.name === "end_date" && current === true}
                          aria-invalid={!!invalid}
                          aria-describedby={`${id}-help ${id}-error`}
                          {...form.register(f.name)}
                        />
                      ) : f.type === "select" ? (
                        <select
                          id={id}
                          className={control}
                          disabled={disabled}
                          {...form.register(f.name)}
                        >
                          {f.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={id}
                          disabled={pending}
                          readOnly={f.name === "end_date" && current === true}
                          aria-invalid={!!invalid}
                          aria-describedby={`${id}-help ${id}-error`}
                          {...form.register(f.name)}
                        />
                      ))}
                    <p
                      id={`${id}-help`}
                      className="text-xs text-text-secondary"
                    >
                      {disabled && f.name === "end_date"
                        ? "Current role — no end date."
                        : f.hint}
                    </p>
                    {f.name === "categories" && (
                      <p className="text-xs text-text-secondary">
                        Examples: {categorySuggestions.join(", ")}.
                      </p>
                    )}
                    <p id={`${id}-error`} className="text-sm text-danger">
                      {invalid?.message}
                    </p>
                  </div>
                );
              })}
              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-danger-soft p-3 text-sm text-danger"
                >
                  {error}
                </p>
              )}
            </div>
            <footer className="flex flex-wrap gap-3 border-t p-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save draft"}
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
