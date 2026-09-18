import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  sync: vi.fn(),
  manual: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/app/(workspace)/jobs/actions", () => ({
  syncJobs: m.sync,
  addManualJob: m.manual,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
import { DiscoveryWorkspace } from "./workspace";
import { ManualJobEditor } from "./manual-editor";
import type { DiscoveryOverview } from "./model";
const data: DiscoveryOverview = {
  searches: [{ id: "52000000-0000-4000-8000-000000000001", name: "Search" }],
  sources: [],
  runs: [],
  items: [],
  total: 0,
};
beforeEach(() => vi.resetAllMocks());
it("shows setup-needed and retains manual entry when credentials are missing", () => {
  render(<DiscoveryWorkspace data={data} configured={false} />);
  expect(screen.getByRole("button", { name: "Sync jobs" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Add job" })).toBeEnabled();
  expect(screen.getByText(/Setup needed/)).toBeVisible();
});
it("passes user-selected page controls and shows provider failure without clearing results", async () => {
  m.sync.mockResolvedValue({ ok: false, error: "Try after cooldown" });
  const user = userEvent.setup();
  render(<DiscoveryWorkspace data={data} configured />);
  await user.clear(screen.getByLabelText("Page"));
  await user.type(screen.getByLabelText("Page"), "2");
  await user.click(screen.getByRole("button", { name: "Sync jobs" }));
  expect(m.sync).toHaveBeenCalledWith({
    preferenceId: data.searches[0]?.id,
    page: 2,
    pageSize: 20,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Try after cooldown",
  );
  expect(m.refresh).toHaveBeenCalledOnce();
});
it("validates manual required fields and keeps input after save failure", async () => {
  const user = userEvent.setup();
  m.manual.mockResolvedValue({ ok: false, error: "Retry import" });
  render(<ManualJobEditor onClose={vi.fn()} onSaved={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Add job" }));
  expect(m.manual).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Job title (required)"), "Known role");
  await user.type(
    screen.getByLabelText("Job description (required)"),
    "Known description",
  );
  await user.click(screen.getByRole("button", { name: "Add job" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry import");
  expect(screen.getByLabelText("Job title (required)")).toHaveValue(
    "Known role",
  );
  expect(m.manual).toHaveBeenCalledWith(
    expect.objectContaining({ descriptionComplete: false, salaryMin: null }),
  );
});
it("confirms discarding a manual draft", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  render(<ManualJobEditor onClose={close} onSaved={vi.fn()} />);
  await user.type(screen.getByLabelText("Job title (required)"), "Draft");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(close).toHaveBeenCalledOnce();
});
