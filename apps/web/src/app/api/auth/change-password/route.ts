import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/auth/audit";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

function clientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const first =
      fields.confirmPassword?.[0] ??
      fields.newPassword?.[0] ??
      fields.currentPassword?.[0] ??
      "Validation failed";
    return NextResponse.json({ success: false, error: first }, { status: 400 });
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { success: false, error: "Auth service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({ success: false, error: "Sign in again to change your password." }, { status: 401 });
  }

  const env = getPublicSupabaseEnv();
  if (!env) {
    return NextResponse.json({ success: false, error: "Auth is not configured." }, { status: 503 });
  }

  const verifier = createSupabaseClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message || "Could not update password." },
      { status: 400 },
    );
  }

  await writeAuditLog({
    userId: user.id,
    action: "update",
    entityType: "auth",
    details: { email: user.email, stage: "change_password" },
    ipAddress: clientIp(request),
  });

  return NextResponse.json({ success: true, message: "Password updated." });
}
