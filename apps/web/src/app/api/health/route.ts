import { Tables } from "@/lib/database/names";
import { getPowerAutomateConfig } from "@/lib/power-automate/env";
import {
  getCaptchaCredentialsStatus,
  getEmailCredentialsStatus,
} from "@/lib/settings/security-features";
import { getSiteSettings } from "@/lib/settings/site-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMissingPublicEnvVars,
  getSiteUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export async function GET() {
  const missingEnv = getMissingPublicEnvVars();
  let supabaseStatus: "configured" | "missing" | "connected" | "error" =
    isSupabaseConfigured() ? "configured" : "missing";
  let schemaVersion: string | null = null;
  let supabaseError: string | null = null;

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from(Tables.schemaMeta)
        .select("schema_version, naming_prefix, pg_prefix")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        supabaseStatus = "error";
        supabaseError = error.message;
      } else if (data) {
        supabaseStatus = "connected";
        schemaVersion = data.schema_version;
      } else {
        supabaseStatus = "configured";
        supabaseError = "ccshau_schema_meta row not found — run migrations";
      }
    }
  }

  const powerAutomate = getPowerAutomateConfig();
  const siteSettings = await getSiteSettings();
  const captchaCreds = getCaptchaCredentialsStatus();
  const emailCreds = getEmailCredentialsStatus();

  return Response.json({
    status: "ok",
    phase: "0",
    project: "CCSHAU Official University Website",
    timestamp: new Date().toISOString(),
    environment: {
      siteUrl: getSiteUrl(),
      supabase: supabaseStatus,
      supabaseProjectId: process.env.SUPABASE_PROJECT_ID ?? "fvveqziyusjgqejowkfp",
      schemaVersion,
      supabaseError,
      missingEnvVars: missingEnv,
      powerAutomate: powerAutomate.isConfigured ? "configured" : "not_configured",
      captcha: {
        enabled: siteSettings.captcha_enabled,
        credentials: captchaCreds.isConfigured ? "configured" : "not_configured",
      },
      email: {
        enabled: siteSettings.email_enabled,
        credentials: emailCreds.isConfigured ? "configured" : "not_configured",
      },
      analytics: "on_hold",
    },
    stack: {
      frontend: "Next.js",
      database: "Supabase PostgreSQL",
      dbNamingPrefix: "CCSHAU_",
      hosting: "Vercel",
      email: "Microsoft Power Automate",
    },
  });
}
