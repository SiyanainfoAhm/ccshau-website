# Legacy MySQL (`hau_db`) → Supabase — final migration plan

**Status:** Rechecked after client DB restore — dry-run only (**no live Supabase writes**).  
**Rechecked on:** 2026-08-06 16:35 IST  
**Source:** `127.0.0.1:3306/hau_db` (73 tables)  
**Target:** Supabase `ccshau_*` + Storage (files later)  
**Dry-run report:** `scripts/legacy-import/reports/dry-run-latest.md`

---

## 1. Connection recheck

| Check | Result |
|-------|--------|
| MySQL connect as `root` | OK |
| Database | `hau_db` |
| Table count | **73** (unchanged) |
| Dry-run | OK |

### Delta vs previous dump (same day earlier)

| Metric | Before | After restore | Δ |
|--------|------:|-------------:|--:|
| News + jobs (active, mapped) | 269 | **283** | +14 |
| Tenders (active) | 59 | **64** | +5 |
| All notifications | 2,518 | **2,545** | +27 |
| Media clips (active) | 836 | **845** | +9 |
| `hau_cms` | 1,678 | **1,681** | +3 |
| Circular notifications | 784 | **787** | +3 |
| HOD (active) | 100 | **101** | +1 |
| Teaching staff | 613 | **612** | −1 |
| Quick links (active) | 46 | **44** | −2 |
| Colleges / depts / social / banners / downloads | same | same | — |
| CMS admins status=`1` | 0 | **0** | — (all 53 still `0`) |

Restore looks like a **fresher content dump**, not a full schema change. Plan below uses **post-restore** numbers.

---

## 2. Inventory (final numbers)

### Phase 1 — migrate first (metadata OK without files)

| Legacy | Active / mapped | Supabase target | Needs files? |
|--------|----------------:|-----------------|--------------|
| `hau_social` | 5 | `ccshau_site_settings` | No |
| `hau_initiatives` / `hau_flagships` / `hau_partners` | 4 / 3 / 4 | homepage CMS | Optional logos |
| `hau_slider_detail` | 31 | `ccshau_banners` | Yes (later) |
| `hau_downloads` | 79 | `ccshau_downloads` | Yes (later) |
| News (cat 5) + Dept news (28) + Latest (29) + Jobs (4) | **283** | `ccshau_news` | Attachments later |
| Tenders (cat 3) | **64** | `ccshau_tenders` | PDFs later |

### Phase 2 — org structure (metadata OK)

| Legacy | Count | Target |
|--------|------:|--------|
| Academic colleges (type 1) | 9 | college microsite |
| Directorates (types 2–3) | 8 | directorate template |
| KVK (type 4) | 20 | **confirm** office vs college |
| Research stations (type 9) | 8 | **confirm** |
| Programme / centre / admin / support / school / PG | 20 | mostly office portals |
| **Colleges/units total** | **65** | `ccshau_pages` |
| Departments active | **107** | dept pages under college |
| Faculty/staff active | **834** | `ccshau_page_staff` |

**Faculty by role:** Dean 15 · HOD 101 · Teaching 612 · Non-teaching 94 · Other 12

### Phase 3 — rich content (later)

| Legacy | Count | Notes |
|--------|------:|-------|
| `hau_cms` | **1,681** | Biggest QA load; sanitize HTML |
| Circulars + circular notifications | 22 + 787 | Circulars module |
| Gallery + detail | 72 + 1,267 | Media albums (file-heavy) |
| Awards | 41 | Content / awards |
| Menu + detail | 190 + 1,281 | Prefer gap-fill; don’t wipe new CMS menus |
| Quick links (cat 6) | 44 active | Related links / menus |
| Student Corner (cat 27) | 24 active | Optional |
| Media clips (cat 7) | **845** active | Defer until files exist |

### Skip / archive only

| Legacy | Why |
|--------|-----|
| `admins` (53, all status `0`) | No usable active CMS logins; **never import passwords** |
| `hau_visitor_count` (~798k) | Analytics — skip |
| Events / check-in / participation | Ephemeral / not public CMS |
| Form builders (`uap_leform_*`) | Out of scope |
| `hau_pgs_registration` (~1.6k) | CSV archive unless product needs it |

---

## 3. Mapping rules (final)

1. **Metadata-first** — import text/structure now; files when client shares uploads.  
2. **English first** — Hindi null; optional auto-translate later.  
3. **Slugify** + keep `legacy_id` for idempotent upsert / rollback.  
4. **Sanitize HTML** via existing CMS sanitizer.  
5. **No password import** — invite fresh Supabase Auth users.  
6. **Pre-import backup** — `npm run backup:pre-import` before every live phase.  
7. **Idempotent apply** — re-run safe; no duplicate rows on slug/legacy key.

---

## 4. Phased execution plan

### Phase 0 — Ready (done)

- [x] MySQL recheck after restore  
- [x] Dry-run with new counts  
- [x] Backup script available  
- [ ] Explicit go-ahead: “start Phase 1 metadata import”  
- [ ] Uploads path (can wait until Phase 4)

### Phase 1 — Quick wins (recommended first live pass)

Order: Social → homepage strips → banners (meta) → downloads (meta) → news/jobs → tenders  

**Exit criteria:** Public site shows real news/tenders/downloads/social; missing images/PDFs acceptable.

### Phase 2 — Org

1. 9 colleges + 8 directorates  
2. Remaining units after template confirm (KVK etc.)  
3. 107 departments  
4. Faculty: Dean + HOD + Teaching first; Non-teaching/Other optional  

**Exit:** College/department pages + staff lists (photo placeholders OK).

### Phase 3 — CMS & extras

- Priority `hau_cms` pages (or full 1,681 with batch QA)  
- Circulars, awards, gallery metadata, menu gaps  

### Phase 4 — Files

- Client uploads root / zip → `LEGACY_UPLOADS_ROOT` → dry-run file report → Storage upload → patch paths  

### Phase 5 — Auth & cutover

- Invite admins/editors  
- UAT sign-off per phase  
- Old `hau.ac.in` absolute file URLs will break when legacy host dies — Phase 4 mitigates  

---

## 5. Red flags (updated)

| Severity | Flag | Mitigation |
|----------|------|------------|
| **High** | No images/PDFs yet | Metadata-only Phases 1–2; Phase 4 later |
| **High** | **1,681** CMS HTML pages | Don’t dump all on day 1; priority list or staged batches |
| **High** | **845** media clips without files | Defer entirely until uploads |
| **Medium** | 65 mixed “colleges” (20 KVK etc.) | Client confirms templates before Phase 2 bulk |
| **Medium** | Demo/existing Supabase content collide | Decide **replace vs merge**; upsert by legacy id/slug |
| **Medium** | Legacy HTML points to `hau.ac.in/storage/...` | Works until old site dies; then broken links |
| **Medium** | All 53 admins status=`0` | Fresh Auth invites only |
| **Medium** | Non-teaching 94 + Other 12 | Optional import to avoid list noise |
| **Low** | Hindi empty | Acceptable v1 |
| **Low** | Menus already rebuilt | Gap-fill only |
| **Info** | Restore increased news/tenders slightly | Use **post-restore** dry-run as source of truth |

---

## 6. Client decisions needed

1. **Replace or merge** existing CMS demo content?  
2. KVK / research stations = **college** or **office** template?  
3. Import **Non-teaching** staff?  
4. `hau_cms`: **all** vs **priority list**?  
5. When will **uploads** folder arrive?  
6. Who UAT-signs each phase?

---

## 7. Commands

```powershell
$env:LEGACY_MYSQL_HOST="127.0.0.1"
$env:LEGACY_MYSQL_PORT="3306"
$env:LEGACY_MYSQL_USER="root"
$env:LEGACY_MYSQL_PASSWORD=""
$env:LEGACY_MYSQL_DATABASE="hau_db"

npm run dry-run
npm run backup:pre-import   # before any live write
```

---

## 8. Recommendation

| Question | Answer |
|----------|--------|
| Recheck after restore OK? | **Yes** — data slightly fresher; schema same |
| Import without files now? | **Yes** — Phase 1 (+ Phase 2 org) metadata-only |
| Start live automatically? | **No** — wait for explicit “start Phase 1 metadata import” |
| Best first live cut | Phase 1 only → backup → import → spot-check public site |

**Next message to unblock live work:** `start Phase 1 metadata import`
