# Supabase Storage Policy — CCSHAU

**Phase:** 2 | **Version:** 1.0 | **Date:** 23 June 2026

---

## 1. Bucket overview

| Bucket | Access | Purpose |
|--------|--------|---------|
| `ccshau-public` | Public read | Published images, banners, public PDFs |
| `ccshau-private` | Authenticated / signed URL | Draft uploads, pre-publish documents |
| `ccshau-media` | Public read (published albums) | Photo/video gallery assets |

All buckets use the `ccshau-` prefix to avoid collision with Supabase defaults.

---

## 2. Folder structure

### `ccshau-public`

```
ccshau-public/
├── banners/                    # Homepage carousel images
│   └── {banner_id}/{filename}
├── pages/                      # Featured images for CMS pages
│   └── {page_id}/{filename}
├── news/                       # Published notice attachments
│   └── {news_id}/{filename}
├── tenders/                    # Published tender documents
│   └── {tender_id}/{filename}
├── circulars/
│   └── {circular_id}/{filename}
├── downloads/
│   └── {category}/{filename}
└── site/                       # Static assets (logos, OG images)
    └── {filename}
```

### `ccshau-private`

```
ccshau-private/
├── drafts/
│   ├── news/{news_id}/
│   ├── tenders/{tender_id}/
│   └── pages/{page_id}/
└── temp/
    └── {upload_session_id}/{filename}   # Cleaned after 24h
```

### `ccshau-media`

```
ccshau-media/
├── albums/{album_id}/
│   ├── original/{item_id}.{ext}
│   └── thumbs/{item_id}.{ext}
└── press/{year}/{slug}/
```

---

## 3. File type rules

| Category | Allowed MIME | Max size |
|----------|--------------|----------|
| Images | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 5 MB |
| Documents | `application/pdf` | 25 MB |
| Office (optional) | `application/msword`, `application/vnd.openxmlformats-officedocument.*` | 15 MB |
| Video | `video/mp4`, `video/webm` | 100 MB |

Validation runs **server-side** in Server Actions before upload.

---

## 4. Access policies

### Public bucket (`ccshau-public`)

| Operation | Who | Policy |
|-----------|-----|--------|
| SELECT (read) | `anon`, `authenticated` | All objects — public bucket |
| INSERT | `service_role` only | Via Next.js server upload |
| UPDATE | `service_role` only | |
| DELETE | `service_role` only | Soft-delete in DB; physical delete by super_admin job |

### Private bucket (`ccshau-private`)

| Operation | Who | Policy |
|-----------|-----|--------|
| SELECT | `authenticated` + RLS via signed URL | Server generates short-lived signed URL |
| INSERT | `service_role` | Draft uploads |
| DELETE | `service_role` | |

### Media bucket (`ccshau-media`)

| Operation | Who | Policy |
|-----------|-----|--------|
| SELECT | `anon` for paths referenced by published albums | |
| INSERT/DELETE | `service_role` | |

> **Note:** Storage RLS policies are defined in migration or Supabase dashboard. Primary access control is through the Next.js server — buckets are not writable from the browser client.

---

## 5. Publish workflow

```
1. Editor uploads to ccshau-private/drafts/...
2. On publish Server Action:
   a. Copy/move object to ccshau-public/{module}/{id}/
   b. Update DB path column
   c. Delete draft copy (optional)
3. On unpublish: object may remain in public bucket but DB status hides it;
   or move back to private (configurable — default: keep file, hide via DB)
```

---

## 6. CDN & caching

- Public bucket objects served via Supabase CDN URL
- Next.js `Image` component for images with `remotePatterns` configured for Supabase domain
- Cache-Control: `public, max-age=31536000, immutable` for versioned filenames
- PDFs: `public, max-age=3600` with cache bust on version field change

---

## 7. Backup

- Included in Supabase project backups
- Pre-go-live: export bucket inventory manifest
- Critical documents also referenced in DB — restore order: DB first, then verify Storage paths

---

## 8. Environment

```env
# Bucket names (defaults)
NEXT_PUBLIC_STORAGE_BUCKET_PUBLIC=ccshau-public
NEXT_PUBLIC_STORAGE_BUCKET_MEDIA=ccshau-media
STORAGE_BUCKET_PRIVATE=ccshau-private
```

---

## 9. Migration setup

Buckets are created via Supabase dashboard or CLI:

```bash
supabase storage create ccshau-public --public
supabase storage create ccshau-private
supabase storage create ccshau-media --public
```

Policy SQL can be added in a follow-up migration when buckets exist on the linked project.
