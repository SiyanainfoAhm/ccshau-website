# Phase 0 — Supabase connection verification

Run from project root after configuring `apps/web/.env.local`:

```bash
cd apps/web
npm run dev
```

Then open: http://localhost:3000/api/health

Expected when connected:

```json
{
  "environment": {
    "supabase": "connected",
    "schemaVersion": "0.1.0",
    "supabaseProjectId": "fvveqziyusjgqejowkfp"
  }
}
```

Or use curl:

```bash
curl http://localhost:3000/api/health
```
