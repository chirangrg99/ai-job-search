"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { changeProfileEntry } from "@/app/(workspace)/profile/actions";
import type { ProfileItem } from "./model";
import { EntryDetails } from "./entry-details";
export function ReviewSheet({
  item,
  operation,
  onClose,
  onSaved,
}: {
  item: ProfileItem;
  operation: "verify" | "delete";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function apply() {
    setPending(true);
    try {
      const r = await changeProfileEntry(operation, {
        kind: item.kind,
        id: item.id,
        revision: item.revision,
      });
      if (r.ok) onSaved();
      else setError(r.error);
    } catch {
      setError(
        "The change could not be completed. Check your connection and retry.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v && !pending) onClose();
      }}
    >
      <SheetContent
        className="w-full gap-0 sm:max-w-xl"
        showCloseButton={!pending}
      >
        <SheetHeader className="border-b p-6 pr-14">
          <SheetTitle>
            {operation === "verify"
              ? "Review and verify"
              : "Delete this entry?"}
          </SheetTitle>
          <SheetDescription>
            {operation === "verify"
              ? "Confirm that the saved information below is accurate. This does not verify any other item."
              : item.kind === "experience"
                ? "This permanently removes the role and all its experience bullets."
                : "This permanently removes this entry from your master profile."}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          <EntryDetails item={item} />
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-primary"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={pending}
            />
            {operation === "verify"
              ? "I confirm this information is accurate and comes from my own records."
              : "I understand this entry will be permanently deleted."}
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <footer className="flex flex-wrap gap-3 border-t p-4">
          <Button
            variant={operation === "delete" ? "destructive" : "default"}
            disabled={!confirmed || pending}
            onClick={apply}
          >
            {pending
              ? "Please wait…"
              : operation === "verify"
                ? "Confirm verified"
                : "Delete entry"}
          </Button>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
