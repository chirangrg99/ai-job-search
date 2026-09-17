import { expect, test } from "@playwright/test";

// Authenticated smoke tests use a dedicated, pre-created test account supplied at runtime.
// Never store an authenticated browser state file or credentials in this repository.
test.skip(
  !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
  "Requires a dedicated test account supplied through the environment.",
);
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.E2E_USER_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");
});

const routes = [
  ["/", "Overview"],
  ["/jobs", "Jobs"],
  ["/jobs/example", "Job Detail"],
  ["/applications", "Applications"],
  ["/profile", "Master Profile"],
  ["/answers", "Verified Answers"],
  ["/preferences", "Job Preferences"],
  ["/settings", "Settings"],
] as const;

for (const [route, title] of routes) {
  test(`${route} renders the shell`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: title, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test("mobile navigation supports keyboard dismissal, focus return and real routing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jobs/example");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await expect(
    page.getByRole("complementary", { name: "Workspace sidebar" }),
  ).toBeHidden();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Application assistant" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Jobs", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL("/settings");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();
});

test("resizing to desktop dismisses the mobile modal", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("complementary", { name: "Workspace sidebar" }),
  ).toBeVisible();
});

test("all routes reflow at 320px without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const [route] of routes) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("skip link moves keyboard focus into main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
