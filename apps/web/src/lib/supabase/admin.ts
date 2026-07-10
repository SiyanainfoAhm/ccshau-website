import dns from "node:dns";
import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv, getServiceRoleKey } from "./env";

dns.setDefaultResultOrder("ipv4first");

/** Server-only Supabase client with service role — never import in client components */
export function createAdminClient() {
  const env = getPublicSupabaseEnv();
  const serviceKey = getServiceRoleKey();

  if (!env || !serviceKey) {
    return null;
  }

  return createClient(env.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
