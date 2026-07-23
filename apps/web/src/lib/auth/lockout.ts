import { Tables } from "@/lib/database/names";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const IP_MAX_FAILURES = 40;
const IP_WINDOW_MINUTES = 15;

export type LockoutStatus = "ok" | "locked" | "unavailable";

/**
 * Fail closed when the admin client is missing — login must not proceed
 * without lockout tracking in production-ready deployments.
 */
export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
  const admin = createAdminClient();
  if (!admin) return "unavailable";

  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from(Tables.loginAttempts)
    .select("success")
    .eq("email", email.toLowerCase())
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: false })
    .limit(MAX_ATTEMPTS);

  if (error) return "unavailable";
  if (!data || data.length < MAX_ATTEMPTS) return "ok";
  return data.every((row) => row.success === false) ? "locked" : "ok";
}

/** @deprecated Prefer checkAccountLockout for fail-closed behavior. */
export async function isAccountLocked(email: string): Promise<boolean> {
  return (await checkAccountLockout(email)) === "locked";
}

export async function checkIpLoginLockout(ipAddress?: string): Promise<LockoutStatus> {
  if (!ipAddress || ipAddress === "unknown") return "ok";

  const admin = createAdminClient();
  if (!admin) return "unavailable";

  const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from(Tables.loginAttempts)
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .eq("success", false)
    .gte("attempted_at", since);

  if (error) return "unavailable";
  if ((count ?? 0) >= IP_MAX_FAILURES) return "locked";
  return "ok";
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
): Promise<{ failures: number; unavailable: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { failures: 0, unavailable: true };

  await admin.from(Tables.loginAttempts).insert({
    email: email.toLowerCase(),
    success,
    ip_address: ipAddress ?? null,
  });

  if (success) return { failures: 0, unavailable: false };

  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  const { count } = await admin
    .from(Tables.loginAttempts)
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("success", false)
    .gte("attempted_at", since);

  return { failures: count ?? 0, unavailable: false };
}

export function getLockoutMessage(): string {
  return `Account temporarily locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`;
}

export function getIpLockoutMessage(): string {
  return `Too many failed login attempts from this network. Try again in ${IP_WINDOW_MINUTES} minutes.`;
}

export function getLockoutUnavailableMessage(): string {
  return "Login security checks are temporarily unavailable. Please try again later.";
}
