import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  assess: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/app/(workspace)/jobs/[jobId]/fit-actions", () => ({
  assessSavedJob: m.assess,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh, push: m.push }),
}));
import { FitResultView } from "./result";
import { FitControl } from "./control";
import { matchJobToProfile } from "./engine";
import { strongInput } from "../../../tests/fixtures/fit";
beforeEach(() => vi.resetAllMocks());
it("explains the score with source IDs and verification labels", async () => {
  render(<FitResultView result={matchJobToProfile(strongInput())} />);
  expect(screen.getByText("100 / 100")).toBeVisible();
  expect(
    screen.getByRole("meter", { name: "Evidence fit score" }),
  ).toHaveAttribute("value", "100");
  await userEvent.click(screen.getAllByText("View sources")[0]!);
  expect(screen.getAllByText(/Verified source/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Source ID/).length).toBeGreaterThan(0);
});
it("renders insufficient evidence without presenting zero as a fit judgement", () => {
  const i = strongInput();
  i.candidates = [];
  render(<FitResultView result={matchJobToProfile(i)} />);
  expect(screen.getByText("Insufficient evidence")).toBeVisible();
  expect(screen.queryByRole("meter")).not.toBeInTheDocument();
});
it("disables assessment until requirements exist", () => {
  render(
    <FitControl
      jobId="job"
      searches={[]}
      preferenceId={null}
      mode="rules"
      configured
      ready={false}
    />,
  );
  expect(screen.getByRole("button", { name: "Assess fit" })).toBeDisabled();
});
it("passes selected search and mode, surfaces errors", async () => {
  m.assess.mockResolvedValue({ ok: false, error: "Try again" });
  render(
    <FitControl
      jobId="job"
      searches={[{ id: "search", name: "Software" }]}
      preferenceId="search"
      mode="rules"
      configured
      ready
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Assess fit" }));
  expect(m.assess).toHaveBeenCalledWith({
    jobId: "job",
    preferenceId: "search",
    mode: "rules",
  });
  expect(screen.getByRole("status")).toHaveTextContent("Try again");
});
it("marks transferable semantic matches as AI drafts", () => {
  const r = matchJobToProfile(strongInput());
  r.matches[0] = {
    ...r.matches[0]!,
    status: "transferable",
    method: "semantic",
  };
  render(<FitResultView result={r} />);
  expect(screen.getByText("Transferable — not exact · AI draft")).toBeVisible();
});
