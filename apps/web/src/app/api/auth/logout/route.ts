import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/auth/audit";
import { createClient } from "@/lib/supabase/server";

function clientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await writeAuditLog({
      userId: user.id,
      action: "logout",
      entityType: "auth",
      ipAddress: clientIp(request),
    });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
