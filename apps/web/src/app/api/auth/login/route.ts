import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/auth/audit";
import { verifyCaptcha } from "@/lib/auth/captcha";
import { getLockoutMessage, isAccountLocked, recordLoginAttempt } from "@/lib/auth/lockout";
import { sendLockoutAlert } from "@/lib/power-automate/send";
import { loginSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
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
    return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
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
