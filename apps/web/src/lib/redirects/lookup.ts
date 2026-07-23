import type { SupabaseClient } from "@supabase/supabase-js";

import { Tables } from "@/lib/database/names";

export interface ActiveRedirect {
  newPath: string;
  redirectType: 301 | 302;
}

const REDIRECT_CACHE_TTL_MS = 60_000;

let redirectCache: {
  expiresAt: number;
  byPath: Map<string, ActiveRedirect>;
} | null = null;

async function loadActiveRedirectMap(
  supabase: SupabaseClient,
): Promise<Map<string, ActiveRedirect>> {
  const now = Date.now();
  if (redirectCache && now < redirectCache.expiresAt) {
    return redirectCache.byPath;
  }

  const { data } = await supabase
    .from(Tables.urlRedirects)
    .select("legacy_path, new_path, redirect_type")
    .eq("is_active", true);

  const byPath = new Map<string, ActiveRedirect>();
  for (const row of data ?? []) {
    byPath.set(row.legacy_path as string, {
      newPath: row.new_path as string,
      redirectType: row.redirect_type as 301 | 302,
    });
  }

  redirectCache = { expiresAt: now + REDIRECT_CACHE_TTL_MS, byPath };
  return byPath;
}

export async function findActiveRedirect(
  supabase: SupabaseClient,
  pathname: string,
): Promise<ActiveRedirect | null> {
  const map = await loadActiveRedirectMap(supabase);
  return map.get(pathname) ?? null;
}

/** Clear in-memory redirect cache (e.g. after CMS redirect edits in same process). */
export function clearActiveRedirectCache(): void {
  redirectCache = null;
}
