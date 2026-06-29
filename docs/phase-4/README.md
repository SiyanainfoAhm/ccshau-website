# Phase 4 — Public Website Development

**Deliverable:** D5 — Responsive bilingual public website on staging  
**Status:** In progress (Sprint 4 done)  
**Started:** 23 June 2026

## Sprint 1 — Live CMS integration (done)

| Route | Data source |
|-------|-------------|
| `/` | Banners, news highlights, menus (header/footer/quick links) |
| `/news` | Published news & notices (filterable) |
| `/news/[slug]` | News detail + attachments |
| `/tenders` | Open/closed/archived tenders |
| `/tenders/[slug]` | Tender detail, documents, corrigenda |
| `/contact` | Feedback form → `ccshau_feedback` + ticket number |
| `/pages/[slug]` | Published CMS pages |

## Sprint 2 — Circulars, downloads, media centre (done)

### Admin CMS

| Route | Module |
|-------|--------|
| `/admin/circulars` | List, create, edit, publish circulars (PDF) |
| `/admin/downloads` | Categorized document repository |
| `/admin/media` | Photo/video albums with item upload |

### Public routes

| Route | Data source |
|-------|-------------|
| `/circulars` | Published circulars (searchable) |
| `/downloads` | Published downloads (category + search filters) |
| `/media` | Published media albums (type filter) |
| `/media/[slug]` | Album detail with images/videos |

Homepage media gallery section links to live albums when published.

## Sprint 3 — Global search, redirects, related links (done)

### Global search

| Route | Features |
|-------|----------|
| `/search` | PostgreSQL FTS across pages, news, tenders, circulars, downloads; media by title |
| Header search | Site header form → `/search?q=…` (desktop + mobile) |

### URL redirects

| Layer | Implementation |
|-------|----------------|
| Edge (static) | `next.config.ts` — starter `.aspx` paths |
| Middleware | `ccshau_url_redirects` lookup via Supabase (301/302) |
| Admin CMS | `/admin/redirects` — CRUD for legacy → new paths |

### Related links

| Route | Features |
|-------|----------|
| `/admin/related-links` | CRUD for government/institutional partner links |
| Homepage | `PartnersSection` uses live links when published; mock fallback |

## Sprint 4 — Language persistence, pagination, homepage CMS (done)

| Feature | Implementation |
|---------|----------------|
| **Bilingual persistence** | EN/HI choice saved to `localStorage` + cookie (`ccshau_lang`) |
| **List pagination** | 15 items/page on news, tenders, circulars, downloads, media, search |
| **Homepage CMS** | About section ← published page slug `about`; colleges grid ← child pages of `colleges`; quick links from menu CMS |

### Homepage CMS convention

Publish these in **Pages** admin to replace mock homepage content:

| Slug | Used for |
|------|----------|
| `about` | About section (title, excerpt/body, read-more link) |
| `colleges` | Parent page — published child pages appear in colleges grid |
| `event-portals` | Parent page — published child pages appear as `/portal/[slug]` microsites |

## Sprint 5 — Event calendar & portals (done)

| Route | Features |
|-------|----------|
| `/events` | Month calendar from media albums (`event_date`) + news (`category=events`); upcoming list |
| `/portal/[slug]` | Temporary event microsite — child page of published `event-portals` parent |

Create event portals in **Pages** admin: add a child page under `event-portals` (publish when ready).

## Architecture

- **Layout:** `app/(site)/` — Option B (Agri Future) with `SiteLayoutShell` + `PublicSiteProvider`
- **Data:** `lib/data/public.ts` — server-side reads via Supabase service role (filtered to published/active)
- **Fallback:** Mock content when DB empty or menus not configured
- **Design gallery:** `/design/option-b` retained for Phase 1 reference

## Public routes

```
app/(site)/
├── page.tsx              # Homepage
├── news/page.tsx
├── news/[slug]/page.tsx
├── tenders/page.tsx
├── tenders/[slug]/page.tsx
├── circulars/page.tsx
├── downloads/page.tsx
├── media/page.tsx
├── media/[slug]/page.tsx
├── search/page.tsx
├── events/page.tsx
├── portal/[slug]/page.tsx
├── contact/page.tsx
└── pages/[slug]/page.tsx
```

## Try it

```bash
cd apps/web && npm run dev
```

| Page | URL |
|------|-----|
| Home | http://localhost:3000/ |
| News | http://localhost:3000/news |
| Tenders | http://localhost:3000/tenders |
| Circulars | http://localhost:3000/circulars |
| Downloads | http://localhost:3000/downloads |
| Media | http://localhost:3000/media |
| Search | http://localhost:3000/search?q=admission |
| Contact | http://localhost:3000/contact |

Publish content in admin CMS to see live data. Empty sections fall back to design mock content.

## Next sprints (Phase 4)

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 3 | Global search, URL redirects, related links | ✅ Done |
| Sprint 4 | Bilingual persistence, pagination, homepage CMS | ✅ Done |
| Sprint 5 | Event calendar, event portals (if in scope) | ✅ Done |

See [Section 21](../../Documents/CCSHAU_Website_Development_Plan.md#21-phase-progress-tracker) in the master development plan.
