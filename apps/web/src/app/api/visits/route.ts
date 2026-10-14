import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "ccshau_visitor_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ total: null }, { status: 503 });
  }

  try {
    const userAgent = request.headers.get("user-agent") ?? "";
    if (/bot|crawler|spider|headless|slurp/i.test(userAgent)) {
      return NextResponse.json(
        { total: null },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(COOKIE_NAME)?.value ?? crypto.randomUUID();
    if (!/^[0-9a-f-]{36}$/i.test(visitorId)) {
      return NextResponse.json({ total: null }, { status: 400 });
    }
    const { data: result, error } = await admin.rpc("ccshau_record_visitor_visit", {
      p_visitor_id: visitorId,
      p_window: "30 minutes",
    });

    if (error) throw error;

    const response = NextResponse.json(
      { total: Number(result ?? 0) },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
    response.cookies.set(COOKIE_NAME, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Visitor counter failed:", error);
    return NextResponse.json(
      { total: null },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
