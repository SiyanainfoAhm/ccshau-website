import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/auth/audit";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { passwordResetConfirmSchema } from "@/lib/validations/auth";
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = passwordResetConfirmSchema.safeParse(body);
  if (!parsed.success) {
    const first =
      parsed.error.flatten().fieldErrors.confirmPassword?.[0] ??
      parsed.error.flatten().fieldErrors.password?.[0] ??
      "Validation failed";
    return NextResponse.json({ success: false, error: first }, { status: 400 });
  }

  if (!(await verifyCaptcha(parsed.data.captchaToken))) {
    return NextResponse.json({ success: false, error: "CAPTCHA verification failed" }, { status: 400 });
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

  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Reset link is invalid or expired. Request a new password reset email.",
      },
      { status: 401 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
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
    details: { email: user.email, stage: "password_reset_confirm" },
    ipAddress: clientIp(request),
  });

  // End recovery session — user must sign in with the new password.
  await supabase.auth.signOut();

  const res = NextResponse.json({
    success: true,
    message: "Password updated. You can sign in with your new password.",
  });
  res.cookies.set("ccshau_recovery", "", { path: "/", maxAge: 0 });
  return res;
}
