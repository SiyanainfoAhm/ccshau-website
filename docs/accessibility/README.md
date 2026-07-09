# Accessibility — CCSHAU Website

**Branch:** `feat/accessibility-phase-1`  
**Last updated:** 9 July 2026

This folder tracks GOI-aligned accessibility work for the public site and admin CMS.

## Implementation phases

| Phase | Focus | Status |
|-------|--------|--------|
| **1** | Persisted toolbar prefs, high-contrast CSS, skip link | Done |
| **2** | Dark-mode audit on public routes | Done |
| **3** | Descriptive alt text + CMS guidance | Done |
| **4** | Keyboard navigation, ARIA, focus management | Done |
| **5** | WCAG checklist, UAT sign-off documentation | Done |

## Code locations

| Area | Path |
|------|------|
| Preferences storage | `apps/web/src/lib/a11y/accessibility-storage.ts` |
| Image alt helpers | `apps/web/src/lib/a11y/image-alt.ts` |
| Focus trap + modal hook | `apps/web/src/lib/a11y/focus-trap.ts`, `use-modal-a11y.ts` |
| WCAG checklist data | `apps/web/src/lib/a11y/wcag-checklist.ts` |
| Toolbar | `apps/web/src/components/design/shared/accessibility-toolbar.tsx` |
| Public page dark classes | `apps/web/src/lib/design/public-page-classes.ts` |

## Manual UAT still required

- Screen reader walkthrough (NVDA / JAWS / VoiceOver) on homepage, news, tenders, college microsite, contact form
- Formal colour-contrast measurement (WebAIM Contrast Checker or Lighthouse) on hero overlays and footer
- Cross-browser keyboard test (Chrome, Firefox, Edge)
- CMS-authored HTML blocks — editors must use headings/lists correctly

## Related deliverables (RFP)

- **D7** — SEO, accessibility and performance closure  
- **G-03** — Responsive and accessibility compliance  
- **US-11** — Public visitor accessibility tools

See [wcag-checklist.md](./wcag-checklist.md) and [keyboard-shortcuts.md](./keyboard-shortcuts.md).
