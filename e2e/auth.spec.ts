import { expect, test } from "@playwright/test";
for (const path of [
  "/",
  "/jobs",
  "/jobs/test",
  "/applications",
  "/profile",
  "/answers",
  "/preferences",
  "/settings",
]) {
  test(`protects ${path} without a session`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Your application assistant" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toHaveCount(0);
  });
}
test("invalid confirmation cannot redirect externally", async ({ page }) => {
  await page.goto("/auth/callback?next=https://example.com");
  await expect(page).toHaveURL(/\/login\?error=confirmation$/);
});
test("login reflows at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/login");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
