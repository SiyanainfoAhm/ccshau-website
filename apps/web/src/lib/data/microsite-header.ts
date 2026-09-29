import "server-only";

import { Tables } from "@/lib/database/names";
import {
  parseMicrositeHeader,
  publicHeaderFromSaved,
  type MicrositeHeaderInput,
} from "@/lib/pages/microsite-header";
import { getStoredFileUrl } from "@/lib/storage/urls";
import { createAdminClient } from "@/lib/supabase/admin";

function missingHeaderColumn(error: { message?: string } | null | undefined): boolean {
  return Boolean(error?.message && /microsite_header/i.test(error.message));
}

export async function loadMicrositeHeaderForAdmin(pageId: string): Promise<{
  header: MicrositeHeaderInput;
  columnReady: boolean;
  titleEn: string;
  titleHi: string;
} | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const first = await admin
    .from(Tables.pages)
    .select("id, title_en, title_hi, page_type, microsite_header")
    .eq("id", pageId)
    .maybeSingle();

  let row = first.data as {
    title_en: string;
    title_hi: string | null;
    page_type: string;
    microsite_header?: unknown;
  } | null;
  let columnReady = true;
  if (missingHeaderColumn(first.error)) {
    columnReady = false;
    const fallback = await admin
      .from(Tables.pages)
      .select("id, title_en, title_hi, page_type")
      .eq("id", pageId)
      .maybeSingle();
    row = fallback.data as typeof row;
  }
  if (!row || row.page_type !== "college") return null;

  const saved = parseMicrositeHeader(columnReady ? row.microsite_header : null);
  return {
    columnReady,
    titleEn: row.title_en,
    titleHi: row.title_hi ?? "",
    header: {
      ...saved,
      nameEn: saved.nameEn || row.title_en,
      nameHi: saved.nameHi || row.title_hi || "",
    },
  };
}

export async function loadPublicMicrositeHeader(slug: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const first = await admin
    .from(Tables.pages)
    .select("id, page_type, status, microsite_header")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const row = first.data as {
    page_type: string;
    microsite_header?: unknown;
  } | null;
  if (missingHeaderColumn(first.error)) return null;
  if (!row || row.page_type !== "college") return null;

  const saved = parseMicrositeHeader(row.microsite_header);
  const logoUrl = saved.logoPath ? getStoredFileUrl(saved.logoPath) : null;
  return publicHeaderFromSaved(saved, logoUrl);
}
