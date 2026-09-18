import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  change: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/app/(workspace)/preferences/actions", () => ({
  savePreference: mocks.save,
  changePreference: mocks.change,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
import { PreferencesWorkspace } from "./workspace";
import { SearchEditor } from "./editor";
import { emptyPreference, type SavedSearch } from "./schema";
const search: SavedSearch = {
  ...emptyPreference,
  id: "52000000-0000-4000-8000-000000000001",
  updated_at: "2026-09-17T12:00:00Z",
  name: "My strategy",
  target_titles: ["Developer", "Technician"],
  minimum_fit_score: 70,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.save.mockResolvedValue({ ok: true });
  mocks.change.mockResolvedValue({ ok: true });
});
it("renders independent summary cards and explicit enabled states", () => {
  render(
    <PreferencesWorkspace
      searches={[
        search,
        { ...search, id: "second", name: "Second strategy", enabled: false },
      ]}
    />,
  );
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByText("Enabled", { exact: true })).toBeVisible();
  expect(screen.getByText("Paused", { exact: true })).toBeVisible();
  expect(
    within(screen.getByRole("article", { name: "My strategy" })).getByText(
      "Developer; Technician",
    ),
  ).toBeVisible();
});
it("validates, submits multiple criteria, and preserves location punctuation", async () => {
  const user = userEvent.setup();
  const saved = vi.fn();
  render(<SearchEditor onClose={vi.fn()} onSaved={saved} />);
  await user.click(screen.getByRole("button", { name: "Save search" }));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Search name")).toHaveFocus();
  await user.type(screen.getByLabelText("Search name"), "Test strategy");
  await user.type(
    screen.getByLabelText("Target titles"),
    "Developer\nTechnician",
  );
  await user.type(
    screen.getByLabelText("Locations"),
    "Toronto, ON\nOttawa, ON",
  );
  await user.click(screen.getByLabelText("remote", { exact: true }));
  await user.click(screen.getByRole("button", { name: "Save search" }));
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      target_titles: ["Developer", "Technician"],
      target_locations: ["Toronto, ON", "Ottawa, ON"],
      remote_preferences: ["remote"],
    }),
    undefined,
  );
  expect(saved).toHaveBeenCalledOnce();
});
it("preserves edits after a rejected save", async () => {
  mocks.save.mockResolvedValue({ ok: false, error: "Retry later" });
  const user = userEvent.setup();
  const saved = vi.fn();
  render(<SearchEditor search={search} onClose={vi.fn()} onSaved={saved} />);
  await user.clear(screen.getByLabelText("Search name"));
  await user.type(screen.getByLabelText("Search name"), "Changed");
  await user.click(screen.getByRole("button", { name: "Save search" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry later");
  expect(screen.getByLabelText("Search name")).toHaveValue("Changed");
  expect(saved).not.toHaveBeenCalled();
});
it("requires confirmation before discarding dirty input", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  render(<SearchEditor onClose={close} onSaved={vi.fn()} />);
  await user.type(screen.getByLabelText("Search name"), "Draft");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(close).toHaveBeenCalledOnce();
});
it("duplicates and toggles only the selected search", async () => {
  const user = userEvent.setup();
  render(<PreferencesWorkspace searches={[search]} />);
  await user.click(
    screen.getByRole("button", { name: "Duplicate My strategy" }),
  );
  expect(mocks.change).toHaveBeenCalledWith({
    operation: "duplicate",
    target: { id: search.id, updated_at: search.updated_at },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Pause My strategy" }),
    ).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Pause My strategy" }));
  expect(mocks.change).toHaveBeenLastCalledWith({
    operation: "set_enabled",
    target: { id: search.id, updated_at: search.updated_at },
    enabled: false,
  });
});
it("confirms deletion and leaves prior state on failure", async () => {
  mocks.change.mockResolvedValue({ ok: false, error: "Retry deletion" });
  const user = userEvent.setup();
  render(<PreferencesWorkspace searches={[search]} />);
  await user.click(screen.getByRole("button", { name: "Delete My strategy" }));
  expect(mocks.change).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", { name: "Delete search" }),
  );
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Retry deletion",
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
});
