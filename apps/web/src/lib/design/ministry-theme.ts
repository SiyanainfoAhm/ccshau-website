/** GOI / accessibility-first palette for Option C — Clean Ministry */

/** Primary brand (nav, buttons, borders, stats) — navy */
export const MINISTRY_PRIMARY = "#0c3b6e";
export const MINISTRY_PRIMARY_DARK = "#082952";
/** Secondary accent — saffron (labels, notice chips) */
export const MINISTRY_SAFFRON = "#e8850c";

/** @deprecated Use MINISTRY_PRIMARY — kept for any residual imports */
export const MINISTRY_GREEN = MINISTRY_PRIMARY;
/** @deprecated Use MINISTRY_PRIMARY_DARK */
export const MINISTRY_GREEN_DARK = MINISTRY_PRIMARY_DARK;
/** @deprecated Use MINISTRY_PRIMARY */
export const MINISTRY_NAV = MINISTRY_PRIMARY;
/** @deprecated Use MINISTRY_PRIMARY_DARK */
export const MINISTRY_NAV_DARK = MINISTRY_PRIMARY_DARK;

export const MINISTRY_STAT_ACCENTS = [
  "border-l-[#e8850c]",
  "border-l-[#0c3b6e]",
  "border-l-slate-700",
  "border-l-[#082952]",
] as const;
