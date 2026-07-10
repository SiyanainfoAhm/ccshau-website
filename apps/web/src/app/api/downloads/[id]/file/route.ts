import { NextResponse } from "next/server";

import { Functions, Tables } from "@/lib/database/names";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data } = await admin
    .from(Tables.downloads)
    .select("id, file_path, status, is_public, expires_at")
    .eq("id", id)
    .eq("status", "published")
    .eq("is_public", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  if (!data?.file_path || data.file_path === "pending") {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }

  await admin.rpc(Functions.incrementDownloadCount, { p_download_id: id });

  const url = getStoredFileUrl(data.file_path);
  if (!url) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(url);
}
