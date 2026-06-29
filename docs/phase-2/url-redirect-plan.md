# URL Taxonomy & Legacy Redirect Plan

**Phase:** 2 | **Version:** 1.0 | **Date:** 23 June 2026  
**Source site:** [https://hau.ac.in/](https://hau.ac.in/)  
**Target:** Next.js public routes (Option B — Agri Future UI)

---

## 1. Production URL taxonomy

| Path | Content type | Data source |
|------|--------------|-------------|
| `/` | Homepage | Banners, news highlights, quick links |
| `/about` | Static page | `ccshau_pages` |
| `/administration` | Section index | Page + child pages |
| `/administration/[slug]` | CMS page | `ccshau_pages` |
| `/academics` | Section index | |
| `/academics/colleges` | College listing | Pages or dedicated module |
| `/academics/colleges/[slug]` | College detail | `ccshau_pages` |
| `/academics/admissions` | Admissions | `ccshau_pages` |
| `/directorates/[slug]` | Directorate pages | `ccshau_pages` |
| `/news` | News listing | `ccshau_news` |
| `/news/[slug]` | News detail | `ccshau_news` |
| `/tenders` | Open tenders | `ccshau_tenders` |
| `/tenders/archive` | Archived tenders | `ccshau_tenders` |
| `/tenders/[slug]` | Tender detail | `ccshau_tenders` |
| `/circulars` | Circulars listing | `ccshau_circulars` |
| `/circulars/[id]` | Circular detail | `ccshau_circulars` |
| `/downloads` | Downloads repository | `ccshau_downloads` |
| `/media` | Media centre | `ccshau_media_albums` |
| `/media/[slug]` | Album detail | `ccshau_media_items` |
| `/contact` | Contact page | Static + form |
| `/feedback` | Feedback form | `ccshau_feedback` |
| `/search` | Global search | FTS API |

### Slug rules

- Lowercase ASCII, hyphen-separated: `directorate-of-research`
- Unique per content type (news slugs independent of page slugs)
- Hindi URLs: optional `/hi/news/[slug]` mirror or `?lang=hi` (Phase 4 default: query param)

### Phase 1 → Phase 4 route promotion

| Prototype (now) | Production (Phase 4) |
|-----------------|----------------------|
| `/design/option-b` | `/` |
| `/design/option-b/news` | `/news` |
| `/design/option-b/tenders` | `/tenders` |
| `/design/option-b/contact` | `/contact` |

---

## 2. Redirect implementation

### Layer 1 — Next.js `middleware.ts`

Lookup `ccshau_url_redirects` for incoming path → 301 redirect.

```typescript
// Pseudocode
const redirect = await getRedirect(pathname);
if (redirect) return NextResponse.redirect(new URL(redirect.new_path, request.url), 301);
```

### Layer 2 — `next.config.ts` static redirects

High-traffic known paths (cached at edge):

```typescript
async redirects() {
  return [
    { source: '/index.aspx', destination: '/', permanent: true },
    { source: '/Default.aspx', destination: '/', permanent: true },
  ];
}
```

### Layer 3 — Database table `ccshau_url_redirects`

For bulk legacy paths discovered during Phase 5 migration.

| Column | Example |
|--------|---------|
| `legacy_path` | `/NoticeBoard.aspx` |
| `new_path` | `/news` |
| `redirect_type` | `301` |

---

## 3. Known legacy patterns (hau.ac.in)

> To be validated during Phase 5 content migration. Seed examples below.

| Legacy path (estimated) | New path | Notes |
|-------------------------|----------|-------|
| `/` / `/home` / `/index.aspx` | `/` | Homepage |
| `/AboutUs.aspx` or `/about` | `/about` | |
| `/NoticeBoard.aspx` | `/news` | Notices board |
| `/Tender.aspx` / `/tenders` | `/tenders` | |
| `/Circular.aspx` | `/circulars` | |
| `/Download.aspx` | `/downloads` | |
| `/Contact.aspx` | `/contact` | |
| `/Gallery.aspx` | `/media` | |
| `/College/*.aspx` | `/academics/colleges/[slug]` | Per-college mapping |
| `/PDF/*` | `/downloads` or direct file | Case-by-case |

**Action required from CCSHAU IT:** Export current sitemap / IIS URL rewrite list / analytics top URLs.

---

## 4. SEO preservation

| Measure | Implementation |
|---------|----------------|
| 301 redirects | All legacy → new permanent |
| Canonical URLs | `<link rel="canonical">` on all pages |
| `sitemap.xml` | Generated from published pages + news + tenders |
| `robots.txt` | Allow public; disallow `/admin` |
| Meta tags | From `meta_title`, `meta_description` in CMS |
| Structured data | `Organization`, `NewsArticle`, `GovernmentOrganization` JSON-LD |

---

## 5. Migration workflow (Phase 5)

```
1. Crawl hau.ac.in → build legacy URL inventory
2. Map each URL to new path (automated + manual review)
3. INSERT into ccshau_url_redirects
4. Validate with redirect checker (expect 301, no chains)
5. Submit updated sitemap to search engines post go-live
```

**Target:** ≥90% legacy URLs mapped per RFP.

---

## 6. Admin management

Phase 3 optional module: super_admin can CRUD redirects in `/admin/settings/redirects` without redeploying.

---

## 7. Testing checklist

- [ ] No redirect chains (A → B → C)
- [ ] Query strings preserved where needed (`?id=` → slug lookup)
- [ ] 404 for unmapped legacy URLs logged for Phase 5 review
- [ ] Hindi paths redirect correctly
- [ ] PDF deep links either redirect or serve via Storage signed URL
