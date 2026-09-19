import "server-only";
import { lookup } from "node:dns/promises";
import { get } from "node:https";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
export const postingReadError =
  "Could not read this public posting. Paste its complete job text instead. Login-only, blocked, oversized and JavaScript-only pages cannot be imported.";
export function publicPostingUrl(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    u.hash ||
    /(?:^|\.)(?:localhost|local|internal)$/i.test(u.hostname)
  )
    throw new Error(postingReadError);
  for (const key of u.searchParams.keys())
    if (/key|token|secret|password|auth|signature/i.test(key))
      throw new Error(postingReadError);
  return u;
}
export function publicAddress(value: string) {
  try {
    return ipaddr.process(value).range() === "unicast";
  } catch {
    return false;
  }
}
export function extractPosting(html: string) {
  const $ = load(html);
  const postings: Record<string, unknown>[] = [];
  const visit = (v: unknown, depth = 0) => {
    if (depth > 12 || !v || typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const item of v) visit(item, depth + 1);
      return;
    }
    const obj = v as Record<string, unknown>;
    if (
      obj["@type"] === "JobPosting" ||
      (Array.isArray(obj["@type"]) && obj["@type"].includes("JobPosting"))
    )
      postings.push(obj);
    if (obj["@graph"]) visit(obj["@graph"], depth + 1);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      /* Invalid markup is not source evidence. */
    }
  });
  if (postings.length > 1) throw new Error(postingReadError);
  let text: string;
  if (postings.length === 1) {
    // Keep all published JobPosting fields; decode description markup without executing it.
    const obj = { ...postings[0] };
    if (typeof obj.description === "string")
      obj.description = load(obj.description).text();
    text = JSON.stringify(obj, null, 2);
  } else {
    $(
      'script,style,noscript,nav,footer,header,form,iframe,[hidden],[aria-hidden="true"]',
    ).remove();
    $("br,p,li,h1,h2,h3,h4,section,div").append("\n");
    const main = $('main,[role="main"],article').first();
    if (!main.length) throw new Error(postingReadError);
    text = main
      .text()
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  }
  if (
    text.length < 100 ||
    text.length > 50000 ||
    /verify you are human|access denied|enable javascript to continue/i.test(
      text,
    )
  )
    throw new Error(postingReadError);
  return text;
}
export async function readPublicPosting(value: string) {
  let url = publicPostingUrl(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new Error(postingReadError);
    const chosen = addresses[0]!;
    const response = await new Promise<{ location?: string; body: string }>(
      (resolve, reject) => {
        const req = get(
          url,
          {
            agent: false,
            family: chosen.family,
            headers: {
              Accept: "text/html",
              "Accept-Encoding": "identity",
              "User-Agent": "JobApplicationAssistant/1.0",
            },
            lookup: (_h, _opts, cb) => cb(null, chosen.address, chosen.family),
          },
          (res) => {
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode)
            ) {
              res.resume();
              resolve({ location: res.headers.location, body: "" });
              return;
            }
            if (
              res.statusCode !== 200 ||
              !res.headers["content-type"]?.includes("text/html")
            ) {
              res.resume();
              reject(new Error(postingReadError));
              return;
            }
            const chunks: Buffer[] = [];
            let size = 0;
            res.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > 2_000_000) {
                req.destroy(new Error(postingReadError));
                return;
              }
              chunks.push(chunk);
            });
            res.on("end", () =>
              resolve({ body: Buffer.concat(chunks).toString("utf8") }),
            );
            res.on("error", () => reject(new Error(postingReadError)));
          },
        );
        const timer = setTimeout(
          () => req.destroy(new Error(postingReadError)),
          10000,
        );
        req.on("close", () => clearTimeout(timer));
        req.on("error", () => reject(new Error(postingReadError)));
      },
    );
    if (response.location) {
      url = publicPostingUrl(new URL(response.location, url).href);
      continue;
    }
    return extractPosting(response.body);
  }
  throw new Error(postingReadError);
}
