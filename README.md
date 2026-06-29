# CCSHAU Official University Website

Re-platforming the [CCSHAU](https://hau.ac.in/) official university website.

| Layer | Technology |
|-------|------------|
| Frontend + API | Next.js 14+ (Vercel) |
| Database / Auth / Storage | Supabase Cloud |
| Email | Microsoft Power Automate |
| Analytics | On hold |
| **Approved UI** | **Option B — Agri Future** |

## Project structure

```
CCSHAU_Project/
├── apps/web/           # Next.js application
├── supabase/           # Database migrations, Edge Functions
├── docs/phase-0/       # Phase 0 governance & planning
├── docs/phase-1/       # UI/UX — Option B approved
├── Documents/          # RFP and development plan
└── scripts/            # Utility scripts
```

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (`npm install -g supabase`)
- Supabase Cloud project (Mumbai region)
- Vercel account (for deployment)

## Quick start

```bash
# Install dependencies
npm install

# Configure environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with Supabase keys from dashboard

# Run development server
npm run dev
```

**Approved homepage:** [http://localhost:3000](http://localhost:3000) → Option B  
**Design gallery:** [http://localhost:3000/design](http://localhost:3000/design)

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Supabase local (optional)

```bash
npm run supabase:start
npm run supabase:status
```

## Phase status

| Phase | Status |
|-------|--------|
| 0 — Project setup | **Done** |
| 1 — UI/UX design | **Done** — Option B approved |
| 2 — Architecture & DB | **Done** — see `docs/phase-2/` |
| 3 — Admin CMS | **In progress** — Sprint 1 done |
| 4+ — Public site & migration | Pending |

See `Documents/CCSHAU_Website_Development_Plan.md` for full roadmap.

## Documentation

- [Development Plan](Documents/CCSHAU_Website_Development_Plan.md)
- [Approved layout — Option B](docs/phase-1/approved-layout.md)
- [Phase 2 — Architecture & schema](docs/phase-2/README.md)
- [Phase 3 — Admin CMS](docs/phase-3/README.md)
- [Phase 1 overview](docs/phase-1/README.md)
- [Database Naming — CCSHAU_ prefix](docs/database-naming-convention.md)
- [Phase 0 — Project Charter](docs/phase-0/project-charter.md)

## License

Intellectual property rests with CCS HAU Hisar per RFP.
