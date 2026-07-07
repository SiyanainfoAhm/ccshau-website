import { COLLEGES_CONTAINER_SLUG } from "@/lib/pages/resolve-public-path";

export type MicrositeKind = "academic" | "directorate";

export interface MicrositeRootRow {
  id: string;
  slug: string;
  title_en: string;
  parent_id: string | null;
  college_root_id: string | null;
  page_type: string;
}

export function isMicrositeRoot(page: Pick<MicrositeRootRow, "id" | "college_root_id" | "page_type">): boolean {
  return page.page_type === "college" && page.college_root_id === page.id;
}

export function inferMicrositeKind(
  page: Pick<MicrositeRootRow, "parent_id">,
  parentSlugById: Map<string, string>,
): MicrositeKind {
  if (!page.parent_id) return "directorate";
  const parentSlug = parentSlugById.get(page.parent_id);
  return parentSlug === COLLEGES_CONTAINER_SLUG ? "academic" : "directorate";
}

export const MICROSITE_KIND_LABELS: Record<MicrositeKind, { en: string; hi: string }> = {
  academic: { en: "Academic college", hi: "शैक्षणिक महाविद्यालय" },
  directorate: { en: "Directorate", hi: "निदेशालय" },
};
