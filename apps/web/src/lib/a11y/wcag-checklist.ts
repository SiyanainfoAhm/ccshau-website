/**
 * WCAG 2.1 AA checklist for CCSHAU public site + admin CMS.
 * Used by docs/accessibility and for UAT sign-off tracking.
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

export const WCAG_CHECKLIST_VERSION = "1.0.0";
export const WCAG_CHECKLIST_DATE = "2026-07-09";

export const wcagChecklist: WcagCheckItem[] = [
  {
    id: "1.1.1",
    criterion: "WCAG 1.1.1",
    title: "Non-text content has text alternatives",
    status: "partial",
    notes: "Public hero, portraits, gallery use descriptive alt helpers. Admin previews may use decorative empty alt.",
    routes: ["/", "/media", "/college/*"],
  },
  {
    id: "1.3.1",
    criterion: "WCAG 1.3.1",
    title: "Info and relationships programmatically determinable",
    status: "partial",
    notes: "Landmarks (header, nav, main, footer), dialog roles, table headers on listings. Some CMS HTML blocks need author discipline.",
  },
  {
    id: "1.4.3",
    criterion: "WCAG 1.4.3",
    title: "Contrast (minimum)",
    status: "partial",
    notes: "High-contrast mode available. Light/dark themes audited on major public routes; formal contrast audit pending.",
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
    notes: "Skip link, modals (Escape + focus trap), carousel arrows, mobile menu Escape. Mega-menu hover-first; keyboard disclosure improved.",
  },
  {
    id: "2.1.2",
    criterion: "WCAG 2.1.2",
    title: "No keyboard trap",
    status: "pass",
    notes: "Modal focus trap allows Tab cycle and Escape to exit.",
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
    notes: "Global :focus-visible styles and high-contrast overrides.",
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
    notes: "Toolbar, dialogs, carousel, pagination nav labelled. Ongoing audit on dynamic widgets.",
  },
];

export function wcagSummary(checklist: WcagCheckItem[] = wcagChecklist) {
  const counts = { pass: 0, partial: 0, fail: 0, manual: 0 };
  for (const item of checklist) counts[item.status] += 1;
  return counts;
}
