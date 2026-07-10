import dns from "node:dns";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

dns.setDefaultResultOrder("ipv4first");

import { writeAuditLog } from "@/lib/auth/audit";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { getLockoutMessage, isAccountLocked, recordLoginAttempt } from "@/lib/auth/lockout";
import { sendLockoutAlert } from "@/lib/power-automate/send";
import { loginSchema } from "@/lib/validations/auth";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function clientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, captchaToken } = parsed.data;

  if (!(await verifyCaptcha(captchaToken))) {
    return NextResponse.json({ success: false, error: "CAPTCHA verification failed" }, { status: 400 });
  }

  if (await isAccountLocked(email)) {
    return NextResponse.json({ success: false, error: getLockoutMessage() }, { status: 423 });
  }

  const env = getPublicSupabaseEnv();
  if (!env) {
    return NextResponse.json({ success: false, error: "Auth is not configured." }, { status: 503 });
  }

  const authClient = createSupabaseClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    const failures = await recordLoginAttempt(email, false, ip);
    if (failures >= 5) {
      await writeAuditLog({
        userId: null,
        action: "lockout",
        entityType: "auth",
        details: { email },
        ipAddress: ip,
      });
      await sendLockoutAlert(email, ip);
      return NextResponse.json({ success: false, error: getLockoutMessage() }, { status: 423 });
    }
    const message =
      process.env.NODE_ENV === "development" && error?.message
        ? `${error.message}${error.cause instanceof Error ? ` (${error.cause.message})` : ""}`
        : "Invalid email or password";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) {
    const message =
      process.env.NODE_ENV === "development"
        ? sessionError.message
        : "Could not start your session. Please try again.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  await recordLoginAttempt(email, true, ip);
  await writeAuditLog({
    userId: data.user.id,
    action: "login",
    entityType: "auth",
    ipAddress: ip,
  });

  return NextResponse.json({ success: true });
}
