/** Shared Tailwind classes for public inner pages (listings, detail bodies). */

export const publicMainClass = "flex-1 bg-slate-50 dark:bg-[#0a1210]";

export const publicMainGradientClass =
  "flex-1 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/25 dark:to-[#0a1210]";

export const publicCardClass =
  "rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-emerald-900/50 dark:bg-emerald-950/30";

export const publicCardSoftClass =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30";

export const publicInputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50 dark:placeholder:text-emerald-200/50";

export const publicSearchInputClass = `${publicInputClass} pl-10 pr-4`;

export const publicMutedTextClass = "type-body text-slate-600 dark:text-emerald-100/80";

/** Color-only heading helper (prefer typePageTitleClass / typeSectionTitleClass for size). */
export const publicHeadingClass = "font-display text-slate-900 dark:text-emerald-50";

/** Homepage hero display title (larger than page H1). */
export const typeHeroDisplayClass = "type-hero-display";

/** Page-level H1 (CMS/college/listings). */
export const typePageTitleClass =
  "type-page-title text-slate-900 dark:text-emerald-50";

/** College/CMS page hero H1 on banner — size only; keep parent text-white. */
export const typeHeroTitleClass = "type-page-title";

/** Section H2. */
export const typeSectionTitleClass =
  "type-section-title text-slate-900 dark:text-emerald-50";

/** Uppercase eyebrow above a section title. */
export const typeKickerClass = "type-kicker";

/** Smaller H3-style title (cards, sidebars, widgets). */
export const typeSubsectionTitleClass =
  "type-subsection-title text-slate-900 dark:text-emerald-50";

/** Subsection title without forced text color (banners / colored parents). */
export const typeSubsectionTitleBareClass = "type-subsection-title";

/** Sidebar / panel heading inside college chrome. */
export const typeSidebarHeadingClass =
  "type-subsection-title text-emerald-900";

/** Intro / excerpt under a page title. */
export const typeExcerptClass = "type-body-lg text-slate-600 dark:text-emerald-100/80";

/** Large body copy without forced color. */
export const typeBodyLgClass = "type-body-lg";

/** Hero excerpt on dark banner. */
export const typeHeroExcerptClass = "type-body-lg text-emerald-100";

export const publicEmptyStateClass =
  "rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center text-slate-500 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200/70";

export const publicListItemClass =
  "block rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:border-emerald-700";

export const publicFilterChipActiveClass = "bg-[#0b3d2e] text-white dark:bg-emerald-600";

export const publicFilterChipInactiveClass =
  "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800";

export const publicSectionCardClass =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30";

export const publicSidebarClass =
  "rounded-xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30";

export const publicPaginationNavClass =
  "mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-emerald-900/50";

export const publicPaginationBtnClass =
  "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50";

export const publicPaginationDisabledClass =
  "inline-flex items-center gap-1 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-300 dark:border-emerald-900/30 dark:text-emerald-800";

/** Prose wrapper for CMS bodies — typography size comes from .cms-html tokens. */
export const publicProseClass =
  "prose prose-emerald max-w-none type-body text-slate-600 dark:prose-invert dark:text-emerald-100/90 prose-a:font-semibold prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-300 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1";
