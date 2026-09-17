import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
vi.mock("@/app/(workspace)/profile/actions", () => ({
  saveProfileEntry: vi.fn(),
  changeProfileEntry: vi.fn(),
}));
import { VerificationBadge } from "./verification-badge";
import { EntryEditor } from "./entry-editor";
import { profileHealth } from "./model";
it("displays verification with text rather than color alone", () => {
  const { rerender } = render(<VerificationBadge verified={false} />);
  expect(screen.getByText("Needs verification")).toBeVisible();
  rerender(<VerificationBadge verified />);
  expect(screen.getByText("Verified")).toBeVisible();
});
it("current employment clears and locks the end date", async () => {
  const user = userEvent.setup();
  render(<EntryEditor kind="experience" onClose={vi.fn()} onSaved={vi.fn()} />);
  const end = screen.getByLabelText("End date");
  await user.type(end, "2024-12");
  await user.click(screen.getByLabelText("I currently work here"));
  expect(end).toHaveValue("");
  expect(end).toHaveAttribute("readonly");
  await user.click(screen.getByLabelText("I currently work here"));
  expect(end).not.toHaveAttribute("readonly");
});
it("offers discard confirmation for dirty forms", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  render(<EntryEditor kind="summary" onClose={close} onSaved={vi.fn()} />);
  await user.type(screen.getByLabelText("Professional summary"), "Draft");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByText("Discard unsaved changes?")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(close).toHaveBeenCalledOnce();
});
it("reports an empty profile without fabricated totals", () => {
  expect(profileHealth([])).toEqual({
    completeness: 0,
    missing: ["personal", "summary", "experience", "education", "fact"],
    verified: 0,
    unverified: 0,
  });
});
