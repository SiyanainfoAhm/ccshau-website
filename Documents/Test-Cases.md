# CCSHAU Unit & Smoke Test Cases

Generated: 2026-08-27T03:37:15.497Z

| Metric | Value |
|--------|------:|
| Test files | 50 |
| Test cases | 205 |
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
| Auth & CMS access | 9 | 42 |
| Validations (Zod) | 16 | 58 |
| HTML / CMS content | 3 | 23 |
| Pages / routing / layout | 6 | 26 |
| Storage / upload pipeline | 4 | 17 |
| Public HTTP smoke | 1 | 2 |
| i18n / a11y / helpers | 10 | 33 |
| Other | 1 | 4 |

---

## Auth & CMS access

### `src/lib/auth/admin-nav-access.test.ts` (4)

**Suites:** `admin-nav-access`

| # | Test case |
|---|----------|
| 1 | gives super admin full path access |
| 2 | blocks super-admin-only paths for university admin |
| 3 | limits faculty-only users to dashboard and own profile |
| 4 | enforces cms module allow-list on content paths |

### `src/lib/auth/cms-module-access.test.ts` (3)

**Suites:** `cms-module-access`

| # | Test case |
|---|----------|
| 5 | maps admin paths to cms modules |
| 6 | allows all modules when allow-list is null |
| 7 | enforces allow-list for content modules |

### `src/lib/auth/cms-page-access.test.ts` (9)

**Suites:** `CMS scope smoke - page access`, `CMS scope smoke - create pages`, `CMS scope smoke - admin nav paths`

| # | Test case |
|---|----------|
| 8 | HOD can only open assigned department page |
| 9 | college-only admin can only open pages in assigned college |
| 10 | university editor can open college pages; strict dept scope blocks other depts |
| 11 | super admin and university admin can open any page |
| 12 | faculty-only session without page roles is denied |
| 13 | blocks HOD from creating pages; allows college editor |
| 14 | college-only create must stay under assigned college root |
| 15 | limits college-only users to pages + register |
| 16 | limits HOD-only users to pages list/edit and own faculty profile |

### `src/lib/auth/cms-roles.test.ts` (6)

**Suites:** `cms-roles`

| # | Test case |
|---|----------|
| 17 | detects role membership |
| 18 | allows editors to edit but not publish |
| 19 | allows reviewers to publish but not edit |
| 20 | treats university admins as university-wide |
| 21 | scopes department content for dept editors |
| 22 | detects viewer-only sessions |

### `src/lib/auth/college-scope.test.ts` (7)

**Suites:** `college-scope`

| # | Test case |
|---|----------|
| 23 | detects super and university admin sessions |
| 24 | detects college-only users without university CMS roles |
| 25 | allows admin access for CMS, college, HOD, or faculty sessions |
| 26 | gates edit / publish / delete / university content by role |
| 27 | restricts college root creation to super admins |
| 28 | scopes college root access to assigned college for college-only users |
| 29 | builds university CMS page list OR filter |

### `src/lib/auth/content-status-options.test.ts` (2)

**Suites:** `contentStatusOptions`, `tenderStatusOptions`

| # | Test case |
|---|----------|
| 30 | hides published when user cannot publish |
| 31 | hides open when user cannot publish |

### `src/lib/auth/department-hod-scope.test.ts` (4)

**Suites:** `department-hod-scope`

| # | Test case |
|---|----------|
| 32 | detects HOD-only users |
| 33 | is not HOD-only when university CMS or college assignment exists |
| 34 | allows edit only for the assigned department page |
| 35 | allows HOD assignment management for super admin and college admin |

### `src/lib/auth/faculty-scope.test.ts` (2)

**Suites:** `faculty-scope`

| # | Test case |
|---|----------|
| 36 | detects faculty-only users |
| 37 | is not faculty-only when university cms role exists |

### `src/lib/auth/rbac.test.ts` (5)

**Suites:** `hasRole`, `highestRole`

| # | Test case |
|---|----------|
| 38 | matches allowed roles |
| 39 | treats super_admin as allowed when listed |
| 40 | scopes by department when departmentId is provided |
| 41 | returns the highest ranked role |
| 42 | returns null when there are no assignments |


## Validations (Zod)

### `src/lib/validations/auth.test.ts` (5)

**Suites:** `loginSchema`, `passwordResetRequestSchema`, `passwordResetConfirmSchema`, `changePasswordSchema`

| # | Test case |
|---|----------|
| 43 | accepts valid credentials |
| 44 | rejects invalid email and short password |
| 45 | requires a valid email |
| 46 | requires matching passwords |
| 47 | requires match and different new password |

### `src/lib/validations/college-register.test.ts` (2)

**Suites:** `college-register schemas`

| # | Test case |
|---|----------|
| 48 | validates department registration |
| 49 | validates faculty registration and assignment |

### `src/lib/validations/college-wizard.test.ts` (2)

**Suites:** `collegeWizardSchema`

| # | Test case |
|---|----------|
| 50 | accepts a valid academic college wizard payload |
| 51 | rejects bad slug / missing required contact fields |

### `src/lib/validations/downloads.test.ts` (2)

**Suites:** `downloads validation`

| # | Test case |
|---|----------|
| 52 | validates download form payload |
| 53 | parses tags and formats categories |

### `src/lib/validations/media.test.ts` (2)

**Suites:** `media schemas`

| # | Test case |
|---|----------|
| 54 | validates album form fields |
| 55 | requires http(s) video URLs when provided |

### `src/lib/validations/medium-forms.test.ts` (7)

**Suites:** `bannerFormSchema`, `circularFormSchema`, `homepage schemas`, `relatedLinkFormSchema`, `feedbackUpdateSchema`, `contact-emails helpers`

| # | Test case |
|---|----------|
| 56 | requires title and accepts optional URL |
| 57 | requires English title and status |
| 58 | validates quote, dignitary, initiative, and CTA |
| 59 | requires title and valid URL |
| 60 | accepts admin status updates |
| 61 | parses and normalizes email lists |
| 62 | enforces required contact emails when configured |

### `src/lib/validations/menus.test.ts` (2)

**Suites:** `menus validation`

| # | Test case |
|---|----------|
| 63 | validates menu locations |
| 64 | requires an English label |

### `src/lib/validations/news.test.ts` (4)

**Suites:** `newsFormSchema`

| # | Test case |
|---|----------|
| 65 | accepts a minimal valid news item |
| 66 | requires english title and valid slug |
| 67 | accepts notice types and coerces featured flags |
| 68 | rejects unknown notice type |

### `src/lib/validations/office-portal.test.ts` (4)

**Suites:** `office-portal schemas`

| # | Test case |
|---|----------|
| 69 | requires contact label and value |
| 70 | requires staff name and designation |
| 71 | requires ticker headline |
| 72 | requires sidebar URL or English content |

### `src/lib/validations/pages.test.ts` (5)

**Suites:** `pageFormSchema`

| # | Test case |
|---|----------|
| 73 | accepts a minimal valid page |
| 74 | requires english title and valid slug |
| 75 | requires address and phone when college contact location is enabled |
| 76 | accepts college contact location when address, phone, and email are set |
| 77 | rejects out-of-range map coordinates |

### `src/lib/validations/pg-seminar-registration.test.ts` (4)

**Suites:** `pgSeminarRegistrationSchema`, `yes/no helpers`

| # | Test case |
|---|----------|
| 78 | accepts a minimal valid registration |
| 79 | rejects inverted date range |
| 80 | requires country when foreigner is yes |
| 81 | parses and converts yes/no values |

### `src/lib/validations/public-feedback.test.ts` (2)

**Suites:** `publicFeedbackSchema`

| # | Test case |
|---|----------|
| 82 | accepts valid public feedback |
| 83 | requires name, email, department, subject, and message length |

### `src/lib/validations/redirects.test.ts` (2)

**Suites:** `redirectFormSchema`

| # | Test case |
|---|----------|
| 84 | accepts valid absolute-path redirects |
| 85 | rejects paths without leading slash and invalid types |

### `src/lib/validations/settings.test.ts` (4)

**Suites:** `securitySettingsSchema`, `socialMediaSettingsSchema`

| # | Test case |
|---|----------|
| 86 | accepts boolean flags (coerce treats non-empty strings as true) |
| 87 | accepts empty strings to clear URLs |
| 88 | accepts valid http(s) URLs |
| 89 | rejects non-http URLs |

### `src/lib/validations/tenders.test.ts` (5)

**Suites:** `tenderFormSchema`, `corrigendumFormSchema`, `formatTenderCategory`

| # | Test case |
|---|----------|
| 90 | accepts a minimal valid tender |
| 91 | requires english title and slug format |
| 92 | accepts known lifecycle statuses |
| 93 | requires a title |
| 94 | capitalizes category labels |

### `src/lib/validations/users.test.ts` (6)

**Suites:** `inviteUserSchema`, `assignRoleSchema`, `updateUserSchema`, `assignCollegeSchema / assignDepartmentHodSchema`

| # | Test case |
|---|----------|
| 95 | accepts a basic invite |
| 96 | requires college role and college together |
| 97 | requires department for scoped roles |
| 98 | rejects department on university-wide roles |
| 99 | requires display name |
| 100 | requires valid uuids |


## HTML / CMS content

### `src/lib/html/extract-pdf-url.test.ts` (9)

**Suites:** `extractPdfUrlFromHtml`, `isPrimarilyPdfHtml`, `extractPdfCaptionFromHtml`

| # | Test case |
|---|----------|
| 101 | returns null for empty html |
| 102 | extracts pdf from iframe src |
| 103 | extracts pdf from anchor href when no iframe |
| 104 | returns null when no pdf url is present |
| 105 | is true for short pdf-only iframe content |
| 106 | is false for long body content that also links a pdf |
| 107 | is false when there is no pdf |
| 108 | returns short caption text |
| 109 | returns null for long stripped text |

### `src/lib/html/has-cms-html-content.test.ts` (4)

**Suites:** `hasCmsHtmlContent`

| # | Test case |
|---|----------|
| 110 | is false for empty values |
| 111 | is true when visible text remains |
| 112 | is true for media-only markup without text |
| 113 | ignores script and style text |

### `src/lib/html/sanitize-cms-html.test.ts` (10)

**Suites:** `sanitizeCmsHtml`, `normalizeCmsHtml`

| # | Test case |
|---|----------|
| 114 | returns empty string for empty input |
| 115 | keeps same-origin pdf iframe src |
| 116 | keeps azure blob pdf iframe src |
| 117 | strips font-family and text-align from inline styles |
| 118 | removes script tags |
| 119 | adds a default title on iframe without title |
| 120 | promotes a single short plain line to h2 |
| 121 | wraps longer plain sentence text in a paragraph |
| 122 | promotes plain heading-like lines to h2 |
| 123 | leaves existing block html intact |


## Pages / routing / layout

### `src/lib/banners/hero-display.test.ts` (4)

**Suites:** `hero-display`

| # | Test case |
|---|----------|
| 124 | normalizes whitespace |
| 125 | treats university name labels as generic |
| 126 | hides generic hero titles |
| 127 | hides subtitle when it matches title or is generic |

### `src/lib/data/homepage-public.smoke.test.ts` (4)

**Suites:** `homepage + college microsite public smoke (structure)`

| # | Test case |
|---|----------|
| 128 | resolves homepage college cards to public college URLs |
| 129 | maps alias CMS slug onto legacy college card |
| 130 | builds college microsite home and section paths |
| 131 | office portal layout needs portal data load for microsite home |

### `src/lib/pages/layout-config.test.ts` (5)

**Suites:** `layout-config`

| # | Test case |
|---|----------|
| 132 | returns presets by template |
| 133 | merges stored boolean overrides onto presets |
| 134 | detects complete layout config and parses JSON |
| 135 | preserves locked layout keys when HOD saves |
| 136 | detects college layout pages and office data needs |

### `src/lib/pages/microsite-kind.test.ts` (2)

**Suites:** `microsite-kind`

| # | Test case |
|---|----------|
| 137 | detects microsite roots |
| 138 | infers academic vs directorate from parent slug |

### `src/lib/pages/resolve-public-path.test.ts` (5)

**Suites:** `resolve-public-path`

| # | Test case |
|---|----------|
| 139 | detects colleges container and college ancestry |
| 140 | resolves college root page type under colleges container |
| 141 | builds ancestor chain for child pages |
| 142 | maps public paths for college section, subsection, and PG studies |
| 143 | computes placement and path from page map |

### `src/lib/pages/routes.test.ts` (6)

**Suites:** `routes helpers`

| # | Test case |
|---|----------|
| 144 | maps public page paths by type |
| 145 | maps HRM / estate CMS pages to college menu slugs |
| 146 | uses /pages home for HRM and estate microsites |
| 147 | builds college section and contact paths |
| 148 | maps pg-studies nested url segments |
| 149 | detects mega menu depth |


## Storage / upload pipeline

### `src/lib/storage/config.test.ts` (1)

**Suites:** `storage path builders`

| # | Test case |
|---|----------|
| 150 | builds deterministic blob keys and sanitizes filenames |

### `src/lib/storage/upload-pipeline.smoke.test.ts` (5)

**Suites:** `upload pipeline smoke`

| # | Test case |
|---|----------|
| 151 | accepts JPEG through validate → path → public URL |
| 152 | accepts PDF news attachment end-to-end |
| 153 | accepts page featured image path after validation |
| 154 | rejects executable and magic-byte mismatches before upload |
| 155 | accepts MP4 via media upload pipeline and rejects PDF as media |

### `src/lib/storage/urls.test.ts` (3)

**Suites:** `storage urls`

| # | Test case |
|---|----------|
| 156 | builds blob URLs from account and container |
| 157 | maps legacy buckets onto a single configured container |
| 158 | resolves stored paths and absolute URLs |

### `src/lib/storage/validate.test.ts` (8)

**Suites:** `sniffUploadMime`, `validateUploadFile`, `validateMediaUploadFile`, `assertUploadMagicBytes`, `sanitizeFileName`

| # | Test case |
|---|----------|
| 159 | detects common image and document magic bytes |
| 160 | detects ZIP and OLE containers |
| 161 | accepts allowed types under size limits |
| 162 | rejects disallowed types and oversized files |
| 163 | allows video types within media limits |
| 164 | rejects mismatched content vs declared type |
| 165 | allows JPEG bytes claimed as PNG (image quirk) |
| 166 | strips unsafe characters |


## Public HTTP smoke

### `src/smoke/public-pages.smoke.test.ts` (2)

**Suites:** `public page HTTP smoke`

| # | Test case |
|---|----------|
| 167 | homepage returns 200 with site branding |
| 168 | college microsite home returns 200 |


## i18n / a11y / helpers

### `src/lib/a11y/image-alt.test.ts` (3)

**Suites:** `image-alt`

| # | Test case |
|---|----------|
| 169 | prefers explicit alt then caption then name/title |
| 170 | prefers Hindi when lang is hi |
| 171 | builds hero, staff, and gallery alts |

### `src/lib/calendar/month.test.ts` (4)

**Suites:** `calendar/month`

| # | Test case |
|---|----------|
| 172 | parses valid year and month |
| 173 | falls back for invalid year or month |
| 174 | computes days and first weekday |
| 175 | shifts months across year boundary |

### `src/lib/data/pagination.test.ts` (2)

**Suites:** `pagination`

| # | Test case |
|---|----------|
| 176 | parses positive page numbers with fallback |
| 177 | builds paginated result and range |

### `src/lib/faculty/parse-legacy-profile.test.ts` (3)

**Suites:** `parse-legacy-profile`

| # | Test case |
|---|----------|
| 178 | detects plain legacy profile text |
| 179 | splits content into titled sections |
| 180 | parses key/value lines and tabular rows |

### `src/lib/i18n/menu-label.test.ts` (3)

**Suites:** `menu-label`

| # | Test case |
|---|----------|
| 181 | uppercases English nav labels |
| 182 | title-cases submenu labels and keeps small words lowercase |
| 183 | leaves Hindi unchanged |

### `src/lib/i18n/pick-bilingual.test.ts` (5)

**Suites:** `pickBilingual`

| # | Test case |
|---|----------|
| 184 | prefers hindi when lang is hi |
| 185 | falls back to english when hindi is empty |
| 186 | prefers english when lang is en |
| 187 | falls back to hindi when english is empty |
| 188 | returns empty string when both missing |

### `src/lib/media/video-playback.test.ts` (5)

**Suites:** `getVideoPlayback`, `isHttpUrl`

| # | Test case |
|---|----------|
| 189 | embeds YouTube watch, short, and youtu.be URLs |
| 190 | embeds Vimeo URLs |
| 191 | treats other http(s) URLs as file playback |
| 192 | rejects empty and non-http URLs |
| 193 | validates http(s) only |

### `src/lib/social/public-social-links.test.ts` (1)

**Suites:** `socialLinksFromSettings`

| # | Test case |
|---|----------|
| 194 | omits empty platforms and returns configured links |

### `src/lib/utils/format-datetime.test.ts` (3)

**Suites:** `format-datetime`

| # | Test case |
|---|----------|
| 195 | formats valid ISO timestamps in Asia/Kolkata |
| 196 | returns original string for invalid dates |
| 197 | detects expiry against now |

### `src/lib/utils/slug.test.ts` (4)

**Suites:** `slugify`

| # | Test case |
|---|----------|
| 198 | lowercases and hyphenates spaces |
| 199 | strips punctuation and collapses separators |
| 200 | trims leading and trailing hyphens |
| 201 | returns empty string for empty input |


## Other

### `src/lib/security/rate-limit.test.ts` (4)

**Suites:** `checkRateLimit`, `clientIpFromHeaders`

| # | Test case |
|---|----------|
| 202 | allows requests under the limit and blocks when exceeded |
| 203 | starts a new window after reset |
| 204 | prefers first x-forwarded-for hop |
| 205 | falls back to x-real-ip then unknown |

---

## Out of scope (intentionally skipped)

- Login lockout tests
- Captcha tests
- Full Azure Blob upload (network) — validation + path + URL pipeline is covered without cloud I/O
- Supabase DB integration / e2e browser automation (Playwright)

## Source inventory

Machine-readable list: `Documents/unit-test-cases.json`
