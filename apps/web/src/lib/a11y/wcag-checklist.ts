/**
 * WCAG 2.1 AA checklist for CCSHAU public site + admin CMS.
 * Used by docs/accessibility and for UAT sign-off tracking.
 * Visible page copy must not be changed for accessibility work —
 * prefer ARIA, focus, keyboard, and CSS.
 */

export type WcagStatus = "pass" | "partial" | "fail" | "manual";

export type WcagCheckItem = {
  id: string;
  criterion: string;
  title: string;
  status: WcagStatus;
  notes: string;
  routes?: string[];
};

export const WCAG_CHECKLIST_VERSION = "1.1.0";
export const WCAG_CHECKLIST_DATE = "2026-08-20";

export const wcagChecklist: WcagCheckItem[] = [
  {
    id: "1.1.1",
    criterion: "WCAG 1.1.1",
    title: "Non-text content has text alternatives",
    status: "partial",
    notes:
      "Public hero, portraits, gallery use descriptive alt helpers. CMS imgs get alt=\"\" when missing. Decorative icons use aria-hidden.",
    routes: ["/", "/media", "/college/*"],
  },
  {
    id: "1.3.1",
    criterion: "WCAG 1.3.1",
    title: "Info and relationships programmatically determinable",
    status: "partial",
    notes:
      "Landmarks (header, nav, main, footer), dialog roles, table headers on listings, news ticker regions. CMS HTML still needs author discipline.",
  },
  {
    id: "1.4.3",
    criterion: "WCAG 1.4.3",
    title: "Contrast (minimum)",
    status: "partial",
    notes:
      "High-contrast mode available via toolbar. Formal contrast audit of every template still pending.",
  },
  {
    id: "1.4.4",
    criterion: "WCAG 1.4.4",
    title: "Resize text up to 200%",
    status: "pass",
    notes: "Toolbar font scale 90%–140% via --font-scale on html.",
  },
  {
    id: "2.1.1",
    criterion: "WCAG 2.1.1",
    title: "Keyboard accessible",
    status: "partial",
    notes:
      "Skip link, Escape closes menus/modals, focus opens dropdowns, carousel arrows, focus trap. Mega-menu keyboard paths improved; full audit ongoing.",
  },
  {
    id: "2.1.2",
    criterion: "WCAG 2.1.2",
    title: "No keyboard trap",
    status: "pass",
    notes: "Modal focus trap allows Tab cycle and Escape to exit.",
  },
  {
    id: "2.2.2",
    criterion: "WCAG 2.2.2",
    title: "Pause, stop, hide moving content",
    status: "pass",
    notes:
      "News ticker pauses on hover and keyboard focus-within. prefers-reduced-motion disables marquee animation.",
  },
  {
    id: "2.4.1",
    criterion: "WCAG 2.4.1",
    title: "Bypass blocks",
    status: "pass",
    notes: "Skip to content on public header and admin shell.",
    routes: ["/", "/admin"],
  },
  {
    id: "2.4.3",
    criterion: "WCAG 2.4.3",
    title: "Focus order",
    status: "partial",
    notes: "Logical DOM order on templates. Modals move focus into panel on open.",
  },
  {
    id: "2.4.7",
    criterion: "WCAG 2.4.7",
    title: "Focus visible",
    status: "pass",
    notes:
      "Global :focus-visible on links, buttons, form controls, summary, and ARIA widgets; high-contrast overrides.",
  },
  {
    id: "3.1.1",
    criterion: "WCAG 3.1.1",
    title: "Language of page",
    status: "pass",
    notes: "html lang updates with EN/HI preference; LanguageProvider wraps content with lang.",
  },
  {
    id: "3.1.2",
    criterion: "WCAG 3.1.2",
    title: "Language of parts",
    status: "partial",
    notes: "Hindi content uses font-hindi; html lang toggles with language preference.",
  },
  {
    id: "3.2.2",
    criterion: "WCAG 3.2.2",
    title: "On input",
    status: "pass",
    notes: "No unexpected context change on focus alone.",
  },
  {
    id: "4.1.2",
    criterion: "WCAG 4.1.2",
    title: "Name, role, value",
    status: "partial",
    notes:
      "Toolbar, dialogs, carousel, pagination, social rail, sidebar tabs (aria-pressed), iframe titles. Ongoing audit on dynamic widgets.",
  },
];

export function wcagSummary(checklist: WcagCheckItem[] = wcagChecklist) {
  const counts = { pass: 0, partial: 0, fail: 0, manual: 0 };
  for (const item of checklist) counts[item.status] += 1;
  return counts;
}
