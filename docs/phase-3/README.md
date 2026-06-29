# Phase 3 — Admin Dashboard & CMS

**Deliverable:** D4 — CMS functional for all modules  
**Status:** ~90% complete — core modules done  
**Started:** 23 June 2026

## Sprint 1 — Done

| Module | Routes |
|--------|--------|
| Auth + middleware | `/admin/login`, `/api/auth/*` |
| RBAC, lockout, audit | `lib/auth/*` |
| Admin shell + dashboard | `/admin` |
| **Pages CMS** | `/admin/pages`, `/admin/pages/new`, `/admin/pages/[id]` |

## Sprint 2 — Done

| Module | Routes |
|--------|--------|
| **News & notices CMS** | `/admin/news`, `/admin/news/new`, `/admin/news/[id]` |
| **File upload (Storage)** | `lib/storage/*`, buckets `ccshau-public`, `ccshau-private` |

## Sprint 3 — Done

| Module | Routes |
|--------|--------|
| **Tenders CMS** | `/admin/tenders`, `/admin/tenders/new`, `/admin/tenders/[id]` |
| **Corrigenda** | Add/delete on tender edit page with PDF upload |

## Sprint 4 — Done

| Module | Routes |
|--------|--------|
| **Feedback inbox** | `/admin/feedback`, `/admin/feedback/[id]` |
| **Menu manager** | `/admin/menus`, `/admin/menus/[location]` |
| **Banners CMS** | `/admin/banners`, `/admin/banners/new`, `/admin/banners/[id]` |
| **Audit log viewer** | `/admin/audit` (super admin only) |

## Sprint 5 — Done (delivered with Phase 4 Sprint 2)

| Module | Routes |
|--------|--------|
| **Circulars CMS** | `/admin/circulars`, `/admin/circulars/new`, `/admin/circulars/[id]` |
| **Downloads CMS** | `/admin/downloads`, `/admin/downloads/new`, `/admin/downloads/[id]` |
| **Media centre** | `/admin/media`, `/admin/media/new`, `/admin/media/[id]` |

### Sprint 4 features

**Feedback:** status workflow (new → in progress → resolved → closed), department assignment, admin remarks, category filter tabs

**Menus:** edit header, footer, and quick-link items; link to CMS pages or custom URLs; parent/child hierarchy; sort order

**Banners:** image upload, target URL, schedule (start/end), priority, active toggle

**Audit log:** filter by action and entity type; shows user, timestamp, details (super admin only)

## Sprint 6 — Done

| Module | Routes |
|--------|--------|
| **Users & roles** | `/admin/users`, `/admin/users/new`, `/admin/users/[id]` (super admin) |

## Sprint 7 — Done

| Module | Routes |
|--------|--------|
| **CAPTCHA + email toggles** | `/admin/settings` — super admin enables/disables reCAPTCHA and Power Automate |

When **disabled** (default): CAPTCHA verification and outbound emails are bypassed.  
When **enabled**: requires env keys (`CAPTCHA_*`, `POWER_AUTOMATE_EMAIL_URL`) — applies to admin login, public feedback, lockout alerts, and feedback notifications.

---

## Remaining (D4 exit)

| Item | Notes |
|------|--------|
| IT provisioning | Production reCAPTCHA keys and Power Automate flow URL from Computer Section |

---

```bash
cd apps/web && npm run dev
```

**Admin:** http://localhost:3000/admin

## Dev super admin

| Email | `cms.admin@hau.ac.in` |
| Password | `CcsHau#CMS2026!` |

## Next: Phase 4

Public site at production routes — see [phase-4 README](../phase-4/README.md).
