import { Tables } from "@/lib/database/names";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function isAccountLocked(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from(Tables.loginAttempts)
    .select("success")
    .eq("email", email.toLowerCase())
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: false })
    .limit(MAX_ATTEMPTS);

  if (error || !data || data.length < MAX_ATTEMPTS) return false;
  return data.every((row) => row.success === false);
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;

  await admin.from(Tables.loginAttempts).insert({
    email: email.toLowerCase(),
    success,
    ip_address: ipAddress ?? null,
  });

  if (success) return 0;

  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  const { count } = await admin
    .from(Tables.loginAttempts)
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("success", false)
    .gte("attempted_at", since);

  return count ?? 0;
}

export function getLockoutMessage(): string {
  return `Account temporarily locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`;
}
