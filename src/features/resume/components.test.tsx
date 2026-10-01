import { it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const m = vi.hoisted(() => ({
  action: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/app/(workspace)/applications/[applicationId]/actions", () => ({
  generateResumeAction: m.action,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace, refresh: m.refresh }),
}));
import { ResumePreview, ValidationPanel } from "./preview";
import { GenerateControl } from "./generate-control";
import { PackageTabs } from "./package-tabs";
import { resumeFixture, approvedReview } from "../../../tests/fixtures/resume";
import { validateGeneratedApplication } from "./validate";
beforeEach(() => vi.resetAllMocks());
it("shows plain preview, immutable identity and expandable sources", async () => {
  const { draft, context } = await resumeFixture();
  render(<ResumePreview draft={draft} context={context} />);
  expect(
    screen.getByRole("article", { name: "Resume preview" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Frontend Developer · Example Software"),
  ).toBeInTheDocument();
  expect(screen.getByText("2022-01 — 2025-12")).toBeInTheDocument();
  expect(
    screen.getAllByText(/Verified source evidence/).length,
  ).toBeGreaterThan(0);
  expect(screen.getByText(/AI DRAFT/)).toBeInTheDocument();
});
it("failed and stale results never show passed", async () => {
  const { draft, context } = await resumeFixture();
  const validation = validateGeneratedApplication(
    draft,
    context,
    approvedReview(draft),
  );
  render(<ValidationPanel validation={validation} stale />);
  expect(screen.getByText(/NEEDS INPUT · Sources changed/)).toBeInTheDocument();
  expect(
    screen.queryByText("Validation passed · AI draft"),
  ).not.toBeInTheDocument();
});
it("labels unsupported claims without relying on color", async () => {
  const { draft, context } = await resumeFixture();
  draft.skills[0]!.text = "Kubernetes";
  render(
    <ValidationPanel
      validation={validateGeneratedApplication(
        draft,
        context,
        approvedReview(draft),
      )}
      stale={false}
    />,
  );
  expect(
    screen.getByText(/UNSUPPORTED · Validation blocked/),
  ).toBeInTheDocument();
});
it("requires consent and displays blocked generation feedback", async () => {
  const user = userEvent.setup();
  m.action.mockResolvedValue({ ok: true, id: "new", passed: false });
  render(<GenerateControl applicationId="app" configured ready hasVersions />);
  expect(
    screen.getByRole("button", { name: "Regenerate resume" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "Regenerate resume" }));
  expect(m.action).toHaveBeenCalledWith({
    applicationId: "app",
    consent: true,
  });
  expect(screen.getByRole("status")).toHaveTextContent("validation blockers");
  expect(m.replace).toHaveBeenCalledWith("/applications/app?version=new");
});
it("missing configuration disables paid action", () => {
  render(
    <GenerateControl
      applicationId="app"
      configured={false}
      ready
      hasVersions={false}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Generate resume" }),
  ).toBeDisabled();
});
it("tabs support keyboard movement and expose deferred answers", async () => {
  const user = userEvent.setup();
  render(
    <PackageTabs
      resume={<p>Preview content</p>}
      validation={<p>Validation findings</p>}
    />,
  );
  screen.getByRole("tab", { name: "Resume" }).focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Answers" })).toHaveFocus();
  expect(
    screen.getByText(/Answer preparation will be available/),
  ).toBeInTheDocument();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("Validation findings")).toBeInTheDocument();
});
