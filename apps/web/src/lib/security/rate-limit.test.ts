import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit and blocks when exceeded", () => {
    const key = `test-limit-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000)).toEqual({ ok: true });
    expect(checkRateLimit(key, 2, 60_000)).toEqual({ ok: true });

    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    }
  });

  it("starts a new window after reset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const key = `test-window-${Math.random()}`;
    expect(checkRateLimit(key, 1, 1000).ok).toBe(true);
    expect(checkRateLimit(key, 1, 1000).ok).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.001Z"));
    expect(checkRateLimit(key, 1, 1000).ok).toBe(true);
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers first x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "10.0.0.2",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.7" })),
    ).toBe("198.51.100.7");
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
