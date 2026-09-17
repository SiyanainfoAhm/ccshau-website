# Hindi Translation Gap Report — Phase 1 Audit

Generated: 2026-09-01T04:00:21.749Z
Mode: published/open content only
Database: https://fvveqziyusjgqejowkfp.supabase.co

## Executive summary

| Metric | Count |
|--------|------:|
| Tables audited | 23 |
| English field instances (non-empty) | 13528 |
| Complete Hindi (Devanagari present) | 1866 |
| Missing Hindi | 11437 |
| Corrupt Hindi (????) | 0 |
| Hindi present but no Devanagari | 225 |
| **Total gaps** | **11662** |
| Coverage | 13.8% |

## Summary by category

| Category | Tables | EN fields | Gaps | Complete |
|----------|-------:|----------:|-----:|---------:|
| Pages | 1 | 5308 | 5042 | 266 |
| Faculty / staff | 2 | 3176 | 3171 | 5 |
| Office portal | 5 | 4316 | 2914 | 1402 |
| News | 1 | 351 | 307 | 44 |
| Downloads | 1 | 81 | 79 | 2 |
| Tenders | 1 | 92 | 66 | 26 |
| Media | 2 | 61 | 61 | 0 |
| Homepage | 2 | 28 | 14 | 14 |
| Menus | 2 | 92 | 5 | 87 |
| Circulars | 1 | 4 | 2 | 2 |
| Related links | 1 | 8 | 1 | 7 |
| Departments | 1 | 11 | 0 | 11 |

## Code / schema gaps (static audit)

| Severity | Location | Issue |
|----------|----------|-------|
| high | `apps/web/src/components/site/public-tenders-listing.tsx` | Tender listing shows titleEn only (line ~177); should use t(titleEn, titleHi ?? titleEn) |
| medium | `apps/web/src/components/site/public-tenders-listing.tsx` | Department filter shows nameEn only (line ~112) |
| medium | `apps/web/src/components/site/public-downloads-listing.tsx` | Department filter shows nameEn only (line ~104) |
| medium | `apps/web/src/components/site/public-media-album-grid.tsx` | Album grid captions and lightbox use titleEn only (lines ~137, ~213) |
| low | `apps/web/src/components/site/faculty-profile-dialog.tsx` | Publication list uses titleEn only (line ~94) |
| low | `apps/web/src/components/site/public-contact-page.tsx` | University name uses nameEn only (line ~103) |
| high | `ccshau_banners table` | No title_hi column — hero carousel cannot show Hindi title from DB |
| low | `ccshau_tender_corrigenda table` | English-only schema (no _hi columns) |
| low | `apps/web/src/lib/i18n/language-storage.ts` | SSR defaults to English; cookie not read server-side for initial render |

## Database audit errors (schema / migration)

| Table | Error |
|-------|-------|
| `ccshau_homepage_dignitaries` | ccshau_homepage_dignitaries: column ccshau_homepage_dignitaries.role_en does not exist |
| `ccshau_homepage_cta` | ccshau_homepage_cta: column ccshau_homepage_cta.title_en does not exist |
| `ccshau_page_staff` | ccshau_page_staff: relation "public.ccshau_page_staff" does not exist |

## Database detail by table

### `ccshau_departments` (Departments)

Rows scanned: **11**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| name_en / name_hi | 11 | 0 | 0 | 0 | 11 |

### `ccshau_pages` (Pages)

Rows scanned: **1779**
Filter: `status = published`

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 1779 | 1581 | 0 | 0 | 198 |
| content_en / content_hi | 1715 | 1685 | 0 | 1 | 29 |
| excerpt_en / excerpt_hi | 1774 | 1739 | 0 | 0 | 35 |
| head_name_en / head_name_hi | 20 | 18 | 0 | 0 | 2 |
| head_role_en / head_role_hi | 20 | 18 | 0 | 0 | 2 |

**Samples — title_en (missing):**
- `id=b48e7f4c-6e23-4331-93ea-2dbf297f7c03 slug=regional-research-stations page_type=college status=published layout_template=college_home` — EN: Regional Research stations
- `id=502e684b-0149-440a-b696-2a8a78037eaf slug=horticulture-research-farm-buria page_type=college status=published layout_template=office_portal` — EN: Horticulture Research Farm, Buria
- `id=c26fb37f-d449-4123-ac06-887aaad553e2 slug=directorate-of-research page_type=college status=published layout_template=college_home` — EN: Directorate of Research
- `id=b616277f-c96f-4d33-a24c-69d3e237b259 slug=thrust-area-14 page_type=standard status=published layout_template=standard` — EN: Thrust Area
- `id=3566451d-ec3f-470f-b81b-6b8461dcb99a slug=research-farm-balsamand page_type=college status=published layout_template=office_portal` — EN: RESEARCH FARM, BALSAMAND

**Samples — content_en (missing):**
- `id=656e0885-dd44-436f-808e-37082ac4f190 slug=bawal-department-49 page_type=standard status=published layout_template=standard` — EN: <p>Departments under REGIONAL RESEARCH STATION, BAWAL.</p>
- `id=b48e7f4c-6e23-4331-93ea-2dbf297f7c03 slug=regional-research-stations page_type=college status=published layout_template=college_home` — EN: 
<p>CCS HAU operates regional research stations and farms across Haryana to address location-specific research needs. Se
- `id=a244c513-e3a6-4037-9753-a6417f5e1b07 slug=karnal-department-47 page_type=standard status=published layout_template=standard` — EN: <p>Departments under REGIONAL RESEARCH STATION KARNAL.</p>
- `id=c257316a-dc04-46c5-a3e8-ee8d342416db slug=retiree-of-the-department page_type=standard status=published layout_template=standard` — EN: <p><strong>Retiree of the Department</strong></p>
<p>Legacy document <code>1735803025.pdf</code> — pending Phase 4 uploa
- `id=502e684b-0149-440a-b696-2a8a78037eaf slug=horticulture-research-farm-buria page_type=college status=published layout_template=office_portal` — EN: <table style="width:100%"><tbody><tr><td style="width:30%"><img src="https://hau.ac.in/storage/app/uploads/kQrGIOWIMDNC3

**Samples — content_en (no_devanagari):**
- `id=8df0586e-2730-4c18-8a7d-877d02f3df8e slug=pg-proforma page_type=standard status=published layout_template=standard` — EN: <p><strong>PG Proforma</strong></p>
<table class="w-full border-collapse text-sm">
<tbody>
<tr>
<td class="align-top pr-

**Samples — excerpt_en (missing):**
- `id=656e0885-dd44-436f-808e-37082ac4f190 slug=bawal-department-49 page_type=standard status=published layout_template=standard` — EN: Academic departments at REGIONAL RESEARCH STATION, BAWAL.
- `id=b48e7f4c-6e23-4331-93ea-2dbf297f7c03 slug=regional-research-stations page_type=college status=published layout_template=college_home` — EN: Regional Research stations — CCS HAU.
- `id=a244c513-e3a6-4037-9753-a6417f5e1b07 slug=karnal-department-47 page_type=standard status=published layout_template=standard` — EN: Academic departments at REGIONAL RESEARCH STATION KARNAL.
- `id=c257316a-dc04-46c5-a3e8-ee8d342416db slug=retiree-of-the-department page_type=standard status=published layout_template=standard` — EN: Retiree of the Department — CCS HAU.
- `id=502e684b-0149-440a-b696-2a8a78037eaf slug=horticulture-research-farm-buria page_type=college status=published layout_template=office_portal` — EN: Horticulture Research Farm, Buria — CCS HAU.

**Samples — head_name_en (missing):**
- `id=63798b58-0b9a-4243-bfc7-6e5f15d5e23f slug=directorate-of-students-welfare page_type=college status=published layout_template=college_home` — EN: Dr. M.L.Khichar
- `id=c26fb37f-d449-4123-ac06-887aaad553e2 slug=directorate-of-research page_type=college status=published layout_template=college_home` — EN: Dr. Rajbir Garg
- `id=f5b48a4b-debd-4b29-847b-3649aed2811b slug=college-of-agriculture-kaul page_type=college status=published layout_template=college_home` — EN: Dr. Mehar Chand
- `id=15b4a256-bda9-4908-8fe5-1af6076163ec slug=eo-cum-se page_type=college status=published layout_template=office_portal` — EN: Dr.Ajay Kumar Vashisht
- `id=04d51a49-a72c-4eb0-819d-bdd9d605bd69 slug=human-resource-management page_type=standard status=published layout_template=office_portal` — EN: Dr. Naresh Kaushik

**Samples — head_role_en (missing):**
- `id=63798b58-0b9a-4243-bfc7-6e5f15d5e23f slug=directorate-of-students-welfare page_type=college status=published layout_template=college_home` — EN: Director
- `id=c26fb37f-d449-4123-ac06-887aaad553e2 slug=directorate-of-research page_type=college status=published layout_template=college_home` — EN: Director
- `id=f5b48a4b-debd-4b29-847b-3649aed2811b slug=college-of-agriculture-kaul page_type=college status=published layout_template=college_home` — EN: Principal
- `id=15b4a256-bda9-4908-8fe5-1af6076163ec slug=eo-cum-se page_type=college status=published layout_template=office_portal` — EN: Estate Officer-cum-Chief Engineer
- `id=04d51a49-a72c-4eb0-819d-bdd9d605bd69 slug=human-resource-management page_type=standard status=published layout_template=office_portal` — EN: Director

### `ccshau_menu_items` (Menus)

Rows scanned: **88**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| label_en / label_hi | 88 | 0 | 0 | 5 | 83 |

**Samples — label_en (no_devanagari):**
- `id=4f19339c-58f3-4dd5-95b7-a2e87faa8667 menu_id=c96220e1-452b-4c58-9b59-ebc2a7dad2e5 href=https://hau.ac.in/page/ariia` — EN: ARIIA
- `id=cf1e9d89-2486-496c-b6f3-ccdc9be24718 menu_id=c96220e1-452b-4c58-9b59-ebc2a7dad2e5 href=https://hau.ac.in/page/online-statistical-analysis-tools-opstat` — EN: OPSTAT
- `id=36e004dc-846e-4955-8196-2cf8a60e2c68 menu_id=c96220e1-452b-4c58-9b59-ebc2a7dad2e5 href=https://agmoocs.in/` — EN: agMOOCs
- `id=07977d6f-bc83-4a4a-af67-5981fb9a169d menu_id=c96220e1-452b-4c58-9b59-ebc2a7dad2e5 href=https://hau.ac.in/college/agribusiness-incubation-centre` — EN: ABIC
- `id=8a7921eb-4e32-418b-84f4-9d74e29be2ff menu_id=c96220e1-452b-4c58-9b59-ebc2a7dad2e5 href=https://hau.ac.in/page/hauta` — EN: HAUTA

### `ccshau_menus` (Menus)

Rows scanned: **4**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| name_en / name_hi | 4 | 0 | 0 | 0 | 4 |

### `ccshau_news` (News)

Rows scanned: **304**
Filter: `status = published`

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 304 | 276 | 0 | 2 | 26 |
| body_en / body_hi | 47 | 27 | 0 | 2 | 18 |

**Samples — title_en (missing):**
- `id=ebdde88d-c041-44c0-8288-d837f58ad266 slug=constitute-the-following-college-purchase-committee-4273 status=published` — EN: Constitute the following College Purchase Committee
- `id=d0cbc728-3b8d-4cb7-84dd-8e3412bce28f slug=accreditation-team-in-cobsh-2023-4258 status=published` — EN: Accreditation Team in COBS&H -2023
- `id=468bef91-8eb9-42a5-b315-6f38552e009c slug=independence-day-celebration-campus-school-4435 status=published` — EN: Independence Day Celebration  Campus School
- `id=dc7514c3-8b2b-4464-9339-8dec5910ba69 slug=online-admission-portal-2025-26-4390 status=published` — EN: Online Admission Portal (2025-26)
- `id=99b2739b-9f56-43ca-a4b0-3487d5e7718e slug=mou-signing-ceremony-between-ccshu-and-warsaw-university-warsaw-poland-4257 status=published` — EN: MoU Signing Ceremony between CCSHU and Warsaw University, Warsaw, Poland

**Samples — title_en (no_devanagari):**
- `id=53b0c743-82c5-4b92-bbfa-96c80550f22b slug=admission-notice-2027 status=published` — EN: Admission notice 2027 COBSH
- `id=1c859f23-820b-49d7-811a-9a736eb091e6 slug=engineering-admission status=published` — EN: Engineering Admission

**Samples — body_en (missing):**
- `id=468bef91-8eb9-42a5-b315-6f38552e009c slug=independence-day-celebration-campus-school-4435 status=published` — EN: <p>Legacy link: <a href="https://hau.ac.in/page/independence-day">https://hau.ac.in/page/independence-day</a></p>
- `id=dc7514c3-8b2b-4464-9339-8dec5910ba69 slug=online-admission-portal-2025-26-4390 status=published` — EN: <p>Legacy link: <a href="https://admissions.hau.ac.in/">https://admissions.hau.ac.in/</a></p>
- `id=15b509e8-04c9-46aa-8d97-bb3b085513b8 slug=news-10-july status=published` — EN: news 10 July
- `id=edff0506-878e-4eb4-ae26-fa25fd95695b slug=prime-minister-internship-scheme-pmis-5542 status=published` — EN: <p>Legacy link: <a href="https://pminternship.mca.gov.in/login/">https://pminternship.mca.gov.in/login/</a></p>
- `id=a5dd9fa0-7685-4672-8818-494b12dcac60 slug=online-admission-2026-27-5522 status=published` — EN: <p>Legacy link: <a href="https://admissions.hau.ac.in/">https://admissions.hau.ac.in/</a></p>

**Samples — body_en (no_devanagari):**
- `id=b4471b25-2fe9-44ee-b866-ecd6575f32b3 slug=prime-minister-internship-scheme-pmis status=published` — EN: <a target="_blank" href="https://pminternship.mca.gov.in/login/">Prime Minister Internship Scheme (PMIS)</a>
- `id=1c859f23-820b-49d7-811a-9a736eb091e6 slug=engineering-admission status=published` — EN: Admission open from 1st August 2026 to 20th August 2026

### `ccshau_circulars` (Circulars)

Rows scanned: **4**
Filter: `status = published`

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 4 | 1 | 0 | 1 | 2 |

**Samples — title_en (missing):**
- `id=5ed97a49-a9f2-42aa-9b23-ff90c043fd79 circular_number=CIR/REG/2026/102 status=published` — EN: Circular 102

**Samples — title_en (no_devanagari):**
- `id=9f569330-4de9-4d5b-abe1-3034eb635003 circular_number=Comptroller  status=published` — EN: Comptroller 

### `ccshau_tenders` (Tenders)

Rows scanned: **79**
Filter: `status = open`

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 79 | 64 | 0 | 2 | 13 |
| description_en / description_hi | 13 | 0 | 0 | 0 | 13 |
| cancellation_notice_en / cancellation_notice_hi | 0 | 0 | 0 | 0 | 0 |

**Samples — title_en (missing):**
- `id=03e4161e-894f-489b-9c81-440f1b23c4a8 slug=auction-notice-rrs-karnal-5616 status=open` — EN: Auction Notice RRS Karnal
- `id=2006e2de-5ca8-48dd-994e-324a7e816da7 slug=tender-notice-estate-office-c-i-5617 status=open` — EN: Tender Notice Estate office C-I
- `id=01d5730c-7d98-45ee-b65b-589dd05f7d1f slug=sealed-quotations-are-invited-for-display-material-infrastructure-tentage-for-ag-5598 status=open` — EN: Sealed quotations are invited for Display material/ Infrastructure/ Tentage for AgroIndustrial Exhibition at Krishi Mela
- `id=02b58ae0-c12a-4e24-bb3d-eb9e1d9f4dbb slug=auction-notice-kvk-mandkola-5593 status=open` — EN: Auction Notice KVK Mandkola
- `id=2d428498-d467-40d5-b228-bc6ddcca8271 slug=auction-notice-kvk-krushetra-5574 status=open` — EN: Auction Notice KVK Krushetra

**Samples — title_en (no_devanagari):**
- `id=61c954c2-fbba-459e-8561-d23a219b26b0 slug=tender-test-1 status=open` — EN: Tender test 1
- `id=bbb264ef-b2d4-48ce-b916-7dcfa8602ae2 slug=auction-notice-cocs status=open` — EN: Auction notice COCS

### `ccshau_downloads` (Downloads)

Rows scanned: **81**
Filter: `status = published`

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 81 | 79 | 0 | 0 | 2 |

**Samples — title_en (missing):**
- `id=7847980b-3195-4232-8feb-1a6f14b50cc2 category=legacy-import status=published` — EN: Agromet Data Request Form
- `id=d894b351-8a63-450d-b574-6f5e2fae5bbc category=legacy-import status=published` — EN: Application for outside jobs/Assignments/Fellowships etc.
- `id=33e20dc8-5c0f-41dd-bc2e-c639f4b67d96 category=legacy-import status=published` — EN: Proforma for issue of NOC for passport
- `id=4d271cd6-e581-4dde-ac18-ff87d65cf875 category=legacy-import status=published` — EN: PG Grade Performa
- `id=376a79e3-4e88-44a5-afcf-8425a578e330 category=legacy-import status=published` — EN: Second half demand of funds in respect of AICRPs Scheme

### `ccshau_media_albums` (Media)

Rows scanned: **5**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 5 | 5 | 0 | 0 | 0 |

**Samples — title_en (missing):**
- `id=be6408cd-ec25-45e9-a087-f024d8cacc5f slug=legacy-gallery-2 status=published` — EN: Video Gallery
- `id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e slug=legacy-gallery-129 status=published` — EN: HAR GHAR TIRANGA
- `id=db5438e1-177b-431a-9876-203ec0d0e80b slug=legacy-gallery-130 status=published` — EN: Kisan Mela
- `id=f2f59ed8-4f90-4021-8901-f2ee3e69106c slug=legacy-gallery-139 status=published` — EN: New Education Policy
- `id=48e075fc-229d-4c53-ba45-e80dc23e939f slug=legacy-gallery-140 status=published` — EN: Governor Visit

### `ccshau_media_items` (Media)

Rows scanned: **28**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 28 | 28 | 0 | 0 | 0 |
| caption_en / caption_hi | 28 | 28 | 0 | 0 | 0 |

**Samples — title_en (missing):**
- `id=71933662-530c-4b0d-8469-9a7d1e9ee458 album_id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e` — EN: Gallery
- `id=73f2da52-1b56-4f5d-a1ad-26eb8f084fdb album_id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e` — EN: gallery
- `id=939afe29-7218-47bd-9d57-b014f954308e album_id=db5438e1-177b-431a-9876-203ec0d0e80b` — EN: Gallery
- `id=ddbd6bb1-bc62-4023-8407-c43a57e95d16 album_id=db5438e1-177b-431a-9876-203ec0d0e80b` — EN: Gallery
- `id=dd88776d-0ffd-48c1-8498-7cfbc074834e album_id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e` — EN: Gallery

**Samples — caption_en (missing):**
- `id=71933662-530c-4b0d-8469-9a7d1e9ee458 album_id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e` — EN: Photo
- `id=73f2da52-1b56-4f5d-a1ad-26eb8f084fdb album_id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e` — EN: Photo
- `id=939afe29-7218-47bd-9d57-b014f954308e album_id=db5438e1-177b-431a-9876-203ec0d0e80b` — EN: Photo
- `id=ddbd6bb1-bc62-4023-8407-c43a57e95d16 album_id=db5438e1-177b-431a-9876-203ec0d0e80b` — EN: Photo
- `id=dd88776d-0ffd-48c1-8498-7cfbc074834e album_id=1d7c92c2-aa4a-4190-9190-f1da2cab8a1e` — EN: Photo

### `ccshau_related_links` (Related links)

Rows scanned: **8**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 8 | 0 | 0 | 1 | 7 |

**Samples — title_en (no_devanagari):**
- `id=3806e2ce-81f1-4e59-94f5-0a4a23a2d3bc url=https://agmoocs.in/` — EN: agMOOCs

### `ccshau_homepage_quotes` (Homepage)

Rows scanned: **3**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| author_en / author_hi | 3 | 0 | 0 | 0 | 3 |
| quote_en / quote_hi | 3 | 0 | 0 | 0 | 3 |

### `ccshau_homepage_dignitaries` (Homepage)

Rows scanned: **0**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|

### `ccshau_homepage_initiatives` (Homepage)

Rows scanned: **11**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 11 | 7 | 0 | 0 | 4 |
| description_en / description_hi | 11 | 7 | 0 | 0 | 4 |

**Samples — title_en (missing):**
- `id=9d7d27a3-eccf-4f26-bf6e-970ed947c709 is_active=true` — EN: Skill Council of India
- `id=1e2c7a8d-9993-423d-9fc9-a1c682d8b656 is_active=true` — EN: Flagship 3
- `id=2c85b09f-32f5-4e78-b4c0-bb5624d48231 is_active=true` — EN: AGRIBUSINESS INCUBATION CENTRE (ABIC)
- `id=cd7c28a6-0c5e-4fa0-8f2c-0303f0d47798 is_active=true` — EN: Organic farming
- `id=3a969bc4-f326-4d66-88e0-6eaeac045a80 is_active=true` — EN: Experiential Learning Process

**Samples — description_en (missing):**
- `id=9d7d27a3-eccf-4f26-bf6e-970ed947c709 is_active=true` — EN: <p>Extension education is one of the three major functions of the CCS Haryana Agricultural University, Hisar. The respon
- `id=1e2c7a8d-9993-423d-9fc9-a1c682d8b656 is_active=true` — EN: <p>There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some for
- `id=2c85b09f-32f5-4e78-b4c0-bb5624d48231 is_active=true` — EN: <p>The agriculture and allied sector continues to be pivotal to the sustainable growth and development of the Indian eco
- `id=cd7c28a6-0c5e-4fa0-8f2c-0303f0d47798 is_active=true` — EN: <p>Consistent and indiscriminate use of inorganic fertilizers and pesticides has caused serious damage to the soil, ecol
- `id=3a969bc4-f326-4d66-88e0-6eaeac045a80 is_active=true` — EN: Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard 

### `ccshau_homepage_cta` (Homepage)

Rows scanned: **0**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|

### `ccshau_page_contact_lines` (Office portal)

Rows scanned: **212**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| label_en / label_hi | 212 | 0 | 0 | 0 | 212 |
| value_en / value_hi | 212 | 0 | 0 | 207 | 5 |

**Samples — value_en (no_devanagari):**
- `id=6b7bf78f-6c07-4904-bc89-92c9a796bace page_id=f46dfec8-5907-4b09-8acf-12b5238a3bb9` — EN: dcoaeg@hau.ac.in
- `id=e7157ce0-50d8-41f2-903c-fab4b1f3ec8f page_id=5258b71b-fcf9-4346-8165-f804c1c592a7` — EN: College of Biotechnology, CCS Haryana Agricultural University, Hisar-125004, Haryana (India).
- `id=367c9692-f090-46a2-a6e1-61f85c8f8deb page_id=5258b71b-fcf9-4346-8165-f804c1c592a7` — EN: Office : 0166255407
- `id=375851b5-a615-451d-8b15-39d4cba4f7f1 page_id=5258b71b-fcf9-4346-8165-f804c1c592a7` — EN: deanbiotech@hau.ac.in
- `id=146af3a5-3848-44ac-b561-dafc272e2c37 page_id=5aaec271-8c9b-4ff2-8217-a6c20866b3e9` — EN: 0184-2267857

### `ccshau_page_gallery_items` (Office portal)

Rows scanned: **1185**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 1182 | 1180 | 0 | 0 | 2 |

**Samples — title_en (missing):**
- `id=e065985d-a636-4a2d-8d40-579b96f10e9d page_id=49386b4a-fbda-4471-996a-7968086bd8e3` — EN: NCC
- `id=8d7cf8a6-a064-4626-9ff1-a72cafe354d9 page_id=49386b4a-fbda-4471-996a-7968086bd8e3` — EN: NCC
- `id=a20bb615-f05d-4989-b70e-bd3d9df1b425 page_id=49386b4a-fbda-4471-996a-7968086bd8e3` — EN: NCC
- `id=1ab5be18-df85-45dc-9a0d-c9c8a71f1148 page_id=49386b4a-fbda-4471-996a-7968086bd8e3` — EN: Gallery
- `id=d23de238-9448-4c21-9c71-4c44895910c8 page_id=49386b4a-fbda-4471-996a-7968086bd8e3` — EN: Gallery

### `ccshau_page_news_ticker_items` (Office portal)

Rows scanned: **212**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 212 | 211 | 0 | 0 | 1 |

**Samples — title_en (missing):**
- `id=5b9fad2c-2d5a-406f-b64d-32911715e074 page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: NCC Girls 2025-26
- `id=54708ac6-3a97-455a-bbd3-cfe39aaea71d page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: TRAININGS CONDUCTED UNDER CENRE OF ADVANCED FACULTY TRAINING PROGRAMME
- `id=32f9e7a9-a70d-42fe-9ded-afc51d557c53 page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: NIRF (COA)-2026
- `id=737f655b-0f50-4e08-ac40-f7b7cd3abf80 page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: Research Papers from College of Agriculture (NAAS Rating>7)
- `id=0fe33c88-0703-40d6-98df-e341340d0804 page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: Nomination of Nodal Officer for Anti Ragging Committee

### `ccshau_page_student_corner_items` (Office portal)

Rows scanned: **25**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| title_en / title_hi | 25 | 25 | 0 | 0 | 0 |

**Samples — title_en (missing):**
- `id=0f34e20b-f140-4f23-a7e6-919d2e0c065a page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: Feedback Form for UG Students
- `id=fa6edcaf-fc4d-40b6-93f8-79f693063354 page_id=555239b2-bc8f-468b-82da-4592879e865b` — EN: Under Graduate Course Catalogue -2025
- `id=9abc43cf-e14a-4768-85f4-f0ca96cec0e8 page_id=f5b48a4b-debd-4b29-847b-3649aed2811b` — EN: Students in take 2025-26
- `id=07031562-e743-43b8-bf8c-ba6e4721a976 page_id=f5b48a4b-debd-4b29-847b-3649aed2811b` — EN: Student on Roll (2018-19 to 2022-23)
- `id=bc37dba7-2eeb-439c-b9d1-d56c554d58a4 page_id=f5b48a4b-debd-4b29-847b-3649aed2811b` — EN: Time table (2nd Semester 2023 -24) - Revised - I

### `ccshau_page_sidebar_items` (Office portal)

Rows scanned: **1622**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| label_en / label_hi | 1622 | 445 | 0 | 4 | 1173 |
| content_en / content_hi | 851 | 842 | 0 | 0 | 9 |

**Samples — label_en (missing):**
- `id=ede3cd26-8b26-4684-9edc-b66a2fe6ab97 page_id=6d775969-a631-41fb-a78f-3c2618327bd0` — EN: List of Patent/IPRs Filed
- `id=85ebac56-5fb5-4b7e-a802-73931d1abfd6 page_id=e902d154-5d77-4feb-8bc3-926ac04237f9` — EN: Event
- `id=b86283f1-b0cb-4089-9cd1-519296cdc900 page_id=116100d3-8028-4272-8718-feca946e67b3` — EN: Status of Revolving Fund
- `id=c4b60c0d-4b5f-4e24-a787-e86a8fc9cfd5 page_id=8fdb1d2e-9978-4135-b82e-5fec175fe3c3` — EN: Publications
- `id=796ba3bf-bf2c-4190-8904-c7bb0b9ce5c2 page_id=e9692fc8-0000-4105-a622-8bdadb54bf8e` — EN: Alumni of the Department

**Samples — label_en (no_devanagari):**
- `id=2c51da3f-489a-48da-9798-954ea49aa7eb page_id=47e309dd-e6d4-4857-a1fc-1ff45c665fb6` — EN: FInal seniorty lists of HAU & LUVAS Employees 2026
- `id=395ade43-93e8-44c9-9154-36c01540998b page_id=47e309dd-e6d4-4857-a1fc-1ff45c665fb6` — EN: Amendment in House Allotment Rules
- `id=dd793c29-ae41-4df7-840c-ec8a79e229b3 page_id=47e309dd-e6d4-4857-a1fc-1ff45c665fb6` — EN: Landscape Unit Pay Bill for Month of 12/2015 paid in 01/2016
- `id=205cc785-1af9-45a8-a760-9e9df53fad32 page_id=47e309dd-e6d4-4857-a1fc-1ff45c665fb6` — EN: Application Form for the Allotment of House in CCSHAU, Hisar

**Samples — content_en (missing):**
- `id=30713d7a-a49d-4a51-9e4a-c5523d3686a1 page_id=f5fadf19-0d05-4f2f-8c64-3c495afde3df` — EN: <a href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/1687837122.pdf" rel="noopener noreferrer" target
- `id=ede3cd26-8b26-4684-9edc-b66a2fe6ab97 page_id=6d775969-a631-41fb-a78f-3c2618327bd0` — EN: <a href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/1715666527.pdf" rel="noopener noreferrer" target
- `id=442c8198-99b2-4ede-ac1f-e69944800b70 page_id=2cbbf7d7-c54c-4cd7-8ca7-9e131bd77cd1` — EN: <p><a href="https://hau.ac.in/college/nehru-library" rel="noopener noreferrer" target="_blank"><span style="font-size:18
- `id=85ebac56-5fb5-4b7e-a802-73931d1abfd6 page_id=e902d154-5d77-4feb-8bc3-926ac04237f9` — EN: <a href="https://www.hau.ac.in/public/pages-pdf/1778140315.pdf" rel="noopener noreferrer" target="_blank"><span style="f
- `id=37f9d7bf-a68c-4e25-af99-623119ee83c2 page_id=5d364b79-2c02-4c42-b708-8cf78cf092b8` — EN: <div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/biWvSGnaWc

### `ccshau_page_staff` (Faculty / staff)

Rows scanned: **0**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|

### `ccshau_faculty_people` (Faculty / staff)

Rows scanned: **660**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| name_en / name_hi | 660 | 658 | 0 | 0 | 2 |
| qualification_en / qualification_hi | 576 | 576 | 0 | 0 | 0 |
| experience_en / experience_hi | 0 | 0 | 0 | 0 | 0 |
| specialization_en / specialization_hi | 579 | 578 | 0 | 0 | 1 |
| detail_content_en / detail_content_hi | 491 | 490 | 0 | 0 | 1 |

**Samples — name_en (missing):**
- `id=39b8bfd3-0d0e-43be-934b-dc74748bf35d global_slug=legacy-user-251` — EN: Dr. S. K. Tehlan
- `id=d56ebb64-1e27-4ec7-af06-8fbad4789aae global_slug=legacy-user-1161` — EN: Dr. Padmanabha A
- `id=7f595dbe-9aa0-4930-b6e9-dca23e80b7cc global_slug=legacy-user-389` — EN: Dr. Sandeep Arya
- `id=6665f242-9013-43c4-89c4-23f3a283a048 global_slug=legacy-user-488` — EN: Subhash Chander
- `id=49b5352a-78a8-46f4-9f10-9cfc3a72de43 global_slug=legacy-user-338` — EN: Dr. Prakash Banakar

**Samples — qualification_en (missing):**
- `id=39b8bfd3-0d0e-43be-934b-dc74748bf35d global_slug=legacy-user-251` — EN: Ph.D
- `id=d56ebb64-1e27-4ec7-af06-8fbad4789aae global_slug=legacy-user-1161` — EN: Ph.D
- `id=7f595dbe-9aa0-4930-b6e9-dca23e80b7cc global_slug=legacy-user-389` — EN: Ph.D
- `id=6665f242-9013-43c4-89c4-23f3a283a048 global_slug=legacy-user-488` — EN: Ph. D.
- `id=49b5352a-78a8-46f4-9f10-9cfc3a72de43 global_slug=legacy-user-338` — EN: Ph.D.

**Samples — specialization_en (missing):**
- `id=39b8bfd3-0d0e-43be-934b-dc74748bf35d global_slug=legacy-user-251` — EN: Vegetable Breeding
- `id=d56ebb64-1e27-4ec7-af06-8fbad4789aae global_slug=legacy-user-1161` — EN: Aquatic Environment Management
- `id=7f595dbe-9aa0-4930-b6e9-dca23e80b7cc global_slug=legacy-user-389` — EN: Agroforestry
- `id=6665f242-9013-43c4-89c4-23f3a283a048 global_slug=legacy-user-488` — EN: Plant Breeding & Biotechnology
- `id=49b5352a-78a8-46f4-9f10-9cfc3a72de43 global_slug=legacy-user-338` — EN: Molecular Nematology & Nematode and Host Plant interaction

**Samples — detail_content_en (missing):**
- `id=39b8bfd3-0d0e-43be-934b-dc74748bf35d global_slug=legacy-user-251` — EN: <table><tbody><tr><td><u><strong>Research Papers</strong></u></td></tr><tr><td><br></td><td><ol><li><strong>Kumar, S.</s
- `id=d56ebb64-1e27-4ec7-af06-8fbad4789aae global_slug=legacy-user-1161` — EN: <p style="text-align:center;"><strong><span style='font-size:16px;font-family:"Times New Roman","serif";'>Dr.Padmanabha 
- `id=7f595dbe-9aa0-4930-b6e9-dca23e80b7cc global_slug=legacy-user-389` — EN: <table style="width: 100%;"><tbody><tr><td colspan="9" style="vertical-align: top; text-align: center;" width="100%"><st
- `id=6665f242-9013-43c4-89c4-23f3a283a048 global_slug=legacy-user-488` — EN: <table style="width: 100%;"><tbody><tr><td colspan="14" style="vertical-align: top;text-align: center;" width="100%"><st
- `id=49b5352a-78a8-46f4-9f10-9cfc3a72de43 global_slug=legacy-user-338` — EN: <table style="width: 100%;"><tbody><tr><td colspan="14" style="vertical-align: top;text-align: center;" width="100%"><st

### `ccshau_faculty_assignments` (Faculty / staff)

Rows scanned: **753**

| Field pair | EN filled | Missing HI | Corrupt | No Devanagari | Complete |
|------------|----------:|-----------:|--------:|--------------:|---------:|
| designation_en / designation_hi | 753 | 752 | 0 | 0 | 1 |
| specialization_en / specialization_hi | 117 | 117 | 0 | 0 | 0 |

**Samples — designation_en (missing):**
- `id=0a3783e2-670f-45ab-836f-b1d1cc9abb2f person_id=900830c4-df0a-4b63-bb4d-1f5243c30b27 page_id=de1ebc96-38a1-443e-b4c4-045135a1add8` — EN: Professor
- `id=655a1a6b-bf4b-47d1-8a24-c491133cf6ab person_id=5abcbd45-524d-46d8-b01d-9ca35ce56c26 page_id=2e2f7f9b-44b7-43bb-84ed-41c3470fd701` — EN: Professor
- `id=4bf5d769-a1e8-4c45-8216-8fcf5bb254f1 person_id=49b5352a-78a8-46f4-9f10-9cfc3a72de43 page_id=57840010-e5f8-48c9-84fc-f2880b69d56b` — EN: Assistant Professor (Stage II)
- `id=16b3d792-9223-4da7-be55-aa89166ad480 person_id=5f6073b7-f64e-4a73-b297-842e42a0e179 page_id=7e8c978c-b51a-466f-b322-bc7106cc9479` — EN: Asstt. Economic Botanist
- `id=d272b593-7f54-447a-8435-8d143459761d person_id=6665f242-9013-43c4-89c4-23f3a283a048 page_id=310e1b02-0595-4182-ae4f-b5677d9ef4de` — EN: Junior Breeder

**Samples — specialization_en (missing):**
- `id=f10a6f41-de4f-4102-bfa1-08faa5aa02a9 person_id=25312b20-62fc-43c8-9636-de8dd209de79 page_id=6d775969-a631-41fb-a78f-3c2618327bd0` — EN: Plant Breeding
- `id=7f96efef-d79c-4899-9186-1d23034b4748 person_id=60b972d8-2018-4f95-9c40-614573337afa page_id=8bb7b80b-5f5d-409c-ae4e-0aaf6490e00c` — EN: Agronomy
- `id=f1203348-94b3-4d2c-b080-bb9921d8ea53 person_id=9adaa5c9-1dba-4cef-bc46-ccde9109d306 page_id=8bb7b80b-5f5d-409c-ae4e-0aaf6490e00c` — EN: Plant Pathology
- `id=e53f0bfe-2ade-4be4-99d0-46e1f2bd89f9 person_id=101e3883-ed8d-41cc-a7c4-e234da38091d page_id=246ec376-09d2-495e-9bc2-86998cb0a3da` — EN: Agronomy, Resource conservation technologies
- `id=60f3cf13-c1d5-431a-ba66-98991ed39c9d person_id=fd91ae7f-2600-459a-b133-ddeaaa4a4653 page_id=e1d034ce-8b48-437a-8b80-048af2dc872b` — EN: Soil Science

---

## Recommended Phase 2 priorities

1. Fix code gaps: tenders listing, media album captions, banners schema
2. Backfill menus + homepage (high visibility, smaller volume)
3. Backfill published pages by college slug
4. Backfill news, tenders, downloads
5. Backfill office portal sidebars + faculty/staff

Re-run: `node scripts/ops/audit-hindi-gaps.mjs` or add `--published-only`
