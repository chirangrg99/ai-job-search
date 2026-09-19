import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({ parse: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/app/(workspace)/jobs/[jobId]/actions", () => ({
  parseSavedJob: mocks.parse,
}));
import { ParseControl } from "./parse-control";
import { ParsedRequirements } from "./requirements";
import { parsedJobSchema } from "./schema";
import { frontendParsedJob } from "../../../tests/fixtures/job-descriptions";
it("disables parsing until server credentials are configured", () => {
  render(
    <ParseControl
      jobId="id"
      configured={false}
      status={null}
      attempts={0}
      canParse
    />,
  );
  expect(
    screen.getByRole("button", { name: "Parse requirements" }),
  ).toBeDisabled();
  expect(screen.getByText(/Setup needed/)).toBeVisible();
});
it("displays cached state without another AI action", () => {
  render(
    <ParseControl
      jobId="id"
      configured={false}
      status="completed"
      attempts={1}
      canParse
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText("Saved extraction available.")).toBeVisible();
});
it("makes retries explicit", async () => {
  mocks.parse.mockResolvedValue({ ok: true, cached: false });
  render(
    <ParseControl
      jobId="id"
      configured
      status="failed"
      attempts={1}
      canParse
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Retry parsing" }));
  expect(mocks.parse).toHaveBeenCalledWith({ jobId: "id", retry: true });
  expect(await screen.findByText(/Requirements extracted/)).toBeVisible();
});
it("renders priority and auditable source evidence as an AI draft", () => {
  render(
    <ParsedRequirements data={parsedJobSchema.parse(frontendParsedJob())} />,
  );
  expect(screen.getByText(/AI_DRAFT/)).toBeVisible();
  expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Preferred").length).toBeGreaterThan(0);
  expect(screen.getAllByText("View source evidence").length).toBeGreaterThan(0);
});
