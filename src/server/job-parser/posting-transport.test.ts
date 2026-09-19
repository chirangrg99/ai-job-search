// @vitest-environment node
import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ lookup: vi.fn(), get: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("node:dns/promises", () => ({ lookup: m.lookup }));
vi.mock("node:https", () => ({ get: m.get }));
import { readPublicPosting } from "./posting-reader";
beforeEach(() => {
  vi.resetAllMocks();
  m.lookup.mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);
});
function reply(status: number, headers: Record<string, string>, body: string) {
  m.get.mockImplementationOnce(
    (
      _url: URL,
      options: {
        lookup: (
          _h: string,
          _o: object,
          cb: (e: unknown, ip: string, f: number) => void,
        ) => void;
      },
      cb: (r: unknown) => void,
    ) => {
      const req = Object.assign(new EventEmitter(), {
        destroy: () => {
          req.emit("error", new Error("test"));
          req.emit("close");
        },
      });
      options.lookup("example.com", {}, (_e, ip) => expect(ip).toBe("1.1.1.1"));
      queueMicrotask(() => {
        const res = Object.assign(new EventEmitter(), {
          statusCode: status,
          headers,
          resume: () => {},
        });
        cb(res);
        res.emit("data", Buffer.from(body));
        res.emit("end");
        req.emit("close");
      });
      return req;
    },
  );
}
it("pins the verified public address while reading HTML", async () => {
  reply(
    200,
    { "content-type": "text/html" },
    `<main>${"Job duties. ".repeat(15)}</main>`,
  );
  expect(await readPublicPosting("https://example.com/job")).toContain(
    "Job duties",
  );
  expect(m.get).toHaveBeenCalledOnce();
});
it("rejects private DNS before any HTTP call", async () => {
  m.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(readPublicPosting("https://example.com/job")).rejects.toThrow();
  expect(m.get).not.toHaveBeenCalled();
});
it("validates redirect DNS independently", async () => {
  reply(302, { location: "https://internal.example/job" }, "");
  m.lookup
    .mockResolvedValueOnce([{ address: "1.1.1.1", family: 4 }])
    .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
  await expect(readPublicPosting("https://example.com/job")).rejects.toThrow();
  expect(m.get).toHaveBeenCalledOnce();
});
it("rejects blocked pages without retries", async () => {
  reply(403, { "content-type": "text/html" }, "Blocked");
  await expect(readPublicPosting("https://example.com/job")).rejects.toThrow();
  expect(m.get).toHaveBeenCalledOnce();
});
