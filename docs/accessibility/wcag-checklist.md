# WCAG 2.1 AA Checklist — CCSHAU

**Version:** 1.0.0  
**Date:** 9 July 2026  
**Scope:** Public site (`apps/web` production routes) + admin CMS shell

> Machine-readable source: `apps/web/src/lib/a11y/wcag-checklist.ts`

## Summary

| Status | Count | Meaning |
|--------|-------|---------|
| Pass | 4 | Implemented and spot-checked |
| Partial | 7 | Foundation in place; formal audit or content discipline needed |
| Fail | 0 | — |
| Manual | 0 | Reserved for UAT-only checks |

**Estimated formal compliance:** ~65–75% (development complete; client UAT + contrast audit pending)

---

## Checklist

### Perceivable

| ID | Criterion | Title | Status | Notes |
|----|-----------|-------|--------|-------|
| 1.1.1 | WCAG 1.1.1 | Non-text content | **Partial** | Public images use `buildImageAlt` / `staffPhotoAlt`. Admin preview thumbnails may use decorative empty alt. |
| 1.3.1 | WCAG 1.3.1 | Info and relationships | **Partial** | Landmarks, dialog roles, listing tables. CMS HTML requires editor training. |
| 1.4.3 | WCAG 1.4.3 | Contrast (minimum) | **Partial** | High-contrast mode + dark theme. Full palette audit not yet signed off. |
| 1.4.4 | WCAG 1.4.4 | Resize text | **Pass** | Toolbar 90%–140% via `--font-scale`. |

### Operable

| ID | Criterion | Title | Status | Notes |
|----|-----------|-------|--------|-------|
| 2.1.1 | WCAG 2.1.1 | Keyboard | **Partial** | Skip links, modals, carousel arrows, mobile menu Escape. Desktop mega-menu is hover-primary. |
| 2.1.2 | WCAG 2.1.2 | No keyboard trap | **Pass** | Modals: Tab cycle + Escape exits. |
| 2.4.1 | WCAG 2.4.1 | Bypass blocks | **Pass** | `#main-content` (public) and `#admin-main-content` (admin). |
| 2.4.3 | WCAG 2.4.3 | Focus order | **Partial** | Templates follow DOM order; modals move focus into panel. |
| 2.4.7 | WCAG 2.4.7 | Focus visible | **Pass** | Global `:focus-visible` + high-contrast overrides. |

### Understandable

| ID | Criterion | Title | Status | Notes |
|----|-----------|-------|--------|-------|
| 3.1.2 | WCAG 3.1.2 | Language of parts | **Partial** | `font-hindi` on Hindi strings; `html` lang follows language toggle. |
| 3.2.2 | WCAG 3.2.2 | On input | **Pass** | No context change on focus alone. |

### Robust

| ID | Criterion | Title | Status | Notes |
|----|-----------|-------|--------|-------|
| 4.1.2 | WCAG 4.1.2 | Name, role, value | **Partial** | Toolbar, dialogs, carousel, pagination labelled. Ongoing widget audit. |

---

## UAT sign-off (pending)

| Check | Owner | Date | Sign-off |
|-------|-------|------|----------|
| Keyboard-only navigation — public site | QA / CCSHAU | | |
| Screen reader — homepage + contact form | QA / CCSHAU | | |
| Lighthouse accessibility ≥ 90 on key URLs | Dev | | |
| Hindi content readability + lang attributes | Content team | | |
| Admin CMS keyboard workflow | Computer Section | | |

---

## Recommended next steps (post Phase 5)

1. Run Lighthouse + axe on `/`, `/news`, `/tenders`, `/contact`, one college microsite.
2. Document contrast ratios for hero text overlays.
3. Add admin accessibility toolbar (optional) or ensure browser zoom suffices for CMS users.
4. Train content editors on alt text and heading structure in rich HTML.
