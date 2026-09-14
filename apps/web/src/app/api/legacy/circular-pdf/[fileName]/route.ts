import { NextResponse } from "next/server";

import { Tables } from "@/lib/database/names";
import { getStoredFileUrl } from "@/lib/storage/urls";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SAFE_FILE = /^[A-Za-z0-9._-]{1,200}$/;

/** Resolve legacy HAU circular-pdf links to the Azure circulars blob. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> },
) {
  const { fileName: raw } = await context.params;
  const fileName = decodeURIComponent(raw).trim();
  if (!SAFE_FILE.test(fileName) || !fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data } = await admin
    .from(Tables.circulars)
    .select("file_path")
    .eq("status", "published")
    .eq("file_name", fileName)
    .not("file_path", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.file_path) {
    return NextResponse.json({ error: "Circular PDF not found in Azure" }, { status: 404 });
  }

  const url = getStoredFileUrl(data.file_path);
  if (!url || url.includes("hau.ac.in")) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
