/**
 * HTTP smoke tests for API routes against a running dev/prod server.
 * Skips when the server is unreachable. Does not test lockout/captcha behavior.
 */
import { beforeAll, describe, expect, it } from "vitest";

const BASE = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/api/health`, {
      signal: AbortSignal.timeout(8000),
    });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
});

// Suite: live API HTTP smoke (skips if server down).
describe(
  "API HTTP smoke",
  { timeout: 20_000 },
  () => {
  // Health endpoint should respond ok.
  it("GET /api/health returns 200", async ({ skip }) => {
    if (!serverAvailable) skip();

    const res = await fetch(`${BASE}/api/health`, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  // Login rejects empty body without hitting success path.
  it("POST /api/auth/login returns 400 for invalid body", async ({ skip }) => {
    if (!serverAvailable) skip();

    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bad", password: "x" }),
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.status).toBe(400);
  });

  // Cron endpoints reject unauthenticated callers.
  it("GET /api/cron/process-tenders returns 401 without secret", async ({ skip }) => {
    if (!serverAvailable) skip();

    const res = await fetch(`${BASE}/api/cron/process-tenders`, {
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.status).toBe(401);
  });

  // Unknown download id should not expose files.
  it("GET /api/downloads/[id]/file returns 404 for unknown id", async ({ skip }) => {
    if (!serverAvailable) skip();

    const res = await fetch(
      `${BASE}/api/downloads/00000000-0000-4000-8000-000000000099/file`,
      { redirect: "manual", signal: AbortSignal.timeout(15_000) },
    );
    expect(res.status).toBe(404);
  });
});
