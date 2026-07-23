/**
 * Simple in-memory sliding-window rate limiter for public forms / login.
 * Suitable for single-instance or sticky Vercel isolates; not a global edge store.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Prevent unbounded growth in long-lived processes. */
const MAX_KEYS = 10_000;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

export function clientIpFromHeaders(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown"
  );
}

/** Public feedback / contact form */
export const PUBLIC_FEEDBACK_RATE = { limit: 5, windowMs: 15 * 60 * 1000 } as const;

/** PG seminar registrations */
export const PUBLIC_SEMINAR_RATE = { limit: 3, windowMs: 15 * 60 * 1000 } as const;

/** Login attempts per IP (email lockout is separate) */
export const LOGIN_IP_RATE = { limit: 30, windowMs: 15 * 60 * 1000 } as const;
