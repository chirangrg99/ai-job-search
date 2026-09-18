"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { changePreference } from "@/app/(workspace)/preferences/actions";
import type { SavedSearch } from "./schema";
import { SearchEditor } from "./editor";
import { SearchCriteria } from "./summary";
export function PreferencesWorkspace({
  searches,
}: {
  searches: SavedSearch[];
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<SavedSearch | "new" | null>(null);
  const [deleting, setDeleting] = useState<SavedSearch | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  function remember() {
    trigger.current = document.activeElement as HTMLElement;
    setError("");
  }
  function close() {
    setEditor(null);
    setDeleting(null);
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus();
      else newButton.current?.focus();
    });
  }
  function saved() {
    setNotice("Saved search updated.");
    close();
    router.refresh();
  }
  async function change(
    search: SavedSearch,
    operation: "duplicate" | "delete" | "set_enabled",
  ) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await changePreference({
        operation,
        target: { id: search.id, updated_at: search.updated_at },
        ...(operation === "set_enabled" ? { enabled: !search.enabled } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(
        operation === "duplicate"
          ? "Created a paused copy. Edit and enable it when ready."
          : operation === "delete"
            ? "Saved search deleted."
            : search.enabled
              ? "Search paused."
              : "Search enabled.",
      );
      close();
      router.refresh();
    } catch {
      setError("Could not change the search. Check your connection and retry.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Preferences"
        description="Configure independent saved searches for your master candidate profile."
        action={
          <Button
            ref={newButton}
            disabled={pending}
            onClick={() => {
              remember();
              setEditor("new");
            }}
          >
            <Plus aria-hidden="true" />
            New saved search
          </Button>
        }
      />
      <div
        role="status"
        className={
          notice
            ? "rounded-md bg-success-soft p-3 text-sm text-success"
            : "sr-only"
        }
      >
        {notice}
      </div>
      {error && !deleting && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <section className="rounded-lg border bg-surface p-5">
        <h2 className="font-semibold">Saved searches, one profile</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Each search keeps its own titles, locations and limits. Pausing or
          deleting a search does not remove your profile or existing jobs. Job
          discovery is not connected yet; no searches have been run by this
          feature.
        </p>
      </section>
      {!searches.length ? (
        <section className="space-y-3 rounded-lg border bg-surface p-8 text-center">
          <Search aria-hidden="true" className="mx-auto size-6 text-muted" />
          <h2 className="text-section font-semibold">
            Create your first saved search
          </h2>
          <p className="text-sm text-text-secondary">
            Set the roles and conditions you want. Add more searches whenever
            you need a different strategy.
          </p>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {searches.map((search) => (
            <article
              key={search.id}
              aria-label={search.name}
              className="min-w-0 space-y-5 rounded-lg border bg-surface p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="min-w-0 text-section font-semibold [overflow-wrap:anywhere]">
                  {search.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${search.enabled ? "bg-success-soft text-success" : "bg-surface-subtle text-text-secondary"}`}
                >
                  {search.enabled ? (
                    <Play aria-hidden="true" className="size-3" />
                  ) : (
                    <Pause aria-hidden="true" className="size-3" />
                  )}
                  {search.enabled ? "Enabled" : "Paused"}
                </span>
              </div>
              <SearchCriteria search={search} />
              <p className="text-xs text-text-secondary">
                Unknown values remain eligible for review; clear mismatches are
                rejected.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  aria-label={`Edit ${search.name}`}
                  disabled={pending}
                  onClick={() => {
                    remember();
                    setEditor(search);
                  }}
                >
                  Edit<span className="sr-only"> {search.name}</span>
                </Button>
                <Button
                  variant="outline"
                  aria-label={`Duplicate ${search.name}`}
                  disabled={pending}
                  onClick={() => {
                    remember();
                    void change(search, "duplicate");
                  }}
                >
                  Duplicate<span className="sr-only"> {search.name}</span>
                </Button>
                <Button
                  variant="outline"
                  aria-label={`${search.enabled ? "Pause" : "Enable"} ${search.name}`}
                  disabled={pending}
                  onClick={() => {
                    remember();
                    void change(search, "set_enabled");
                  }}
                >
                  {search.enabled ? "Pause" : "Enable"}
                  <span className="sr-only"> {search.name}</span>
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${search.name}`}
                  disabled={pending}
                  onClick={() => {
                    remember();
                    setDeleting(search);
                  }}
                >
                  Delete<span className="sr-only"> {search.name}</span>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editor && (
        <SearchEditor
          search={editor === "new" ? undefined : editor}
          onClose={close}
          onSaved={saved}
        />
      )}
      {deleting && (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open && !pending) close();
          }}
        >
          <SheetContent
            showCloseButton={!pending}
            className="w-full sm:max-w-xl"
          >
            <SheetHeader>
              <SheetTitle>Delete saved search?</SheetTitle>
              <SheetDescription>
                This permanently removes “{deleting.name}”. Your candidate
                profile and existing jobs remain. Pause instead if you may use
                these criteria again.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-4">
              {error && (
                <p role="alert" className="text-danger">
                  {error}
                </p>
              )}
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => void change(deleting, "delete")}
              >
                {pending ? "Deleting…" : "Delete search"}
              </Button>
              <Button variant="outline" disabled={pending} onClick={close}>
                Cancel
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
