# API Specification — CCSHAU CMS & Public Site

**Phase:** 2 | **Version:** 1.0 | **Date:** 23 June 2026  
**Pattern:** Next.js Server Actions (admin) + Route Handlers (public forms, auth, search)

---

## 1. Conventions

| Rule | Detail |
|------|--------|
| **Auth** | All `/admin/*` routes protected by middleware; validate JWT server-side |
| **Writes** | Server Actions use `createServerClient` with service role |
| **Validation** | Zod schemas in `apps/web/src/lib/validations/` |
| **Errors** | Return `{ success: false, error: string }` or throw for 4xx/5xx routes |
| **Audit** | Call `ccshau_write_audit_log()` after every CMS mutation |
| **i18n fields** | Accept `{ titleEn, titleHi, ... }` in payloads; map to DB columns |

### Response envelope (Server Actions)

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

---

## 2. Authentication routes

### `POST /api/auth/login`

Admin login with CAPTCHA.

**Body:**
```json
{
  "email": "admin@hau.ac.in",
  "password": "***",
  "captchaToken": "..."
}
```

**Flow:**
1. Verify CAPTCHA server-side
2. Check `ccshau_login_attempts` — reject if locked (5 failures / 15 min)
3. `supabase.auth.signInWithPassword`
4. Log attempt + audit `login` or `lockout`
5. On 5th failure → Power Automate lockout email
6. Set session cookie; return `{ success: true }`

### `POST /api/auth/logout`

Sign out + audit `logout`.

### `POST /api/auth/password-reset-request`

Custom flow (not Supabase built-in email):

1. Generate reset token (stored hashed in DB or Supabase custom claim)
2. Power Automate sends reset link
3. `POST /api/auth/password-reset-confirm` validates token + sets new password

---

## 3. Public routes

### `POST /api/feedback`

Submit public feedback form.

**Body:** `category`, `departmentId?`, `name`, `email`, `phone?`, `subject`, `message`, `captchaToken`

**Flow:**
1. Validate + CAPTCHA
2. Generate `ticket_number` via `ccshau_generate_ticket_number()`
3. Insert `ccshau_feedback`
4. Optional: Power Automate notification to department inbox
5. Return `{ ticketNumber }`

### `GET /api/search`

Global search (Phase 4).

**Query:** `q`, `type?` (pages|news|tenders|circulars|downloads), `page`, `limit`

**Implementation:** Postgres FTS via `websearch_to_tsquery('english', q)` union across tables.

### `GET /api/health`

Existing health check — Supabase connectivity.

### `GET /api/downloads/[id]`

Track download count + redirect to signed Storage URL.

---

## 4. Admin Server Actions (Phase 3)

Grouped by module. All require authenticated session + RBAC check.

### Pages — `apps/web/src/actions/pages.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `createPage` | editor+ | Draft page |
| `updatePage` | editor+ | Update draft/published |
| `publishPage` | dept_admin+ | Set status published |
| `unpublishPage` | dept_admin+ | Revert to draft |
| `deletePage` | dept_admin+ | Soft or hard delete |
| `listPages` | viewer+ | Paginated, dept-scoped |

### News — `actions/news.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `createNews` | editor+ | |
| `updateNews` | editor+ | |
| `publishNews` | dept_admin+ | |
| `archiveNews` | dept_admin+ | |
| `uploadNewsAttachment` | editor+ | → Storage `documents/news/` |

### Tenders — `actions/tenders.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `createTender` | editor+ | |
| `addCorrigendum` | editor+ | Child record + file |
| `closeTender` | dept_admin+ | |
| `archiveTender` | dept_admin+ | |

### Circulars, Downloads, Media, Banners

Same CRUD + publish pattern; file uploads to respective Storage paths (see storage-policy.md).

### Menus — `actions/menus.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `updateMenuItems` | super_admin | Reorder tree, CRUD items |
| `getMenuByLocation` | viewer+ | header / footer / quick_links |

### Users & RBAC — `actions/users.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `inviteUser` | super_admin | Create auth user + profile |
| `assignRole` | super_admin | Insert `ccshau_user_roles` |
| `deactivateUser` | super_admin | Set `is_active = false` |

### Feedback admin — `actions/feedback.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `listFeedback` | dept_admin+ | Filter by dept/status/date |
| `updateFeedbackStatus` | dept_admin+ | Status + remarks |

### Audit — `actions/audit.ts`

| Action | Roles | Description |
|--------|-------|-------------|
| `listAuditLogs` | super_admin, dept_admin | Paginated, filterable |

---

## 5. RBAC helper (middleware + actions)

```typescript
// apps/web/src/lib/auth/rbac.ts
async function requireRole(
  userId: string,
  allowedRoles: UserRole[],
  departmentId?: string
): Promise<void>;
```

Checks `ccshau_user_roles`; `super_admin` bypasses department filter.

---

## 6. Edge Functions (scheduled)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `ccshau-archive-expired` | Cron daily | Call archive SQL functions |
| `ccshau-email-dispatch` | Optional queue | Retry failed Power Automate calls |

---

## 7. Power Automate integration

Server-only utility: `apps/web/src/lib/email/power-automate.ts`

```typescript
type EmailTemplate =
  | "feedback_received"
  | "login_lockout"
  | "password_reset"
  | "content_published"; // optional

async function sendViaPowerAutomate(
  template: EmailTemplate,
  payload: Record<string, unknown>
): Promise<void>;
```

POST to flow-specific URL with `POWER_AUTOMATE_WEBHOOK_SECRET` header.

---

## 8. File upload flow

```
Admin form → Server Action
  → validate file (type, size)
  → upload to Supabase Storage (service role)
  → store path in DB column / attachment_paths jsonb
  → audit log upload
```

Never accept direct client → Storage upload for admin files (use signed upload URL issued by server if needed for large files).

---

## 9. Error codes

| HTTP | Meaning |
|------|---------|
| 400 | Validation failure |
| 401 | Not authenticated |
| 403 | RBAC denied |
| 404 | Entity not found |
| 409 | Slug/number conflict |
| 423 | Account locked |
| 429 | Rate limited (feedback, login) |
| 500 | Server error (logged, generic message to client) |

---

## 10. Phase 3 implementation order

1. Auth + RBAC middleware
2. Pages CMS
3. News + file upload
4. Tenders + corrigenda
5. Menus, banners, downloads
6. Media albums
7. Feedback admin
8. Audit log viewer
