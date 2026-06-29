import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "./env";

export function createClient() {
  const env = getPublicSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return createBrowserClient(env.url, env.anonKey);
}
