import { describe, expect, it } from "vitest";
import {
  getCurrentNavigation,
  isNavigationActive,
  navigationItems,
} from "./navigation";

describe("workspace navigation", () => {
  it("defines exactly the seven requested destinations, once each", () => {
    expect(navigationItems.map(({ href }) => href)).toEqual([
      "/",
      "/jobs",
      "/applications",
      "/profile",
      "/answers",
      "/preferences",
      "/settings",
    ]);
    expect(new Set(navigationItems.map(({ label }) => label)).size).toBe(7);
  });
  it.each([
    ["/", "/", true],
    ["/jobs", "/", false],
    ["/jobs/example", "/jobs", true],
    ["/jobs-archive", "/jobs", false],
    ["/profile/edit", "/profile", true],
    ["/applications", "/jobs", false],
  ])("matches %s against %s correctly", (path, href, expected) => {
    expect(isNavigationActive(path as string, href as string)).toBe(expected);
  });
  it("keeps job detail under Jobs and does not invent a destination for unknown paths", () => {
    expect(getCurrentNavigation("/jobs/example")?.label).toBe("Jobs");
    expect(getCurrentNavigation("/unknown")).toBeUndefined();
  });
});
