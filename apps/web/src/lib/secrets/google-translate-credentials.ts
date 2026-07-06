import { createAdminClient } from "@/lib/supabase/admin";

const VAULT_SECRET_NAME = "GOOGLE_TRANSLATE_CREDENTIALS";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedApiKey: string | null | undefined;
let cacheExpiresAt = 0;

function parseGoogleTranslateApiKey(credentials: string): string | null {
  const trimmed = credentials.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { api_key?: string; API_KEY?: string };
      return parsed.api_key?.trim() || parsed.API_KEY?.trim() || null;
    } catch {
      return null;
    }
  }

  return trimmed;
}

function readEnvCredentials(): string | null {
  const value = process.env.GOOGLE_TRANSLATE_CREDENTIALS ?? process.env.GOOGLE_TRANSLATE_API_KEY;
  return value?.trim() || null;
}

async function readVaultCredentials(): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.rpc("ccshau_get_vault_secret", {
    p_name: VAULT_SECRET_NAME,
  });

  if (error || data == null) return null;
  return String(data).trim() || null;
}

export async function getGoogleTranslateApiKey(): Promise<string | null> {
  if (cachedApiKey !== undefined && Date.now() < cacheExpiresAt) {
    return cachedApiKey;
  }

  const vaultValue = await readVaultCredentials();
  const envValue = readEnvCredentials();
  const raw = vaultValue ?? envValue;
  const apiKey = raw ? parseGoogleTranslateApiKey(raw) : null;

  cachedApiKey = apiKey;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return apiKey;
}
