import { describe, expect, it } from "vitest";
import { entrySchema } from "./schema";
import { defaultValues } from "./fields";
import { parseProfileDate, displayProfileDate } from "./dates";
const experience = {
  ...defaultValues("experience"),
  kind: "experience",
  company: "Example",
  title: "Engineer",
};
describe("profile validation", () => {
  it("requires identifying fields", () => {
    expect(entrySchema.safeParse({ ...experience, title: " " }).success).toBe(
      false,
    );
  });
  it("normalizes multiple tags and accepts custom categories", () => {
    const result = entrySchema.parse({
      ...experience,
      categories: "Frontend, cloud, frontend, custom",
    });
    expect("categories" in result && result.categories).toEqual([
      "frontend",
      "cloud",
      "custom",
    ]);
  });
  it("rejects an end date for a current job", () => {
    expect(
      entrySchema.safeParse({
        ...experience,
        currently_employed: true,
        end_date: "2024",
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({ ...experience, currently_employed: true })
        .success,
    ).toBe(true);
  });
  it("rejects reverse ranges, but accepts overlapping partial dates", () => {
    expect(
      entrySchema.safeParse({
        ...experience,
        start_date: "2025",
        end_date: "2024",
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({
        ...experience,
        start_date: "2024-12",
        end_date: "2024",
      }).success,
    ).toBe(true);
  });
  it("does not accept client verification or owner IDs as editable content", () => {
    const result = entrySchema.parse({
      ...experience,
      verified: true,
      profile_id: "other",
      user_id: "other",
    });
    expect(result).not.toHaveProperty("verified");
    expect(result).not.toHaveProperty("profile_id");
    expect(result).not.toHaveProperty("user_id");
  });
  it("requires a valid experience link for bullets", () => {
    expect(
      entrySchema.safeParse({
        ...defaultValues("bullet"),
        kind: "bullet",
        original_text: "Test",
        experience_id: "bad",
      }).success,
    ).toBe(false);
  });
  it("rejects unsafe links and permits clearing a summary", () => {
    expect(
      entrySchema.safeParse({
        ...defaultValues("project"),
        kind: "project",
        name: "Project",
        url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      entrySchema.safeParse({ ...defaultValues("summary"), kind: "summary" })
        .success,
    ).toBe(true);
  });
  it.each(["personal", "education", "fact", "credential", "project"] as const)(
    "rejects empty required %s entry",
    (kind) => {
      expect(
        entrySchema.safeParse({ ...defaultValues(kind), kind }).success,
      ).toBe(false);
    },
  );
});
describe("date precision", () => {
  it.each([
    "2023-02-29",
    "2024-13",
    "2024-04-31",
    "24-01",
    "2024-01-00",
    "1800",
  ])("rejects %s", (value) => expect(() => parseProfileDate(value)).toThrow());
  it("preserves year/month/day and unknown", () => {
    expect(parseProfileDate("").date).toBeNull();
    expect(parseProfileDate("2024-02", true)).toEqual({
      date: "2024-02-29",
      precision: "month",
    });
    expect(displayProfileDate("2024-12-31", "year")).toBe("2024");
    expect(parseProfileDate("2024-02-29").date).toBe("2024-02-29");
  });
});
