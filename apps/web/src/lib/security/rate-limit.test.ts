/**
 * Tests for `@/lib/security/rate-limit`.
 * Covers in-memory rate limiting windows and client IP extraction from headers.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";

// Suite: checkRateLimit.
describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Allows up to limit then blocks with retryAfterSec.
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

  // After the window expires, requests are allowed again.
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

// Suite: clientIpFromHeaders.
describe("clientIpFromHeaders", () => {
  // First x-forwarded-for hop wins over x-real-ip.
  it("prefers first x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "10.0.0.2",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  // Falls back to x-real-ip, then "unknown".
  it("falls back to x-real-ip then unknown", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.7" })),
    ).toBe("198.51.100.7");
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
