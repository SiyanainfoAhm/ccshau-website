# CCSHAU Website — CI/CD Step-by-Step Guide

**Repository:** https://github.com/SiyanainfoAhm/ccshau-website  
**Production branch:** `main`  
**Stack:** Next.js · Supabase · Vercel · GitHub Actions  

Generated for the CCSHAU monorepo (`apps/web`).

---

## Overview

| Step | Where | What happens |
|------|--------|--------------|
| CI | GitHub Actions (`.github/workflows/ci.yml`) | lint → test → build |
| CD | Vercel | preview on PR, production on `main` |
| DB | Supabase | migrations are **manual** (not auto in CI yet) |

---

## Part A — One-time setup

### 1. GitHub repository access

- You need **push** access to `SiyanainfoAhm/ccshau-website`.
- Enable Actions: GitHub → **Settings → Actions → General** → allow workflows.

### 2. Connect Vercel to GitHub

In [vercel.com](https://vercel.com):

1. **Add New Project** → import `ccshau-website`
2. **Root Directory:** `apps/web` (monorepo — required)
3. **Framework:** Next.js (auto-detected)
4. **Production branch:** `main`
5. Enable **Preview Deployments** for pull requests

Vercel config file: `apps/web/vercel.json`  
- Install from monorepo root  
- Deploy region: `bom1` (Mumbai)

### 3. Vercel environment variables

Vercel → **Project → Settings → Environment Variables**

**Required (Production + Preview):**

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | e.g. `https://fvveqziyusjgqejowkfp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — secret |
| `NEXT_PUBLIC_SITE_URL` | Production URL; preview can use Vercel URL |
| `NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT` | Blob storage account |
| `NEXT_PUBLIC_AZURE_STORAGE_CONTAINER` | Container name |
| `AZURE_STORAGE_CONNECTION_STRING` | Server uploads — secret |
| `CRON_SECRET` | Production cron routes |

**Optional (when features enabled):**

- `POWER_AUTOMATE_EMAIL_URL`, `POWER_AUTOMATE_WEBHOOK_SECRET`
- `CAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`

Reference: `apps/web/.env.example`, `docs/phase-0/supabase-setup.md`

### 4. GitHub secrets (optional — backup workflow)

For `.github/workflows/daily-backup.yml` only:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Skip if you only need app CI/CD.

---

## Part B — End-to-end release flow

### Step 1 — Local pre-check

From repository root:

```bash
cd C:\Jatin\Projects\CCSHAU_Project
npm ci
npm run lint
npm test
npm run build
```

All four must pass before pushing. This mirrors GitHub Actions CI.

**Optional** (dev server must be running):

```bash
npm run dev
# new terminal:
npm run test:smoke
```

### Step 2 — Create a feature branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name

# Stage and commit your changes
git add <files>
git commit -m "Describe your change"
git push -u origin feat/your-feature-name
```

Do not commit debug scripts, `.next` build output, or local probe artifacts unless intended.

### Step 3 — Open a Pull Request

1. Go to GitHub → `ccshau-website`
2. Click **Compare & pull request**
3. Base: `main` ← Compare: your feature branch
4. Add title and description
5. Create PR

This triggers **CI (GitHub Actions)** and **CD preview (Vercel)** in parallel.

### Step 4 — Watch CI (GitHub Actions)

GitHub → **Pull requests → your PR → Checks**

Job: **CI / lint-and-build**

```
✓ Install dependencies (npm ci)
✓ Lint
✓ Unit tests (227 Vitest cases)
✓ Build
```

If CI fails: read the log, fix locally, commit, push — CI re-runs automatically.

Actions URL: https://github.com/SiyanainfoAhm/ccshau-website/actions

### Step 5 — Watch CD preview (Vercel)

On the PR, the Vercel bot posts a **Preview URL**, e.g.:

```
https://ccshau-website-xxxxx.vercel.app
```

Or check Vercel dashboard → **Deployments**.

**Verify on preview:**

- Homepage loads
- `/admin/login` loads
- A college microsite page loads
- Images/uploads work (Azure env must be set for Preview)

### Step 6 — Review and merge

When CI and preview look good:

1. Code review (self or teammate)
2. **Merge pull request** → confirm merge
3. Optionally delete the feature branch

### Step 7 — Production deploy (automatic)

Merge to `main` triggers:

| System | Action |
|--------|--------|
| GitHub Actions | CI runs again on `main` |
| Vercel | Production deploy starts |

Check Vercel → **Deployments** → status **Ready**.

Smoke-test production:

- Homepage
- `/admin/login`
- One admin/CMS action (if you have access)

### Step 8 — Database migrations (if applicable)

If the release includes Supabase migrations under `supabase/migrations/`:

```bash
npx supabase link --project-ref fvveqziyusjgqejowkfp
npx supabase db push
```

Run **after merge** — not automated in CI today.

---

## Part C — Post-deploy verification

| Check | How |
|-------|-----|
| CI green on `main` | GitHub Actions tab |
| Vercel production Ready | Vercel dashboard |
| Site live | Open production domain |
| Health API | `GET /api/health` → `{ "status": "ok" }` |
| Admin login | Visit `/admin/login` |
| Images/uploads | Upload in admin; view on public page |

---

## Part D — Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| CI fails on `npm test` | Failing unit test | Run `npm test` locally; fix; push |
| CI fails on `build` | TypeScript or build error | Run `npm run build` locally |
| Vercel build fails | Wrong root directory | Set root to `apps/web` |
| Preview OK, production broken | Missing Production env vars | Add vars for **Production** in Vercel |
| Blank images on preview | Azure vars missing in Preview | Add Azure env to Preview scope |
| No Vercel link on PR | Vercel not linked to repo | Re-import / reconnect project |

---

## Part E — CI workflow reference

File: `.github/workflows/ci.yml`

**Triggers:** push and pull_request to `main` or `develop`

**Steps:**

1. Checkout code
2. Setup Node.js 20 (npm cache)
3. `npm ci`
4. `npm run lint`
5. `npm test`
6. `npm run build` (placeholder Supabase env vars in CI)

---

## Part F — Recommended first E2E run

1. Confirm Vercel project exists with root `apps/web`
2. Set Production + Preview environment variables
3. Run locally: `npm ci && npm run lint && npm test && npm run build`
4. Push a small feature branch
5. Open PR → wait for green CI + Vercel preview
6. Test preview URL
7. Merge to `main`
8. Confirm production deployment

---

## Related files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Main CI pipeline |
| `.github/workflows/daily-backup.yml` | Daily Supabase backup (ops) |
| `apps/web/vercel.json` | Vercel build config |
| `Documents/ci-cd-pipeline.mmd` | Visual flowchart source |
| `Documents/ci-cd-pipeline.png` | Visual flowchart image |
| `scripts/render-ci-cd-pdf.mjs` | Regenerate flowchart PDF |

---

*CCSHAU Website Development — CI/CD Guide*
