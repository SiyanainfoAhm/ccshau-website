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

export const publicMutedTextClass = "text-slate-600 dark:text-emerald-100/80";

export const publicHeadingClass = "font-display text-slate-900 dark:text-emerald-50";

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

export const publicProseClass =
  "prose prose-emerald max-w-none text-lg leading-relaxed text-slate-600 dark:prose-invert dark:text-emerald-100/90";
