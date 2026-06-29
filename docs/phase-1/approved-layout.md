# Approved UI/UX Layout — Option B (Agri Future)

**Deliverable:** D2 — Signed-off design for Phase 3+ development  
**Approved:** 23 June 2026  
**Status:** **Active** — baseline for public website build

## Selection

| Field | Value |
|-------|-------|
| **Layout** | Option B — Agri Future |
| **Variant key** | `future` (in shared components) |
| **Homepage** | `/design/option-b` |
| **Default route** | `/` redirects to approved homepage |

## Approved pages

| Page | Route |
|------|-------|
| Homepage | `/design/option-b` |
| News listing | `/design/option-b/news` |
| News detail (sample) | `/design/option-b/news/sample` |
| Tenders | `/design/option-b/tenders` |
| Contact & feedback | `/design/option-b/contact` |

## Design tokens (summary)

See [design-system.md](./design-system.md) — green/gold palette, Playfair + Noto fonts, glass panels, Ken Burns hero, bento quick links.

## Reference layouts (not selected)

| Option | Route | Use |
|--------|-------|-----|
| A — Heritage Premium | `/design/option-a` | Alternate colorful light layout |
| C — Clean Ministry | `/design/option-c` | GOI accessibility reference |

## Code reference

```ts
// apps/web/src/lib/design/selected-layout.ts
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
```

Phase 3 should promote routes from `/design/option-b/*` to production paths (`/`, `/news`, etc.) while keeping the same `future` component variant.
