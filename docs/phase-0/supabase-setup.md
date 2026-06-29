# Supabase Cloud — Project Setup

**Project reference:** `fvveqziyusjgqejowkfp`  
**API URL:** `https://fvveqziyusjgqejowkfp.supabase.co`  
**Region:** Confirm in Supabase dashboard (target: Mumbai / ap-south-1)  
**Status:** Connected — Phase 0 migrations applied

---

## Applied migrations

| Migration | Description |
|-----------|-------------|
| `ccshau_naming_convention` | `ccshau_schema_meta` table, `ccshau_set_updated_at()` function, RLS |

## Application tables (CCSHAU_ prefix)

| Table | Status |
|-------|--------|
| `ccshau_schema_meta` | ✅ Created |

Full CMS tables → Phase 2.

---

## Local development

1. Copy `apps/web/.env.example` → `apps/web/.env.local`
2. Set values from Supabase Dashboard → Project Settings → API
3. Run `npm run dev` from `apps/web`
4. Verify: http://localhost:3000/api/health → `"supabase": "connected"`

**Never commit `.env.local` or service role keys to git.**

---

## Vercel deployment

Add these environment variables in Vercel project settings:

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fvveqziyusjgqejowkfp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — **secret** |
| `NEXT_PUBLIC_SITE_URL` | Production URL |
| `SUPABASE_PROJECT_ID` | `fvveqziyusjgqejowkfp` |

---

## CLI commands

```bash
# Link local repo to remote (requires database password from dashboard)
npx supabase link --project-ref fvveqziyusjgqejowkfp

# Push migrations
npx supabase db push
```

---

## Security reminder

- Rotate **service role** key if it was shared in chat or email
- Use anon key only in browser; service role only on server (Vercel env)
- Enable RLS on all `ccshau_*` tables (Phase 2+)
