vi.mock("@/app/login/actions", () => ({ signOut: vi.fn() }));
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { RouteShell } from "./route-shell";

const route = vi.hoisted(() => ({ pathname: "/jobs/example" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

describe("application shell", () => {
  it("renders landmarks, skip link and active parent navigation", () => {
    render(
      <AppShell>
        <RouteShell title="Job Detail" description="Review a role." />
      </AppShell>,
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
    expect(
      screen.getByRole("heading", { level: 1, name: "Job Detail" }),
    ).toBeVisible();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getAllByRole("link")).toHaveLength(7);
    expect(within(nav).getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Overview" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("Job Detail");
    expect(screen.queryByText("Example Studio")).not.toBeInTheDocument();
  });
  it("opens navigation, traps keyboard focus, dismisses with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <h1>Jobs</h1>
      </AppShell>,
    );
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", {
      name: "Application assistant",
    });
    expect(dialog).toBeVisible();
    expect(within(dialog).getAllByRole("link")).toHaveLength(7);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });
  it("closes the navigation after selecting a destination", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <h1>Jobs</h1>
      </AppShell>,
    );
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog");
    const jobsLink = within(dialog).getByRole("link", { name: "Jobs" });
    jobsLink.addEventListener("click", (event) => event.preventDefault());
    await user.click(jobsLink);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
