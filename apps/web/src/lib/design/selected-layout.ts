/**
 * Approved UI/UX layout for Phase 3+ public site development.
 * Phase 1 deliverable D2 — Agri Future (Option B).
 */
export const SELECTED_LAYOUT = {
  id: "b" as const,
  name: "Agri Future",
  nameHi: "कृषि भविष्य",
  variant: "future" as const,
  homePath: "/",
  galleryPath: "/design",
  approvedDate: "2026-06-23",
  routes: {
    news: "/news",
    newsSample: "/news",
    tenders: "/tenders",
    circulars: "/circulars",
    downloads: "/downloads",
    media: "/media",
    search: "/search",
    contact: "/contact",
    pages: "/pages",
  },
} as const;

export type SelectedLayoutVariant = typeof SELECTED_LAYOUT.variant;
