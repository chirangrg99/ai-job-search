// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  extractPosting,
  publicAddress,
  publicPostingUrl,
} from "./posting-reader";
it.each([
  "127.0.0.1",
  "10.0.0.1",
  "169.254.169.254",
  "192.168.0.1",
  "172.16.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "fc00::1",
  "0.0.0.0",
])("rejects nonpublic address %s", (ip) =>
  expect(publicAddress(ip)).toBe(false),
);
it("allows public addresses", () =>
  expect(publicAddress("1.1.1.1")).toBe(true));
it.each([
  "http://example.com",
  "https://user:pass@example.com",
  "https://localhost",
  "https://example.com:444",
  "https://example.com/?token=secret",
])("rejects unsafe URL %s", (url) =>
  expect(() => publicPostingUrl(url)).toThrow(),
);
it("extracts every structured posting field with decoded description", () => {
  const job = {
    "@type": "JobPosting",
    title: "Engineer",
    description:
      "<p>Develop accessible applications and maintain production services.</p>",
    hiringOrganization: { name: "Example" },
    qualifications: "Degree or equivalent experience",
    workHours: "9 to 5",
  };
  const result = extractPosting(
    `<script type="application/ld+json">${JSON.stringify(job)}</script>`,
  );
  expect(result).toContain("Degree or equivalent experience");
  expect(result).toContain("workHours");
  expect(result).not.toContain("<p>");
});
it("rejects multi-job pages", () =>
  expect(() =>
    extractPosting(
      '<script type="application/ld+json">[{"@type":"JobPosting"},{"@type":"JobPosting"}]</script>',
    ),
  ).toThrow());
it("keeps main text and excludes scripts/navigation", () => {
  const result = extractPosting(
    `<nav>Other jobs</nav><main><h1>Engineer</h1><p>${"Relevant work details. ".repeat(10)}</p><script>secret()</script></main>`,
  );
  expect(result).toContain("Relevant work details");
  expect(result).not.toContain("secret");
  expect(result).not.toContain("Other jobs");
});
it.each([
  "<html>Enable javascript to continue</html>",
  `<main>${"x".repeat(50001)}</main>`,
])("rejects unreadable or oversized content", (html) =>
  expect(() => extractPosting(html)).toThrow(),
);
