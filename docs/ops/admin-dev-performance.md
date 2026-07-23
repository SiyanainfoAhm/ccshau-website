# Admin / local performance (P2)

Admin soft-navigation can feel slow after long `next dev` sessions. Most of that is **dev tooling memory growth**, not production behavior.

## What P0–P2 already do in the app

| Tier | Change |
|------|--------|
| P0 | Request-level `React.cache` for session/modules; slim list/parent selects |
| P1 | Searchable parent picker; lazy office-portal panels on edit |
| P2 | Client `AdminShell` (stable sidebar/header); content-area `loading.tsx`; local scripts below |

## Local scripts (`apps/web`)

```bash
cd apps/web

# Normal day-to-day
npm run dev

# After hours of HMR / OOM / weird slowness — clear cache then start
npm run dev:clean

# Long sessions: larger Node heap (8 GB)
npm run dev:stable
# or: $env:NODE_OPTIONS="--max-old-space-size=8192"; npm run dev

# Judge real nav speed (production-like)
npm run perf:check
```

`perf:check` runs `next build` then `next start` with `.env.local`. Use this before blaming app code for “Rendering…” delays.

## When to clear `.next`

- Heap out-of-memory errors
- Stale/runtime errors after large refactors
- Soft nav much slower than after a fresh start

```bash
npm run clean
npm run dev
```

## What to expect

- **Sidebar / header** should stay put while only the main panel shows the loading skeleton.
- **Yellow “Rendering…”** on a nav item means that route’s RSC is still in flight — normal during slow pages.
- **`next dev` will always be slower than `next start`.** Compare with `npm run perf:check`.
