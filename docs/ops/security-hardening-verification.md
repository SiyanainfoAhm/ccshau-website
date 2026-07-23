# Security hardening & pen-test verification — CCSHAU

Use this checklist before Go-Live and after any security remediation (Phases A–E).  
This is **internal assurance** — it does not replace an independent formal pen-test.

| Field | Value |
|-------|--------|
| Date | |
| Environment | ☐ Staging ☐ Production |
| Operator | |
| Build / commit | |
| Result | ☐ Pass ☐ Fail ☐ Conditional |
| Notes | |

---

## 1. Phase A — Critical DB / credentials (re-verify)

| Check | Pass |
|-------|------|
| `ccshau_download_versions` has **RLS enabled** | ☐ |
| `anon` / `authenticated` have **no** DML on `ccshau_download_versions` | ☐ |
| Sensitive RPCs (`ccshau_get_vault_secret`, `ccshau_write_audit_log`, `ccshau_archive_expired_*`, `ccshau_generate_ticket_number`) — `EXECUTE` for `anon`/`authenticated` is **false** | ☐ |
| Same RPCs — `EXECUTE` for `service_role` is **true** | ☐ |
| Client login bundle does **not** contain shared passwords | ☐ |
| Known test passwords (e.g. `Admin@123`) rotated in Auth for all non-demo accounts | ☐ |
| `NODE_ENV=production` does not email-prefill login | ☐ |

**Quick SQL (Supabase SQL editor):**

```sql
SELECT c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'ccshau_download_versions';

SELECT p.proname, r.rolname,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ccshau_get_vault_secret',
    'ccshau_write_audit_log',
    'ccshau_generate_ticket_number',
    'ccshau_archive_expired_news'
  )
  AND r.rolname IN ('anon', 'authenticated', 'service_role');
```

Also run **Supabase Dashboard → Advisors** (Security) and file any open RLS/function advisories.

---

## 2. Phase B — IDOR / XSS (re-verify)

| Check | Pass |
|-------|------|
| Dept-scoped editor cannot update/delete another department’s news | ☐ |
| Office portal delete requires matching `page_id` | ☐ |
| Download versions list requires downloads module + parent download access | ☐ |
| Public + admin HTML renders via sanitizer (`CmsHtmlContent` / DOMPurify) | ☐ |
| Scoped creates force `department_id` from session | ☐ |

---

## 3. Phase C — Hardening (this release)

| Check | Pass |
|-------|------|
| Contact/feedback: CAPTCHA when enforced + rate limit (~5 / 15 min / IP) | ☐ |
| PG seminar registration: CAPTCHA widget + server verify + rate limit (~3 / 15 min / IP) | ☐ |
| Production with CAPTCHA keys: cannot bypass via admin toggle unless `CAPTCHA_ALLOW_DISABLE=true` | ☐ |
| Security headers present (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`) | ☐ |
| Uploads reject content that fails magic-byte sniff vs declared MIME | ☐ |
| Login lockout **fails closed** if service-role admin client missing (503) | ☐ |
| Login IP rate limit + IP failure lockout active | ☐ |
| `GET /api/health` in production returns liveness only (no env posture) without secret | ☐ |
| Detailed health requires `Authorization: Bearer $CRON_SECRET` (or `HEALTH_CHECK_SECRET`) / `HEALTH_DETAILED=true` | ☐ |

**Header smoke:** open DevTools → Network → any page → Response Headers.

---

## 4. Phase D — Capacity (spot checks)

| Check | Pass |
|-------|------|
| Homepage / chrome loads without N+1 fan-out regression (cache warm) | ☐ |
| Redirect middleware does not query DB on every request after warm cache | ☐ |
| Public list queries do not select unused heavy columns (news body on lists) | ☐ |

---

## 5. Secrets & ops

| Check | Pass |
|-------|------|
| `CRON_SECRET` set on Vercel + used by archive cron routes | ☐ |
| `CAPTCHA_SECRET_KEY` / `NEXT_PUBLIC_CAPTCHA_SITE_KEY` set in staging & prod | ☐ |
| Service role key only on server (never `NEXT_PUBLIC_`) | ☐ |
| Vault / Google Translate secret not callable by anon | ☐ |
| Power Automate webhooks not public without auth | ☐ |

---

## 6. Formal pen-test scope (hand to tester)

Suggested minimum scope against **staging**:

1. Auth: brute force, lockout, CAPTCHA bypass, session fixation  
2. IDOR on CMS server actions (news, downloads, office portal, pages)  
3. PostgREST: direct table/RPC access as `anon`  
4. Stored XSS via CMS HTML fields  
5. Upload MIME spoofing  
6. Public form spam (feedback, seminar)  
7. Information disclosure (`/api/health`, error messages, source maps)  
8. Privilege escalation across RBAC roles / department modules  

Deliverable: report with severity, evidence, and remediations. Retest after fixes.

---

## 7. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Computer Section / Admin | | | |
| Pen-test lead (if external) | | | |

Related: [backup-restore-guide.md](./backup-restore-guide.md), [restore-drill-checklist.md](./restore-drill-checklist.md), audit canvas (internal).
