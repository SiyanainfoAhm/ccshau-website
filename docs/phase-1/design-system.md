# Design System — CCSHAU Website

**Phase:** 1 | **Version:** 1.1 | **Approved layout:** Option B — Agri Future

> **Active baseline:** All Phase 3+ public UI should use the **`future`** variant in shared components.  
> See [approved-layout.md](./approved-layout.md).

## Brand colors

| Token | Hex | Use |
|-------|-----|-----|
| Green 900 | `#0b3d2e` | Header, footer, primary dark |
| Green 700 | `#146c43` | Buttons, links |
| Green 500 | `#22a06b` | Accents, icons |
| Gold 500 | `#d4a012` | Highlights, CTAs, accreditation |
| Gold 300 | `#f0c14b` | Gradients, hover |
| Cream | `#faf8f2` | Page background |

## Typography

| Role | Font | Use |
|------|------|-----|
| Display | Playfair Display | Headlines, university name |
| Body | Noto Sans | English body text |
| Hindi | Noto Sans Devanagari | Hindi content |

## Spacing & radius

- Section padding: `py-16` (64px)
- Container: `max-w-7xl` (1280px)
- Card radius: `rounded-2xl` / `rounded-3xl`
- Button radius: `rounded-2xl`

## Components

| Component | Location |
|-----------|----------|
| SiteHeader | `components/design/shared/site-header.tsx` |
| SiteFooter | `components/design/shared/site-footer.tsx` |
| HeroCarousel | `components/design/shared/hero-carousel.tsx` |
| AccessibilityToolbar | `components/design/shared/accessibility-toolbar.tsx` |
| LanguageProvider | `components/design/shared/language-context.tsx` |

## Accessibility

- Skip to content link
- Font zoom (CSS `--font-scale`)
- Dark mode toggle
- High contrast toggle
- Keyboard-focusable controls
- ARIA labels on toolbar

## CSS utilities

Defined in `apps/web/src/app/globals.css`:

- `.gradient-hero`, `.gradient-gold`, `.text-gradient-gold`
- `.glass-panel`, `.pattern-dots`
- `.animate-fade-up`, `.animate-marquee`
