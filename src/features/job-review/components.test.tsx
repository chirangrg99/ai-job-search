import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ prepare: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/(workspace)/jobs/[jobId]/prepare-actions", () => ({
  prepareApplication: m.prepare,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
import {
  FitBadge,
  JobTable,
  ReviewEmpty,
  ReviewFilters,
  ReviewPagination,
} from "./components";
import { DetailTabs } from "./detail-tabs";
import { JobDetailHeader } from "./detail-header";
import { PrepareControl } from "./prepare-control";
import { Dashboard } from "./dashboard";
import { reviewQuerySchema } from "./model";
import { reviewJobFixture as fixture } from "../../../tests/fixtures/job-review";
import { strongInput } from "../../../tests/fixtures/fit";
import { matchJobToProfile } from "@/features/fit/engine";
beforeEach(() => vi.clearAllMocks());
it("labels every filter and preserves selected values", () => {
  render(
    <ReviewFilters
      query={reviewQuerySchema.parse({ remote: "hybrid", minFit: 80 })}
      searches={[]}
      sources={["manual"]}
    />,
  );
  for (const label of [
    "Search jobs",
    "Discovered by saved search",
    "Location",
    "Work arrangement",
    "Employment type",
    "Source",
    "Application status",
    "Fit state",
    "Minimum fit score",
    "Sort by",
  ])
    expect(screen.getByLabelText(label)).toBeVisible();
  expect(screen.getByLabelText("Work arrangement")).toHaveValue("hybrid");
  expect(screen.getByLabelText("Minimum fit score")).toHaveValue(80);
});
it.each([
  [false, "Your job collection starts here"],
  [true, "No jobs match these filters"],
] as const)("provides actionable empty state %s", (hasJobs, title) => {
  render(<ReviewEmpty hasJobs={hasJobs} />);
  expect(screen.getByRole("heading", { name: title })).toBeVisible();
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    hasJobs ? "/jobs" : "/preferences",
  );
});
it("shows real zero independently of missing and stale scores", () => {
  const r = matchJobToProfile(strongInput());
  render(
    <>
      <FitBadge fit={{ state: "unassessed" }} />
      <FitBadge fit={{ state: "stale" }} />
      <FitBadge
        fit={{
          state: "current",
          result: { ...r, fitScore: 0, recommendation: "skip" },
          searchName: "Profile only",
          preferenceId: null,
          mode: "rules",
          analyzedAt: "now",
        }}
      />
    </>,
  );
  expect(screen.getByText("0 / 100")).toBeVisible();
  expect(screen.getByText("Not assessed")).toBeVisible();
  expect(screen.getByText("Needs reassessment")).toBeVisible();
});
it("uses semantic table headers, accessible scroll region and detail links", () => {
  render(<JobTable jobs={[fixture()]} />);
  expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  expect(screen.getByRole("region")).toHaveAttribute("tabindex", "0");
  expect(
    within(screen.getByRole("table")).getByRole("link", {
      name: "Frontend Developer",
    }),
  ).toHaveAttribute("href", "/jobs/job-a");
});
it("preserves filters through pagination and disables unavailable directions", () => {
  render(
    <ReviewPagination
      query={reviewQuerySchema.parse({ q: "React" })}
      page={1}
      pages={2}
      total={21}
    />,
  );
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "Next" }).getAttribute("href"),
  ).toContain("q=React");
});
it("renders detail facts, score state and safe original link", () => {
  render(
    <JobDetailHeader
      job={fixture()}
      url="https://example.com/job"
      fit={{ state: "stale" }}
    />,
  );
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Frontend Developer",
  );
  expect(screen.getByText("Source: Adzuna")).toBeVisible();
  expect(screen.getByText(/CAD 50,000–70,000/)).toBeVisible();
  expect(screen.getByText("Needs reassessment")).toBeVisible();
  expect(
    screen.getByRole("link", { name: /Open Original Posting/ }),
  ).toHaveAttribute("rel", "noopener noreferrer");
});
it("never renders unsafe original URLs", () => {
  render(
    <JobDetailHeader
      job={fixture()}
      url="javascript:alert(1)"
      fit={{ state: "unassessed" }}
    />,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
it("switches detail tabs with keyboard arrows and keeps inactive panels hidden", async () => {
  render(
    <DetailTabs
      overview={<h2>Role overview</h2>}
      analysis={<h2>Verified evidence</h2>}
      description={<h2>Source text</h2>}
    />,
  );
  const u = userEvent.setup();
  await u.tab();
  expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
  await u.keyboard("{ArrowRight}");
  expect(
    await screen.findByRole("heading", { name: "Verified evidence" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Role overview" }),
  ).not.toBeInTheDocument();
  await u.keyboard("{End}");
  expect(
    await screen.findByRole("heading", { name: "Source text" }),
  ).toBeVisible();
});
it("starts preparation once and reports failure for retry", async () => {
  m.prepare
    .mockResolvedValueOnce({ ok: false, error: "Retry safely" })
    .mockResolvedValueOnce({ ok: true });
  render(<PrepareControl jobId="job" status={null} />);
  const u = userEvent.setup();
  await u.click(screen.getByRole("button", { name: "Prepare Application" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Retry safely");
  await u.click(screen.getByRole("button", { name: "Prepare Application" }));
  expect(
    screen.getByRole("button", { name: "Application started" }),
  ).toBeDisabled();
  expect(m.refresh).toHaveBeenCalledOnce();
});
it("does not restart submitted applications", () => {
  render(<PrepareControl jobId="job" status="applied" />);
  expect(
    screen.getByRole("button", { name: "Application started" }),
  ).toBeDisabled();
  expect(screen.getByText(/Status: Applied/)).toBeVisible();
});
it("dashboard empty counts stay zero with no fake opportunities", () => {
  render(
    <Dashboard jobs={[]} sources={[]} runs={[]} now={new Date("2026-09-28")} />,
  );
  expect(screen.getByText("No discovered jobs yet")).toBeVisible();
  for (const title of [
    "New Jobs",
    "Strong Matches",
    "Ready to Apply",
    "Applied",
  ]) {
    const section = screen.getByRole("heading", { name: title }).parentElement!;
    expect(within(section).getByText("0")).toBeVisible();
  }
  expect(screen.getByText("No sync has run yet.")).toBeVisible();
});
