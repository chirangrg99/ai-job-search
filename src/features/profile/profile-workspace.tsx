"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { VerificationBadge } from "./verification-badge";
import { EntryDetails } from "./entry-details";
import { EntryEditor } from "./entry-editor";
import { ReviewSheet } from "./review-sheet";
import {
  hasContent,
  itemTitle,
  profileHealth,
  sections,
  sectionNames,
  type CandidateProfile,
  type ProfileItem,
} from "./model";
import type { ProfileKind } from "./schema";
type DialogState =
  | {
      mode: "edit";
      kind: ProfileKind;
      item?: ProfileItem;
      experienceId?: string;
    }
  | { mode: "verify" | "delete"; item: ProfileItem };
export function ProfileWorkspace({ profile }: { profile: CandidateProfile }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const health = profileHealth(profile.items);
  function open(next: DialogState) {
    returnFocus.current = document.activeElement as HTMLElement;
    setDialog(next);
  }
  function close() {
    setDialog(null);
    requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      else heading.current?.focus();
    });
  }
  function saved() {
    setNotice(
      dialog?.mode === "verify"
        ? "Information verified."
        : dialog?.mode === "delete"
          ? "Entry deleted."
          : "Saved. Review this information before verifying it.",
    );
    close();
    router.refresh();
  }
  function controls(item: ProfileItem) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => open({ mode: "edit", kind: item.kind, item })}
        >
          Edit<span className="sr-only"> {itemTitle(item)}</span>
        </Button>
        {!item.verified && hasContent(item) && (
          <Button
            variant="outline"
            onClick={() => open({ mode: "verify", item })}
          >
            Review &amp; verify
            <span className="sr-only"> {itemTitle(item)}</span>
          </Button>
        )}
        {item.kind !== "personal" && item.kind !== "summary" && (
          <Button
            variant="ghost"
            onClick={() => open({ mode: "delete", item })}
          >
            Delete<span className="sr-only"> {itemTitle(item)}</span>
          </Button>
        )}
      </div>
    );
  }
  function renderItem(item: ProfileItem) {
    return (
      <article
        key={item.id + item.kind}
        className="space-y-4 rounded-md border p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">
            {itemTitle(item)}
          </h3>
          <VerificationBadge verified={item.verified} />
        </div>
        {item.verifiedAt && (
          <p className="text-xs text-text-secondary">
            Confirmed {item.verifiedAt.slice(0, 10)} · revision {item.revision}
          </p>
        )}
        <EntryDetails item={item} />
        {controls(item)}
        {item.kind === "experience" && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium">Experience bullets</h4>
              <Button
                variant="outline"
                onClick={() =>
                  open({ mode: "edit", kind: "bullet", experienceId: item.id })
                }
              >
                Add bullet
              </Button>
            </div>
            {profile.items
              .filter(
                (b) =>
                  b.kind === "bullet" && b.values.experience_id === item.id,
              )
              .map((b) => (
                <div
                  key={b.id}
                  className="space-y-3 rounded-md bg-surface-subtle p-4"
                >
                  <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                    {String(b.values.original_text)}
                  </p>
                  <VerificationBadge verified={b.verified} />
                  <p className="text-xs text-text-secondary">
                    Categories: {String(b.values.categories) || "Not provided"}
                  </p>
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                      Source details
                    </summary>
                    <EntryDetails item={b} />
                  </details>
                  {controls(b)}
                </div>
              ))}
            {!profile.items.some(
              (b) => b.kind === "bullet" && b.values.experience_id === item.id,
            ) && (
              <p className="text-sm text-text-secondary">
                Add factual responsibilities and achievements. Each bullet is
                verified separately.
              </p>
            )}
          </div>
        )}
      </article>
    );
  }
  return (
    <div className="space-y-6">
      <div ref={heading} tabIndex={-1}>
        <PageHeader
          title="Master Profile"
          description="Maintain the facts that support every tailored application."
        />
      </div>
      <div
        role="status"
        aria-live="polite"
        className={
          notice
            ? "rounded-md bg-success-soft p-3 text-sm text-success"
            : "sr-only"
        }
      >
        {notice}
      </div>
      <div className="rounded-lg border bg-surface p-5">
        <h2 className="font-semibold">Your verified career record</h2>
        <p className="mt-2 text-sm text-text-secondary">
          One source of truth for every application. Saving does not verify
          information. Confirm each source explicitly; changes require a new
          review.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <nav
            aria-label="Profile sections"
            className="hidden flex-wrap gap-2 sm:flex"
          >
            {sections.map((k) => (
              <a
                key={k}
                href={`#section-${k}`}
                className="inline-flex min-h-11 items-center rounded-md border bg-surface px-3 text-sm hover:bg-surface-subtle"
              >
                {sectionNames[k]}
              </a>
            ))}
          </nav>
          <label className="block sm:hidden">
            <span className="mb-2 block text-sm font-medium">
              Jump to section
            </span>
            <select
              className="h-11 w-full rounded-md border border-input bg-surface px-3"
              defaultValue="personal"
              onChange={(e) =>
                document
                  .getElementById(`section-${e.target.value}`)
                  ?.scrollIntoView()
              }
            >
              {sections.map((k) => (
                <option key={k} value={k}>
                  {sectionNames[k]}
                </option>
              ))}
            </select>
          </label>
          {sections.map((kind) => {
            const items = profile.items.filter((i) => i.kind === kind);
            return (
              <section
                id={`section-${kind}`}
                key={kind}
                className="scroll-mt-24 space-y-4 rounded-lg border bg-surface p-4 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">
                    {sectionNames[kind]}
                  </h2>
                  {kind !== "personal" && kind !== "summary" && (
                    <Button
                      variant="outline"
                      onClick={() => open({ mode: "edit", kind })}
                    >
                      Add {kind === "credential" ? "credential" : kind}
                    </Button>
                  )}
                </div>
                {!items.length && (
                  <p className="text-sm text-text-secondary">
                    No entries yet. Add your own information when applicable.
                  </p>
                )}
                {items.filter((i) => i.verified).map(renderItem)}
                {items.some((i) => !i.verified) && (
                  <>
                    <p className="text-sm font-medium text-warning">
                      Awaiting verification
                    </p>
                    {items.filter((i) => !i.verified).map(renderItem)}
                  </>
                )}
              </section>
            );
          })}
        </div>
        <aside
          aria-label="Profile health"
          className="row-start-1 space-y-4 rounded-lg border bg-surface p-6 shadow-sm xl:sticky xl:top-24 xl:col-start-2"
        >
          <h2 className="text-xl font-semibold">Profile health</h2>
          <p className="text-3xl font-semibold tabular-nums">
            {health.completeness}%{" "}
            <span className="text-sm font-normal text-text-secondary">
              core sections populated
            </span>
          </p>
          <progress
            className="h-2 w-full accent-primary"
            aria-label="Profile completeness"
            max={100}
            value={health.completeness}
          />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Verified facts / source items</dt>
              <dd className="font-semibold">{health.verified}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Awaiting verification</dt>
              <dd className="font-semibold">{health.unverified}</dd>
            </div>
          </dl>
          <p className="text-xs text-text-secondary">
            Completeness measures personal details, summary, experience,
            education and skills/facts. It does not measure fit or truth.
            Projects and credentials are optional; never invent information to
            fill a section.
          </p>
          <h3 className="font-medium">Missing major sections</h3>
          {health.missing.length ? (
            <ul className="space-y-2 text-sm">
              {health.missing.map((k) => (
                <li key={k}>
                  <a
                    className="inline-flex min-h-11 items-center text-primary underline"
                    href={`#section-${k}`}
                  >
                    {sectionNames[k]}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">
              All core sections contain information. Review any unverified
              sources.
            </p>
          )}
        </aside>
      </div>
      {dialog?.mode === "edit" && (
        <EntryEditor
          kind={dialog.kind}
          item={dialog.item}
          experienceId={dialog.experienceId}
          onClose={close}
          onSaved={saved}
        />
      )}
      {dialog && dialog.mode !== "edit" && (
        <ReviewSheet
          item={dialog.item}
          operation={dialog.mode}
          onClose={close}
          onSaved={saved}
        />
      )}
    </div>
  );
}
