/**
 * HTTP smoke tests for public pages (homepage and college microsite).
 * Skips when the local/smoke server is down or unreachable.
 */

import { beforeAll, describe, expect, it } from "vitest";

const BASE = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const COLLEGE_SLUG =
  process.env.SMOKE_COLLEGE_SLUG ?? "college-of-agriculture-hisar";

let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    serverAvailable = res.status > 0 && res.status < 500;
  } catch {
    serverAvailable = false;
  }
});

// Suite: public page HTTP smoke (skips if server down).
describe(
  "public page HTTP smoke",
  { timeout: 35_000 },
  () => {
  // Homepage 200 with branding; skips if server unavailable.
  it("homepage returns 200 with site branding", async ({ skip }) => {
    if (!serverAvailable) {
      skip();
      return;
    }

    const res = await fetch(`${BASE}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toMatch(/CCSHAU|Haryana Agricultural|CCS HAU/i);
    expect(html.toLowerCase()).toContain("</html>");
  });

  // College microsite home 200; skips if server unavailable.
  it("college microsite home returns 200", async ({ skip }) => {
    if (!serverAvailable) {
      skip();
      return;
    }

    const res = await fetch(`${BASE}/college/${COLLEGE_SLUG}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html.toLowerCase()).toContain("</html>");
    expect(html).toMatch(/college|agriculture|CCSHAU|HAU/i);
  });
});
