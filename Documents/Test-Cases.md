# CCSHAU Unit & Smoke Test Cases

Generated: 2026-08-27T04:24:11.617Z

| Metric | Value |
|--------|------:|
| Test files | 52 |
| Test cases | 227 |
| Framework | Vitest 3 (`apps/web`) |

## How to run

```bash
# From repo root
npm test
npm run test:smoke
```

Optional HTTP smoke env:

- `SMOKE_BASE_URL` (default `http://localhost:3000`)
- `SMOKE_COLLEGE_SLUG` (default `college-of-agriculture-hisar`)

HTTP public-page smoke tests **skip** when the app server is not running.

## Summary by category

| Category | Files | Cases |
|----------|------:|------:|
| API routes | 2 | 22 |
| Auth & CMS access | 9 | 42 |
| Validations (Zod) | 16 | 58 |
| HTML / CMS content | 3 | 23 |
| Pages / routing / layout | 6 | 26 |
| Storage / upload pipeline | 4 | 17 |
| Public HTTP smoke | 1 | 2 |
| i18n / a11y / helpers | 10 | 33 |
| Other | 1 | 4 |

---

## API routes

### `src/app/api/api-routes.test.ts` (18)

**Suites:** `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/change-password`, `POST /api/auth/password-reset-request`, `POST /api/auth/password-reset-confirm`, `GET /api/downloads/[id]/file`, `GET /api/cron/*`

| # | Test case |
|---|----------|
| 1 | returns ok status with timestamp |
| 2 | returns 400 for invalid JSON |
| 3 | returns 400 for validation errors |
| 4 | returns 401 for invalid credentials |
| 5 | returns 503 when auth env is missing |
| 6 | returns success |
| 7 | returns 400 for invalid payload |
| 8 | returns 401 when not signed in |
| 9 | returns 400 for invalid email |
| 10 | returns generic success for valid email |
| 11 | returns 503 when email is not configured |
| 12 | returns 400 for mismatched passwords |
| 13 | returns 401 without recovery session |
| 14 | returns 404 when download not found |
| 15 | redirects to stored file URL |
| 16 | returns 401 without authorization |
| 17 | process-tenders returns ok when authorized |
| 18 | process-downloads returns ok when authorized |

### `src/smoke/api-routes.smoke.test.ts` (4)

**Suites:** `API HTTP smoke`

| # | Test case |
|---|----------|
| 19 | GET /api/health returns 200 |
| 20 | POST /api/auth/login returns 400 for invalid body |
| 21 | GET /api/cron/process-tenders returns 401 without secret |
| 22 | GET /api/downloads/[id]/file returns 404 for unknown id |


## Auth & CMS access

### `src/lib/auth/admin-nav-access.test.ts` (4)

**Suites:** `admin-nav-access`

| # | Test case |
|---|----------|
| 23 | gives super admin full path access |
| 24 | blocks super-admin-only paths for university admin |
| 25 | limits faculty-only users to dashboard and own profile |
| 26 | enforces cms module allow-list on content paths |

### `src/lib/auth/cms-module-access.test.ts` (3)

**Suites:** `cms-module-access`

| # | Test case |
|---|----------|
| 27 | maps admin paths to cms modules |
| 28 | allows all modules when allow-list is null |
| 29 | enforces allow-list for content modules |

### `src/lib/auth/cms-page-access.test.ts` (9)

**Suites:** `CMS scope smoke - page access`, `CMS scope smoke - create pages`, `CMS scope smoke - admin nav paths`

| # | Test case |
|---|----------|
| 30 | HOD can only open assigned department page |
| 31 | college-only admin can only open pages in assigned college |
| 32 | university editor can open college pages; strict dept scope blocks other depts |
| 33 | super admin and university admin can open any page |
| 34 | faculty-only session without page roles is denied |
| 35 | blocks HOD from creating pages; allows college editor |
| 36 | college-only create must stay under assigned college root |
| 37 | limits college-only users to pages + register |
| 38 | limits HOD-only users to pages list/edit and own faculty profile |

### `src/lib/auth/cms-roles.test.ts` (6)

**Suites:** `cms-roles`

| # | Test case |
|---|----------|
| 39 | detects role membership |
| 40 | allows editors to edit but not publish |
| 41 | allows reviewers to publish but not edit |
| 42 | treats university admins as university-wide |
| 43 | scopes department content for dept editors |
| 44 | detects viewer-only sessions |

### `src/lib/auth/college-scope.test.ts` (7)

**Suites:** `college-scope`

| # | Test case |
|---|----------|
| 45 | detects super and university admin sessions |
| 46 | detects college-only users without university CMS roles |
| 47 | allows admin access for CMS, college, HOD, or faculty sessions |
| 48 | gates edit / publish / delete / university content by role |
| 49 | restricts college root creation to super admins |
| 50 | scopes college root access to assigned college for college-only users |
| 51 | builds university CMS page list OR filter |

### `src/lib/auth/content-status-options.test.ts` (2)

**Suites:** `contentStatusOptions`, `tenderStatusOptions`

| # | Test case |
|---|----------|
| 52 | hides published when user cannot publish |
| 53 | hides open when user cannot publish |

### `src/lib/auth/department-hod-scope.test.ts` (4)

**Suites:** `department-hod-scope`

| # | Test case |
|---|----------|
| 54 | detects HOD-only users |
| 55 | is not HOD-only when university CMS or college assignment exists |
| 56 | allows edit only for the assigned department page |
| 57 | allows HOD assignment management for super admin and college admin |

### `src/lib/auth/faculty-scope.test.ts` (2)

**Suites:** `faculty-scope`

| # | Test case |
|---|----------|
| 58 | detects faculty-only users |
| 59 | is not faculty-only when university cms role exists |

### `src/lib/auth/rbac.test.ts` (5)

**Suites:** `hasRole`, `highestRole`

| # | Test case |
|---|----------|
| 60 | matches allowed roles |
| 61 | treats super_admin as allowed when listed |
| 62 | scopes by department when departmentId is provided |
| 63 | returns the highest ranked role |
| 64 | returns null when there are no assignments |


## Validations (Zod)

### `src/lib/validations/auth.test.ts` (5)

**Suites:** `loginSchema`, `passwordResetRequestSchema`, `passwordResetConfirmSchema`, `changePasswordSchema`

| # | Test case |
|---|----------|
| 65 | accepts valid credentials |
| 66 | rejects invalid email and short password |
| 67 | requires a valid email |
| 68 | requires matching passwords |
| 69 | requires match and different new password |

### `src/lib/validations/college-register.test.ts` (2)

**Suites:** `college-register schemas`

| # | Test case |
|---|----------|
| 70 | validates department registration |
| 71 | validates faculty registration and assignment |

### `src/lib/validations/college-wizard.test.ts` (2)

**Suites:** `collegeWizardSchema`

| # | Test case |
|---|----------|
| 72 | accepts a valid academic college wizard payload |
| 73 | rejects bad slug / missing required contact fields |

### `src/lib/validations/downloads.test.ts` (2)

**Suites:** `downloads validation`

| # | Test case |
|---|----------|
| 74 | validates download form payload |
| 75 | parses tags and formats categories |

### `src/lib/validations/media.test.ts` (2)

**Suites:** `media schemas`

| # | Test case |
|---|----------|
| 76 | validates album form fields |
| 77 | requires http(s) video URLs when provided |

### `src/lib/validations/medium-forms.test.ts` (7)

**Suites:** `bannerFormSchema`, `circularFormSchema`, `homepage schemas`, `relatedLinkFormSchema`, `feedbackUpdateSchema`, `contact-emails helpers`

| # | Test case |
|---|----------|
| 78 | requires title and accepts optional URL |
| 79 | requires English title and status |
| 80 | validates quote, dignitary, initiative, and CTA |
| 81 | requires title and valid URL |
| 82 | accepts admin status updates |
| 83 | parses and normalizes email lists |
| 84 | enforces required contact emails when configured |

### `src/lib/validations/menus.test.ts` (2)

**Suites:** `menus validation`

| # | Test case |
|---|----------|
| 85 | validates menu locations |
| 86 | requires an English label |

### `src/lib/validations/news.test.ts` (4)

**Suites:** `newsFormSchema`

| # | Test case |
|---|----------|
| 87 | accepts a minimal valid news item |
| 88 | requires english title and valid slug |
| 89 | accepts notice types and coerces featured flags |
| 90 | rejects unknown notice type |

### `src/lib/validations/office-portal.test.ts` (4)

**Suites:** `office-portal schemas`

| # | Test case |
|---|----------|
| 91 | requires contact label and value |
| 92 | requires staff name and designation |
| 93 | requires ticker headline |
| 94 | requires sidebar URL or English content |

### `src/lib/validations/pages.test.ts` (5)

**Suites:** `pageFormSchema`

| # | Test case |
|---|----------|
| 95 | accepts a minimal valid page |
| 96 | requires english title and valid slug |
| 97 | requires address and phone when college contact location is enabled |
| 98 | accepts college contact location when address, phone, and email are set |
| 99 | rejects out-of-range map coordinates |

### `src/lib/validations/pg-seminar-registration.test.ts` (4)

**Suites:** `pgSeminarRegistrationSchema`, `yes/no helpers`

| # | Test case |
|---|----------|
| 100 | accepts a minimal valid registration |
| 101 | rejects inverted date range |
| 102 | requires country when foreigner is yes |
| 103 | parses and converts yes/no values |

### `src/lib/validations/public-feedback.test.ts` (2)

**Suites:** `publicFeedbackSchema`

| # | Test case |
|---|----------|
| 104 | accepts valid public feedback |
| 105 | requires name, email, department, subject, and message length |

### `src/lib/validations/redirects.test.ts` (2)

**Suites:** `redirectFormSchema`

| # | Test case |
|---|----------|
| 106 | accepts valid absolute-path redirects |
| 107 | rejects paths without leading slash and invalid types |

### `src/lib/validations/settings.test.ts` (4)

**Suites:** `securitySettingsSchema`, `socialMediaSettingsSchema`

| # | Test case |
|---|----------|
| 108 | accepts boolean flags (coerce treats non-empty strings as true) |
| 109 | accepts empty strings to clear URLs |
| 110 | accepts valid http(s) URLs |
| 111 | rejects non-http URLs |

### `src/lib/validations/tenders.test.ts` (5)

**Suites:** `tenderFormSchema`, `corrigendumFormSchema`, `formatTenderCategory`

| # | Test case |
|---|----------|
| 112 | accepts a minimal valid tender |
| 113 | requires english title and slug format |
| 114 | accepts known lifecycle statuses |
| 115 | requires a title |
| 116 | capitalizes category labels |

### `src/lib/validations/users.test.ts` (6)

**Suites:** `inviteUserSchema`, `assignRoleSchema`, `updateUserSchema`, `assignCollegeSchema / assignDepartmentHodSchema`

| # | Test case |
|---|----------|
| 117 | accepts a basic invite |
| 118 | requires college role and college together |
| 119 | requires department for scoped roles |
| 120 | rejects department on university-wide roles |
| 121 | requires display name |
| 122 | requires valid uuids |


## HTML / CMS content

### `src/lib/html/extract-pdf-url.test.ts` (9)

**Suites:** `extractPdfUrlFromHtml`, `isPrimarilyPdfHtml`, `extractPdfCaptionFromHtml`

| # | Test case |
|---|----------|
| 123 | returns null for empty html |
| 124 | extracts pdf from iframe src |
| 125 | extracts pdf from anchor href when no iframe |
| 126 | returns null when no pdf url is present |
| 127 | is true for short pdf-only iframe content |
| 128 | is false for long body content that also links a pdf |
| 129 | is false when there is no pdf |
| 130 | returns short caption text |
| 131 | returns null for long stripped text |

### `src/lib/html/has-cms-html-content.test.ts` (4)

**Suites:** `hasCmsHtmlContent`

| # | Test case |
|---|----------|
| 132 | is false for empty values |
| 133 | is true when visible text remains |
| 134 | is true for media-only markup without text |
| 135 | ignores script and style text |

### `src/lib/html/sanitize-cms-html.test.ts` (10)

**Suites:** `sanitizeCmsHtml`, `normalizeCmsHtml`

| # | Test case |
|---|----------|
| 136 | returns empty string for empty input |
| 137 | keeps same-origin pdf iframe src |
| 138 | keeps azure blob pdf iframe src |
| 139 | strips font-family and text-align from inline styles |
| 140 | removes script tags |
| 141 | adds a default title on iframe without title |
| 142 | promotes a single short plain line to h2 |
| 143 | wraps longer plain sentence text in a paragraph |
| 144 | promotes plain heading-like lines to h2 |
| 145 | leaves existing block html intact |


## Pages / routing / layout

### `src/lib/banners/hero-display.test.ts` (4)

**Suites:** `hero-display`

| # | Test case |
|---|----------|
| 146 | normalizes whitespace |
| 147 | treats university name labels as generic |
| 148 | hides generic hero titles |
| 149 | hides subtitle when it matches title or is generic |

### `src/lib/data/homepage-public.smoke.test.ts` (4)

**Suites:** `homepage + college microsite public smoke (structure)`

| # | Test case |
|---|----------|
| 150 | resolves homepage college cards to public college URLs |
| 151 | maps alias CMS slug onto legacy college card |
| 152 | builds college microsite home and section paths |
| 153 | office portal layout needs portal data load for microsite home |

### `src/lib/pages/layout-config.test.ts` (5)

**Suites:** `layout-config`

| # | Test case |
|---|----------|
| 154 | returns presets by template |
| 155 | merges stored boolean overrides onto presets |
| 156 | detects complete layout config and parses JSON |
| 157 | preserves locked layout keys when HOD saves |
| 158 | detects college layout pages and office data needs |

### `src/lib/pages/microsite-kind.test.ts` (2)

**Suites:** `microsite-kind`

| # | Test case |
|---|----------|
| 159 | detects microsite roots |
| 160 | infers academic vs directorate from parent slug |

### `src/lib/pages/resolve-public-path.test.ts` (5)

**Suites:** `resolve-public-path`

| # | Test case |
|---|----------|
| 161 | detects colleges container and college ancestry |
| 162 | resolves college root page type under colleges container |
| 163 | builds ancestor chain for child pages |
| 164 | maps public paths for college section, subsection, and PG studies |
| 165 | computes placement and path from page map |

### `src/lib/pages/routes.test.ts` (6)

**Suites:** `routes helpers`

| # | Test case |
|---|----------|
| 166 | maps public page paths by type |
| 167 | maps HRM / estate CMS pages to college menu slugs |
| 168 | uses /pages home for HRM and estate microsites |
| 169 | builds college section and contact paths |
| 170 | maps pg-studies nested url segments |
| 171 | detects mega menu depth |


## Storage / upload pipeline

### `src/lib/storage/config.test.ts` (1)

**Suites:** `storage path builders`

| # | Test case |
|---|----------|
| 172 | builds deterministic blob keys and sanitizes filenames |

### `src/lib/storage/upload-pipeline.smoke.test.ts` (5)

**Suites:** `upload pipeline smoke`

| # | Test case |
|---|----------|
| 173 | accepts JPEG through validate → path → public URL |
| 174 | accepts PDF news attachment end-to-end |
| 175 | accepts page featured image path after validation |
| 176 | rejects executable and magic-byte mismatches before upload |
| 177 | accepts MP4 via media upload pipeline and rejects PDF as media |

### `src/lib/storage/urls.test.ts` (3)

**Suites:** `storage urls`

| # | Test case |
|---|----------|
| 178 | builds blob URLs from account and container |
| 179 | maps legacy buckets onto a single configured container |
| 180 | resolves stored paths and absolute URLs |

### `src/lib/storage/validate.test.ts` (8)

**Suites:** `sniffUploadMime`, `validateUploadFile`, `validateMediaUploadFile`, `assertUploadMagicBytes`, `sanitizeFileName`

| # | Test case |
|---|----------|
| 181 | detects common image and document magic bytes |
| 182 | detects ZIP and OLE containers |
| 183 | accepts allowed types under size limits |
| 184 | rejects disallowed types and oversized files |
| 185 | allows video types within media limits |
| 186 | rejects mismatched content vs declared type |
| 187 | allows JPEG bytes claimed as PNG (image quirk) |
| 188 | strips unsafe characters |


## Public HTTP smoke

### `src/smoke/public-pages.smoke.test.ts` (2)

**Suites:** `public page HTTP smoke`

| # | Test case |
|---|----------|
| 189 | homepage returns 200 with site branding |
| 190 | college microsite home returns 200 |


## i18n / a11y / helpers

### `src/lib/a11y/image-alt.test.ts` (3)

**Suites:** `image-alt`

| # | Test case |
|---|----------|
| 191 | prefers explicit alt then caption then name/title |
| 192 | prefers Hindi when lang is hi |
| 193 | builds hero, staff, and gallery alts |

### `src/lib/calendar/month.test.ts` (4)

**Suites:** `calendar/month`

| # | Test case |
|---|----------|
| 194 | parses valid year and month |
| 195 | falls back for invalid year or month |
| 196 | computes days and first weekday |
| 197 | shifts months across year boundary |

### `src/lib/data/pagination.test.ts` (2)

**Suites:** `pagination`

| # | Test case |
|---|----------|
| 198 | parses positive page numbers with fallback |
| 199 | builds paginated result and range |

### `src/lib/faculty/parse-legacy-profile.test.ts` (3)

**Suites:** `parse-legacy-profile`

| # | Test case |
|---|----------|
| 200 | detects plain legacy profile text |
| 201 | splits content into titled sections |
| 202 | parses key/value lines and tabular rows |

### `src/lib/i18n/menu-label.test.ts` (3)

**Suites:** `menu-label`

| # | Test case |
|---|----------|
| 203 | uppercases English nav labels |
| 204 | title-cases submenu labels and keeps small words lowercase |
| 205 | leaves Hindi unchanged |

### `src/lib/i18n/pick-bilingual.test.ts` (5)

**Suites:** `pickBilingual`

| # | Test case |
|---|----------|
| 206 | prefers hindi when lang is hi |
| 207 | falls back to english when hindi is empty |
| 208 | prefers english when lang is en |
| 209 | falls back to hindi when english is empty |
| 210 | returns empty string when both missing |

### `src/lib/media/video-playback.test.ts` (5)

**Suites:** `getVideoPlayback`, `isHttpUrl`

| # | Test case |
|---|----------|
| 211 | embeds YouTube watch, short, and youtu.be URLs |
| 212 | embeds Vimeo URLs |
| 213 | treats other http(s) URLs as file playback |
| 214 | rejects empty and non-http URLs |
| 215 | validates http(s) only |

### `src/lib/social/public-social-links.test.ts` (1)

**Suites:** `socialLinksFromSettings`

| # | Test case |
|---|----------|
| 216 | omits empty platforms and returns configured links |

### `src/lib/utils/format-datetime.test.ts` (3)

**Suites:** `format-datetime`

| # | Test case |
|---|----------|
| 217 | formats valid ISO timestamps in Asia/Kolkata |
| 218 | returns original string for invalid dates |
| 219 | detects expiry against now |

### `src/lib/utils/slug.test.ts` (4)

**Suites:** `slugify`

| # | Test case |
|---|----------|
| 220 | lowercases and hyphenates spaces |
| 221 | strips punctuation and collapses separators |
| 222 | trims leading and trailing hyphens |
| 223 | returns empty string for empty input |


## Other

### `src/lib/security/rate-limit.test.ts` (4)

**Suites:** `checkRateLimit`, `clientIpFromHeaders`

| # | Test case |
|---|----------|
| 224 | allows requests under the limit and blocks when exceeded |
| 225 | starts a new window after reset |
| 226 | prefers first x-forwarded-for hop |
| 227 | falls back to x-real-ip then unknown |

---

## Out of scope (intentionally skipped)

- Login lockout tests (mocked in API route tests)
- Captcha verification behavior (mocked in API route tests)
- Full Azure Blob upload (network) — validation + path + URL pipeline is covered without cloud I/O
- Supabase DB integration / e2e browser automation (Playwright)

## Source inventory

Machine-readable list: `Documents/unit-test-cases.json`
