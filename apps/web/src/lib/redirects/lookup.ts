import type { SupabaseClient } from "@supabase/supabase-js";

import { Tables } from "@/lib/database/names";

export interface ActiveRedirect {
  newPath: string;
  redirectType: 301 | 302;
}

export async function findActiveRedirect(
  supabase: SupabaseClient,
  pathname: string,
): Promise<ActiveRedirect | null> {
  const { data } = await supabase
    .from(Tables.urlRedirects)
    .select("new_path, redirect_type")
    .eq("legacy_path", pathname)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  return {
    newPath: data.new_path as string,
    redirectType: data.redirect_type as 301 | 302,
  };
}
