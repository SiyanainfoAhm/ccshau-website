# CCSHAU Official University Website — Development Plan

**Project:** Development, Migration, Security Audit and Implementation of Official University Website  
**Client:** Chaudhary Charan Singh Haryana Agricultural University (CCSHAU), Hisar  
**Current Website:** [https://hau.ac.in/](https://hau.ac.in/)  
**Document Version:** 1.6  
**Prepared On:** 23 June 2026  
**Last Updated:** 23 June 2026  
**Architecture Status:** **FINALIZED — Option B** (Next.js + Supabase)  
**Infrastructure:** Supabase Cloud ✅ | Vercel ✅ | **Power Automate** (email) ✅ | Analytics ⏸️ **on hold**  
**Development Status:** **Phase 4 🔄 In progress** (Sprint 4 done — polish largely complete)  
**Purpose:** Technical planning, internal estimation, project execution planning and development roadmap

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Source Documents Reviewed](#2-source-documents-reviewed)
3. [RFP Scope Overview](#3-rfp-scope-overview)
4. [Current Website Analysis](#4-current-website-analysis)
5. [Gap Analysis Summary](#5-gap-analysis-summary)
6. [Target Platform Requirements](#6-target-platform-requirements)
7. [Finalized Technology Stack — Option B](#7-finalized-technology-stack--option-b)
8. [Functional Module Scope](#8-functional-module-scope)
9. [Development Phases (Detailed)](#9-development-phases-detailed)
10. [Work Breakdown Structure (WBS)](#10-work-breakdown-structure-wbs)
11. [User Stories Summary](#11-user-stories-summary)
12. [Deliverables and Acceptance Criteria](#12-deliverables-and-acceptance-criteria)
13. [Team Structure](#13-team-structure)
14. [Time Estimates](#14-time-estimates)
15. [Risks, Assumptions and Clarifications](#15-risks-assumptions-and-clarifications)
16. [Out of Scope](#16-out-of-scope)
17. [Project Governance](#17-project-governance)
18. [Suggested Execution Order](#18-suggested-execution-order)
19. [Acceptance Checklist](#19-acceptance-checklist)
20. [Recommended Next Steps](#20-recommended-next-steps)
21. [Phase Progress Tracker](#21-phase-progress-tracker)

---

## 1. Executive Summary

The RFP is for **complete re-platforming** of the existing CCSHAU official university website to a modern, secure, bilingual, responsive, database-driven and content-managed website. The work includes requirement study, UI/UX design, development, content migration, security audit support, cloud hosting, Go-Live, training, source-code handover and post Go-Live AMC/support.

| Item | Detail |
|------|--------|
| **RFP Owner** | Director (Store & Purchase), CCSHAU, Hisar |
| **Approximate Value** | Rs. 9.0 lakh (DNIT amount) |
| **Primary Objective** | Complete migration, conversion and upgrade of existing CCS HAU official website to a new platform using latest technologies, GOI guidelines, security standards and accessibility norms |
| **Success Criteria** | Re-platforming within timelines; minimum 90% successful data migration; 99% functionality compliance; cross-browser compatibility and error-free operation |
| **AMC** | Post Go-Live support (2–3 years — clarification required) |
| **Current Phase** | **Phase 4 🔄 In progress** — Sprint 3 done; polish & pagination next |
| **Finalized Platform** | **Option B:** Next.js (frontend + API layer) + Supabase PostgreSQL + Supabase Auth + Supabase Storage |
| **Hosting (confirmed)** | **Next.js → Vercel** | **Database/Auth/Storage → Supabase Cloud** |
| **Analytics** | ⏸️ **On hold** — deferred to post-Go-Live or Phase 2; see Section 7.10 |
| **Email (confirmed)** | **Microsoft Power Automate** — sends all transactional emails via university flow |

### Overall Finding (Gap Analysis)

The existing website at [https://hau.ac.in/](https://hau.ac.in/) already has university identity, public navigation, news, tenders, media gallery, contact directory and multiple quick links. However, the RFP requires a substantially more governed, searchable, accessible, secure, bilingual and CMS-driven platform.

**Most important gaps:** Content governance, bilingual CMS workflow, search/discovery, accessibility tools, tender/corrigendum archive, URL/SEO management, secure role-based admin, audit logging, backup/rollback and handover documentation.

---

## 2. Source Documents Reviewed

| # | Document | Location | Purpose | Status |
|---|----------|----------|---------|--------|
| 1 | `202716651.pdf` | `Documents/` | Original RFP (20 pages) | Scanned PDF — not machine-readable; use scope extract |
| 2 | `CCSHAU_RFP_Scope_of_Work.pdf` | `Documents/` | RFP scope extract | Full functional, technical, admin and visitor requirements |
| 3 | `CCSHAU_Website_Gap_Analysis as per scope (1).pdf` | `Documents/` | Current vs required analysis | 22 gaps (G-01 to G-22) with Critical/High/Medium priorities |
| 4 | `SOW, WBS and Study (1).pdf` | `Documents/` | Execution planning document | WBS (12 work streams), 34 user stories, deliverables D1–D13 |

### Public Pages Reviewed for Gap Analysis

| Page | URL | Review Focus |
|------|-----|--------------|
| Home | https://hau.ac.in/ | Header, navigation, content sections, quick links, footer |
| Latest News | https://hau.ac.in/latest-news | Listing structure and content lifecycle |
| Tenders/Auctions | https://hau.ac.in/tenders | Tender listing, archive, corrigendum |
| Contact Us | https://hau.ac.in/contact-us | Contact directory and feedback routing |

---

## 3. RFP Scope Overview

### 3.1 Work to be Completed

Development, migration, security audit and implementation of the official university website with cloud hosting and AMC services post Go-Live.

### 3.2 General Requirement

The selected firm shall be responsible for complete migration, conversion and upgradation of the existing CCS HAU official website to a new platform using latest technologies. The solution must comply with Government of India guidelines, security standards and accessibility norms.

### 3.3 Broad Scope of Work

1. Design and develop a **bilingual website** in Hindi and English as per Government of India guidelines.
2. Implement a **database-driven architecture** on cloud hosting.
3. Provide a **responsive layout** for mobile, tablet, desktop and projector views.
4. Implement **URL rewriting** with an SEO-friendly structure.
5. **Migrate complete content** from the existing website to the new website.
6. Provide facility to create **temporary event-based portals** (youth festival, conferences, seminars, convocations, short-term courses) through the admin panel.
7. Provide capability for **dynamic addition of new web pages**.
8. Write, restructure and standardize content wherever required.
9. Provide complete support for **security audit** of the software/website.

### 3.4 Functional and Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance** | Optimized loading time, high performance, caching/lazy loading and mobile responsiveness |
| **UI/UX** | Professional UI/UX design; modern features including dark/light mode, drag-and-drop page elements, header/footer manager and zoom in/out functionality |
| **Content Management** | Dynamic CMS for non-technical users — page creation, content update, restructuring and standardization |
| **Access Control** | User and role-based access control with department-wise login facility for content updates |
| **SEO** | SEO-friendly architecture with metadata support, URL rewriting, URL mapping and redirection to retain SEO ranking |
| **Accessibility** | Compliance with accessibility standards and special accessibility tools for differently abled persons/users |
| **Search** | Full-text search for all pages and documents, plus global search across all sections |
| **Security** | Robust website security, secure login, HTTPS/JWT/CAPTCHA/RBAC and support for security audit |
| **Analytics** | Visitor counter and analytics |
| **Branding** | Website should reflect organization identity with sustainable, clean, efficient and resilient design |
| **Integration** | Social media platforms; translation plug-in such as Google Translator where applicable |
| **URL Privacy** | Internal URLs should be hidden except for the domain name |

### 3.5 RFP Timeline Baseline

| Activity | Timeline |
|----------|----------|
| UI/UX Design | 1 week |
| Core Development | 1 month |
| Testing and Quality Assurance | 1 week |
| Data Shifting and Go-Live | 2 weeks |
| **Total (RFP)** | **~7 weeks** |

> **Note:** The RFP timeline is very aggressive for the full scope. A realistic estimate is 16–21 weeks with a dedicated team of 6–8 people. See [Section 14](#14-time-estimates).

---

## 4. Current Website Analysis

### 4.1 What Exists Today

The current public website at [https://hau.ac.in/](https://hau.ac.in/) includes:

- Bilingual university name in header (Hindi + English)
- Email login and Faculty login links
- Large navigation: Administration, Academics, Directorates, Colleges, Campus Life, Awards, Nehru Library, etc.
- Homepage carousel/banner slider
- About HAU section
- Latest News and Notifications sections
- Education At University (college cards)
- Media Gallery (Photo Gallery, Video Gallery)
- Tenders/Auctions, Recruitment, News tabs
- Flagships section
- Partners section
- Quick Links panel (Self Service Portal, e-Governance, ARIIA, Online Fee Submission, etc.)
- Footer with contact, about links, social media
- Search entry in header
- Contact Us page with office-wise phone numbers and email IDs

### 4.2 Current Website Observations

| Observation Area | Current Website Observation |
|------------------|----------------------------|
| **Homepage structure** | Public site shows bilingual university name, email/faculty login, contact link, search entry, large navigation, carousel, about section, latest news, education cards, media gallery, notifications, tenders/auctions, flagships, partners, footer and quick links |
| **Content listing style** | Latest News and Tenders/Auctions appear as long list-based pages with mixed item types (notices, tenders, work orders, recruitment, admissions, conferences, external links) |
| **Footer and currency signal** | Footer displays Copyright 2018 and Designed by Drish Infotech Ltd. — strong signal of legacy design/maintenance status |
| **External and IP-based links** | Quick Links include external services and direct IP-based links such as Digital Downloads Portal at 14.139.232.173 and IQAC/APAR form at 192.168.2.174 |
| **Content quality** | Visible typo/quality issues: IMOPRTANT LINKS, University Calander, Recuirtment/Govement in visible site text |
| **Contact directory** | Contact Us provides office-wise phone numbers and email IDs, but no dynamic enquiry routing, feedback ticketing or department-specific submission workflow |
| **Bilingual** | Header has Hindi + English, but no clearly visible full English/Hindi toggle or complete bilingual content workflow |
| **Accessibility** | No visible accessibility toolbar, dark/light mode, font zoom, contrast controls, skip links or screen-reader aids |
| **Search** | Search entry visible, but no advanced full-text search, document search, filters or result ranking |
| **Tenders** | Long flat list; active and older items together; no category-wise listing, corrigendum linking, expiry handling or automatic archival |
| **Admin/CMS** | Faculty login exists, but no public evidence of department-wise CMS login, content owner metadata or approval workflow |

---

## 5. Gap Analysis Summary

### 5.1 Priority Definitions

| Priority | Meaning |
|----------|---------|
| **Critical** | Must be included in base scope and implementation baseline |
| **High** | Important for compliance and quality; should be included as differentiating items |
| **Medium** | Useful enhancement or can be phased but should be promised in method statement |

### 5.2 Detailed Gap Matrix

| ID | RFP Requirement | Current Observation | Gap / Risk | Recommended Action | Priority |
|----|-----------------|---------------------|------------|-------------------|----------|
| G-01 | Modern platform and UI/UX | Legacy pages; footer Copyright 2018 | Brand perception and usability gap | Redesign visual system, IA, templates, component library | **Critical** |
| G-02 | Bilingual English/Hindi interface | Partial bilingual in header only | May not satisfy separate EN/HI landing and CMS workflow | Bilingual content model with language toggle, Unicode Hindi, translation workflow | **Critical** |
| G-03 | Responsive and accessibility compliance | No accessibility toolbar or WCAG tools | Accessibility compliance risk for GOI expectations | WCAG-aligned UI, keyboard nav, skip links, alt text, ARIA, font resize, contrast, dark/light mode | **Critical** |
| G-04 | SEO-friendly URL and URL mapping | Some links are /page/home; IP/subdomain/external URLs | SEO dilution, broken-link risk | URL taxonomy, SEO slugs, canonical URLs, 301 redirect map | **High** |
| G-05 | Full-text search | Basic search box only | Users struggle to find notices, circulars, downloads, tenders | Global indexed search across pages, PDFs, notices, tenders with filters | **Critical** |
| G-06 | Tenders with category/corrigendum/archive | Long flat list, no archive | Does not meet RFP tender module requirements | Tender CMS with category, status, dates, corrigendum, attachments, auto-archive | **Critical** |
| G-07 | Latest News/Notifications lifecycle | Long mixed lists, no metadata hierarchy | Stale items may remain visible | Publish/expiry dates, category, department, priority, archive, approval workflow | **High** |
| G-08 | Department-wise login and content ownership | Faculty login only; no CMS evidence | Departments dependent on central IT | Department user roles, content owner/source fields, maker-checker approval, audit log | **Critical** |
| G-09 | Role-based access control | No visible role matrix | Unauthorized publishing risk | Granular RBAC, permissions by module/department, secure provisioning | **Critical** |
| G-10 | Secure admin login controls | Cannot verify from public pages | Security compliance gap | HTTPS, CAPTCHA, lockout after 5 attempts, email alert, session timeout, audit logging | **Critical** |
| G-11 | Content migration and restructuring | Content across many pages, PDFs, external portals | 90% migration target needs inventory | Content inventory, migration tracker, deduplication, rewrite plan, metadata tagging | **Critical** |
| G-12 | Content writing and standardization | Spelling/label inconsistencies visible | Reduces trust | Editorial style guide, proofreading checklist, label taxonomy, content QA | **High** |
| G-13 | Media gallery and event archive | Basic photo/video sections | No structured event archive workflow | Event CMS with galleries, press releases, videos, calendar, tags, archive search | **High** |
| G-14 | Banner/campaign management | Homepage carousel only | Manual update dependency | Banner manager with start/end dates, priority, target URL, alt text | **Medium** |
| G-15 | Download/document management | Many document-like quick links | Document duplication, poor searchability | Download CMS with category, version, tags, expiry, search indexing | **High** |
| G-16 | Analytics and visitor counter | Not visible on public pages | Cannot measure usage | Analytics, visitor counters, dashboard reports, privacy-conscious tracking | **Medium** |
| G-17 | Performance optimisation | Many images and long blocks | Slow loading on mobile/rural networks | Image optimisation, lazy loading, caching, CDN, compressed assets | **High** |
| G-18 | External/IP link governance | Private IP links visible (192.168.2.174) | Broken links; unprofessional | Replace IP links with managed domains/proxy; link health checks | **High** |
| G-19 | Feedback system | Contact page only; no feedback workflow | Unstructured visitor feedback | Feedback module with department routing, ticket number, status tracking | **High** |
| G-20 | Audit logs and security logs | No public evidence | Low accountability | Audit log, access log, publish history, failed login log, incident log export | **Critical** |
| G-21 | Backup/DR and rollback | No evidence of backup process | Operational continuity risk | Automated backups, retention, restore test, rollback checklist, DR runbook | **Critical** |
| G-22 | Training and documentation | No CMS training resources visible | Post-Go-Live adoption risk | Admin manual, quick reference guides, department training plan, handover pack | **Medium** |

---

## 6. Target Platform Requirements

### 6.1 Admin Dashboard Scope

| Feature | Requirement |
|---------|-------------|
| **Secure Login** | Username/password encryption, login attempt monitoring, password reset/email notification after five consecutive wrong attempts |
| **Role Management** | Role-based access for departments, sections and user categories |
| **Metadata and SEO** | Facility to add metadata, titles and tags for all content |
| **Content Ownership** | Each content item includes source and content owner details |
| **Hierarchy** | Main links, sub-links and multi-level links supported |
| **Latest News** | Section for adding/modifying official notices, corrigendum and cancellations |
| **Circulars and Gallery** | Management of circulars and event photographs |
| **Downloads** | Facility to add, delete and modify downloadable files |
| **Responsive Admin** | Admin dashboard accessible from all devices |

### 6.2 Visitor Section Scope

| Feature | Requirement |
|---------|-------------|
| **Landing page** | Separate English and Hindi language interface |
| **Unicode Hindi** | Mangal Unicode font with browser fallback guidance |
| **Media centre** | Press releases, photos, videos and event calendar with archival mechanism |
| **Tenders** | Category-wise tender listings with corrigendum and automatic archival |
| **Related links** | Government and institutional links |
| **Banners** | Campaign banners and university programmes |
| **Feedback** | General or department-wise visitor feedback |
| **Charts/Infographics** | As per Government of India norms |
| **Global search** | Across all sections and documents |

### 6.3 Technical Scope (RFP Baseline)

| Component | RFP Requirement |
|-----------|-----------------|
| **Frontend** | React.js with modular, scalable, responsive design and accessibility support (HTML5, CSS3, JavaScript) |
| **Backend** | Laravel PHP / Python framework with secure modular MVC/API architecture |
| **Database** | PostgreSQL / MySQL with reliable scalability and backup support |
| **Security Layer** | HTTPS, JWT, CAPTCHA, role-based authorization, content moderation |
| **Hosting** | Cloud hosting (Windows or Linux — clarification required) |
| **Browser Compatibility** | Latest Chrome, Firefox, Edge and Safari |
| **Monitoring and Logs** | Audit logs, access logs and security incident logs |

### 6.3.1 Selected Implementation (Finalized — Option B)

| Component | Selected Technology | Notes |
|-----------|---------------------|-------|
| **Frontend** | Next.js 14+ (React, App Router) | Public site + admin CMS UI; SSR/SSG for SEO |
| **API / Business Logic** | Next.js Route Handlers + Server Actions + Supabase Edge Functions (where needed) | Replaces separate Laravel/Python backend |
| **Database** | Supabase PostgreSQL | Managed Postgres with migrations, backups, connection pooling |
| **Authentication** | Supabase Auth (JWT) + server-side session validation + CAPTCHA on login | Admin users only; public site is anonymous |
| **File Storage** | Supabase Storage | Circulars, tenders, downloads, media gallery assets |
| **Search** | PostgreSQL full-text search (`tsvector`) + optional Meilisearch | Indexed across pages, news, tenders, documents |
| **Security Layer** | HTTPS, RLS on exposed tables, server-only service role for admin writes, CAPTCHA, RBAC in app layer | See Section 7.5 |
| **Hosting** | Next.js on Vercel/AWS/Azure + Supabase Cloud (Mumbai region) or self-hosted Supabase | Linux-based; confirm with client |
| **Cache** | Next.js caching + Supabase connection pooler | Redis optional for high-traffic scaling |
| **CI/CD** | GitHub Actions / GitLab CI | Build, test, deploy Next.js; Supabase CLI for migrations |

### 6.4 Implementation Approach (RFP)

- Submit **three design layouts** for approval before development
- Content standardized per GOI accessibility and security guidelines
- Modular implementation for future enhancements
- API and database performance optimized
- **Weekly progress reports** to Incharge, Computer Section, CCS HAU Hisar
- Development plan may be modified based on directions from Incharge during execution

---

## 7. Finalized Technology Stack — Option B

> **Decision:** Option B is the approved architecture for this project.  
> **Stack:** Next.js (frontend + API layer) + Supabase PostgreSQL + Supabase Auth + Supabase Storage.  
> **Coding status:** Not started — implementation begins only after explicit client go-ahead.

### 7.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    PUBLIC VISITORS / ADMIN USERS                  │
│              (Mobile / Tablet / Desktop / Projector)              │
└─────────────────────────────┬────────────────────────────────────┘
                              │
               ┌──────────────▼──────────────┐
               │         Next.js 14+          │
               │  ┌────────────────────────┐  │
               │  │ Public Site (SSR/SSG)  │  │
               │  │ Admin CMS Dashboard    │  │
               │  │ Route Handlers / API   │  │
               │  │ Server Actions         │  │
               │  └────────────────────────┘  │
               └──────────────┬──────────────┘
                              │ Server-side only (service role)
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐        ┌──────▼──────┐       ┌──────▼──────┐
   │ Supabase │        │  Supabase   │       │  Supabase   │
   │ Postgres │        │    Auth     │       │   Storage   │
   │   (DB)   │        │   (JWT)     │       │   (Files)   │
   └──────────┘        └─────────────┘       └─────────────┘
        │
   ┌────▼─────────────────────────────┐
   │  Edge Functions (scheduled jobs)  │
   │  tender archive, email alerts     │
   └──────────────────────────────────┘
```

**Key principle:** Admin CMS writes and sensitive operations go through **Next.js server API** using the Supabase **service role** key (never exposed to the browser). Public reads use SSR/SSG with optimized queries. Direct browser → PostgREST is **not** used for admin operations.

### 7.2 Technology Stack (Final)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend (Public)** | Next.js 14+ App Router (React) | SEO-friendly SSR/SSG, bilingual routing, responsive UI |
| **Frontend (Admin CMS)** | Next.js 14+ (same codebase, `/admin` routes) | Unified codebase; role-protected admin area |
| **API / Business Logic** | Next.js Route Handlers + Server Actions | CMS rules, RBAC, CAPTCHA, audit logging, validation |
| **Scheduled Jobs** | Supabase Edge Functions + `pg_cron` | Auto-archive tenders/news, email alerts |
| **Database** | Supabase PostgreSQL | RFP-compliant Postgres; migrations, backups, pooling |
| **Authentication** | Supabase Auth + JWT | Secure admin login, password reset, session management |
| **Authorization** | App-layer RBAC + PostgreSQL RLS (defense in depth) | Department-wise content access |
| **File Storage** | Supabase Storage | PDFs, images, downloads, media gallery |
| **Search** | PostgreSQL FTS (`tsvector`) + optional Meilisearch | Global search across pages, documents, tenders |
| **Analytics** | ⏸️ **On hold** — not in initial build; Matomo preferred when resumed | Visitor counter + admin reports deferred |
| **Hosting (App)** | **Vercel** (confirmed) | Next.js deployment with CDN |
| **Hosting (Data)** | **Supabase Cloud** (confirmed) | PostgreSQL, Auth, Storage |
| **CI/CD** | GitHub Actions + Supabase CLI | App deploy + database migration pipeline |

### 7.3 Layer Responsibilities

| Responsibility | Handled By | Notes |
|----------------|------------|-------|
| Public page rendering (SSR/SSG) | Next.js | Home, news, tenders, departments, bilingual pages |
| Admin CMS UI | Next.js (`/admin`) | Dashboard, forms, tables, media picker |
| CMS business logic (publish, approve, archive) | Next.js Server Actions / Route Handlers | All write operations server-side |
| Admin authentication | Supabase Auth | Email/password login; JWT tokens |
| Login CAPTCHA + 5-attempt lockout | Next.js API route | Verify CAPTCHA; track attempts in DB |
| Admin email alert on lockout | Next.js API → Power Automate flow | Email to super admin after 5 failures |
| Department RBAC | Next.js middleware + `ccshau_user_roles` table | Super admin, dept admin, editor, viewer |
| Content CRUD (pages, news, tenders, etc.) | Next.js API → Supabase Postgres | Service role key on server only |
| File upload/download | Next.js API → Supabase Storage | Validated file types and sizes |
| Audit logs | Postgres `ccshau_audit_logs` table + triggers | Login, content changes, uploads, failed attempts |
| Auto-archive expired content | `pg_cron` or scheduled Edge Function | Tenders, news with expiry dates |
| Global search | Postgres FTS or Meilisearch | Indexed at publish time |
| URL redirects (legacy → new) | Next.js `middleware` + `redirects` config | 301 map for SEO retention |
| Database schema & migrations | Supabase CLI (`supabase migration`) | Version-controlled SQL migrations |
| Backups | Supabase automated backups | Weekly DB + storage; pre-Go-Live rollback copy |

### 7.4 RFP Compliance Mapping

| RFP Requirement | Option B Implementation |
|-----------------|-------------------------|
| React.js frontend | Next.js (React) |
| PostgreSQL database | Supabase PostgreSQL |
| Secure modular API | Next.js Route Handlers + Server Actions |
| JWT authentication | Supabase Auth (JWT) |
| CAPTCHA | Server-side verification on login route |
| RBAC / department login | `ccshau_profiles`, `ccshau_departments`, `ccshau_user_roles` tables + middleware |
| HTTPS | Enforced on Next.js host + Supabase |
| Audit / access / security logs | Postgres tables + server logging |
| File management | Supabase Storage with bucket policies |
| Cloud hosting | Supabase Cloud + Next.js host (Linux) |
| Source code handover | Next.js repo + Supabase SQL migrations + env documentation |
| Weekly backups | Supabase automated backup schedule |

> **RFP note:** Tender mentions Laravel/Python as examples. Option B satisfies the intent (secure modular framework + PostgreSQL + JWT) using Next.js as the application layer. Document this mapping in the technical proposal.

### 7.5 Security Model

| Control | Implementation |
|---------|----------------|
| **HTTPS** | SSL on Next.js deployment and Supabase project |
| **JWT** | Supabase Auth issues JWT; validated server-side on every admin request |
| **CAPTCHA** | Google reCAPTCHA or hCaptcha on admin login form |
| **Login lockout** | Track failed attempts in `ccshau_login_attempts` table; lock after 5; email super admin |
| **Session timeout** | Configurable idle timeout in Next.js middleware |
| **RBAC** | Role checks in Server Actions before any DB write |
| **RLS** | Enabled on all `public` schema tables as defense in depth |
| **Service role** | `SUPABASE_SERVICE_ROLE_KEY` — server environment only, never `NEXT_PUBLIC_` |
| **File upload validation** | MIME type, size limits, virus scan (optional) on server before Storage upload |
| **CSRF** | Next.js Server Actions built-in protection |
| **Input validation** | Zod schemas on all API inputs |
| **Audit trail** | Every CMS write logged with user, IP, action, timestamp |

### 7.6 What Does NOT Use Direct Browser → Supabase API

The following **must** go through Next.js server layer (not exposed PostgREST from browser):

1. All admin CMS write operations (create, update, publish, delete)
2. Role and permission checks (department RBAC)
3. Maker-checker / approval workflows
4. Tender corrigendum linking and auto-archive rules
5. CAPTCHA verification and login lockout logic
6. Audit log writes
7. File upload with validation
8. Content migration scripts
9. Analytics admin dashboard data

Public read-only content is fetched server-side during SSR/SSG for performance and security.

### 7.7 Hosting & Deployment Plan

| Component | Environment | Hosting |
|-----------|-------------|---------|
| Next.js app | Development | Local (`localhost:3000`) |
| Next.js app | Staging / UAT | **Vercel** preview deployments |
| Next.js app | Production | **Vercel** (confirmed) |
| Supabase | Development | Supabase local (`supabase start`) or dev cloud project |
| Supabase | Staging / UAT | Separate Supabase Cloud project |
| Supabase | Production | **Supabase Cloud — Mumbai (ap-south-1)** (confirmed) |
| Analytics | Production | ⏸️ **On hold** — Matomo or GA4 to be decided later |

**Handover includes:** Next.js source repo, all Supabase SQL migration files, `.env.example`, deployment runbook, Supabase project export instructions.

### 7.8 Alternatives Considered (Not Selected)

| Option | Description | Why Not Selected |
|--------|-------------|------------------|
| **Option A** | Supabase auto-API only (browser → PostgREST + RLS) | Insufficient for complex CMS RBAC, security audit, CAPTCHA/lockout |
| **Option C** | Supabase DB + Laravel API | Extra backend to maintain; Laravel not required if Next.js handles API layer |

### 7.9 Infrastructure Decisions (Confirmed)

| Decision | Status | Detail |
|----------|--------|--------|
| **Supabase** | ✅ Confirmed | Supabase Cloud (PostgreSQL + Auth + Storage) |
| **Next.js hosting** | ✅ Confirmed | Vercel (preview + production) |
| **Analytics** | ⏸️ **On hold** | Deferred — Matomo (preferred when resumed) or GA4; see Section 7.10 |
| **Email / Power Automate** | ✅ Confirmed | Microsoft Power Automate for all outbound emails — see Section 7.11 |

### 7.10 Analytics — On Hold (Deferred)

> **Status: ⏸️ ON HOLD** — Analytics and visitor counter are **not included in the initial development phase**. Decision on Matomo vs GA4 and implementation timeline to be confirmed later with CCSHAU IT. RFP visitor-counter requirement will be addressed when analytics is resumed.

**When resumed, recommended approach:** Matomo (self-hosted) — see notes below.

#### Scope impact while on hold

| Item | Initial build | When analytics resumes |
|------|---------------|------------------------|
| Visitor counter on homepage | Not implemented (or static placeholder) | Matomo API or server-side counter |
| Admin analytics dashboard | Not implemented (or empty “coming soon”) | Matomo dashboard embed or custom reports |
| Matomo / GA4 integration | Skipped | Add tracking script + admin views |
| RFP G-16 (analytics gap) | Accepted deferral — document in UAT exceptions | Close in Phase 2 / post-Go-Live |

#### Reference — Matomo vs GA4 (for when decision resumes)

| Factor | Matomo (self-hosted) | Google Analytics 4 |
|--------|----------------------|---------------------|
| **Data ownership** | Data stays on university infrastructure | Data processed by Google |
| **Government / university fit** | Preferred for Indian govt sites | May need extra approvals |
| **Visitor counter (RFP)** | Built-in | Less direct |
| **Privacy** | Full control | Third-party cookies / cross-border data |

**Preferred when resumed:** Matomo self-hosted at e.g. `analytics.hau.ac.in`.

**GA4 when to use instead:** Only if CCSHAU IT mandates Google for all university sites.

### 7.11 Email — Microsoft Power Automate (Confirmed)

**Decision:** CCSHAU uses **Microsoft Power Automate** to send emails — not direct SMTP from the website.

Power Automate is Microsoft’s workflow automation service. The website does **not** connect to an SMTP server directly. Instead, **Next.js calls a Power Automate flow** (HTTP trigger), and the flow sends email using the university’s **Office 365 / Outlook** connector.

#### Emails required by this project (RFP)

| # | Email type | When it is sent | Recipient |
|---|------------|-----------------|-----------|
| 1 | **Password reset** | Admin clicks “Forgot password” | That admin user’s email |
| 2 | **Login lockout alert** | 5 failed login attempts on admin account | Super admin / Computer Section email |
| 3 | **New admin user welcome** (optional) | Super admin creates a new CMS user | New user’s email with set-password link |
| 4 | **Feedback notification** (optional) | Visitor submits department feedback | Department contact email |

**Minimum for RFP compliance:** items **1** and **2**.

#### How it works in Option B stack

```
┌─────────────────┐     HTTPS POST (JSON)      ┌──────────────────────┐
│  Next.js API    │ ─────────────────────────► │  Power Automate Flow │
│  (Vercel)       │     + shared secret header  │  (HTTP trigger)      │
└─────────────────┘                             └──────────┬───────────┘
                                                           │
                                                           ▼
                                                ┌──────────────────────┐
                                                │ Send email (V2)      │
                                                │ Office 365 Outlook   │
                                                └──────────┬───────────┘
                                                           │
                                                           ▼
                                                Recipient inbox (@hau.ac.in)
```

**Flow:**
1. Website event occurs (e.g. password reset requested).
2. Next.js Server Action / API route builds a JSON payload.
3. App POSTs to the Power Automate **HTTP trigger URL**.
4. Flow validates request (optional shared key in header).
5. Flow sends email via **Send an email (V2)** (Outlook / Office 365).
6. Flow returns success/failure to the app.

#### Supabase Auth + Power Automate (password reset)

Supabase Auth’s default password-reset emails expect **SMTP in Supabase dashboard**. Since CCSHAU uses Power Automate, use a **custom reset flow**:

| Step | Handler |
|------|---------|
| User submits email on “Forgot password” | Next.js Server Action |
| Generate secure reset link | Supabase Admin API (`auth.admin.generateLink`) |
| Send email with link | Power Automate flow |
| User clicks link and sets new password | Next.js reset page + Supabase Auth |

Supabase built-in “send reset email” is **not** used; only Power Automate sends mail.

#### Recommended Power Automate flows to create

| Flow name | Trigger | Action |
|-----------|---------|--------|
| `CCSHAU-Web-PasswordReset` | HTTP request | Send reset link email to user |
| `CCSHAU-Web-LoginLockout` | HTTP request | Alert Computer Section / super admin |
| `CCSHAU-Web-NewUserWelcome` | HTTP request | Welcome + set-password link (optional) |
| `CCSHAU-Web-FeedbackNotify` | HTTP request | Notify department on new feedback (optional) |

> **Alternative:** One generic flow `CCSHAU-Web-SendEmail` with a `templateType` field in JSON — simpler to maintain if IT prefers a single flow.

#### Example HTTP request payload (from Next.js)

```json
{
  "templateType": "password_reset",
  "toEmail": "admin@hau.ac.in",
  "toName": "Dr. Example",
  "subject": "CCSHAU Website — Password Reset",
  "resetLink": "https://hau.ac.in/admin/reset-password?token=...",
  "requestedAt": "2026-06-23T10:30:00Z",
  "ipAddress": "203.0.113.1"
}
```

**Login lockout example:**

```json
{
  "templateType": "login_lockout",
  "toEmail": "computer.section@hau.ac.in",
  "subject": "CCSHAU Website — Admin Login Lockout Alert",
  "attemptedEmail": "admin@hau.ac.in",
  "attemptCount": 5,
  "ipAddress": "203.0.113.1",
  "lockedAt": "2026-06-23T10:35:00Z"
}
```

#### What CCSHAU IT / Power Automate admin must provide

| Item | Description |
|------|-------------|
| **HTTP trigger URL** | One URL per flow (or one shared flow URL) |
| **Shared secret** | API key in header e.g. `X-CCSHAU-Webhook-Key` for security |
| **From address** | Official sender e.g. `noreply@hau.ac.in` or `webportal@hau.ac.in` |
| **Alert recipient list** | Email(s) for login lockout notifications |
| **Email templates** | HTML/text templates inside Power Automate per `templateType` |
| **Environment** | Dev + Production flow URLs (separate flows recommended) |

#### Security requirements

| Control | Implementation |
|---------|----------------|
| **HTTPS only** | All calls to Power Automate over TLS |
| **Webhook secret** | Validate `X-CCSHAU-Webhook-Key` in flow (condition step) |
| **Server-side only** | Flow URLs and secrets in Vercel env vars — never `NEXT_PUBLIC_` |
| **Rate limiting** | Limit reset requests per IP/email in Next.js |
| **No PII in logs** | Do not log full reset tokens or passwords |
| **IP logging** | Include IP in lockout alert payload for audit |

#### Environment variables (when coding starts)

```env
# Power Automate — server-side only (Vercel environment variables)
POWER_AUTOMATE_EMAIL_URL=https://prod-xx.westus.logic.azure.com/workflows/.../triggers/manual/paths/invoke?...
POWER_AUTOMATE_WEBHOOK_SECRET=********

# Optional: separate URLs per flow
POWER_AUTOMATE_PASSWORD_RESET_URL=...
POWER_AUTOMATE_LOCKOUT_ALERT_URL=...

# Default alert recipient (if not in flow)
ADMIN_ALERT_EMAIL=computer.section@hau.ac.in
```

#### Advantages for CCSHAU

| Benefit | Detail |
|---------|--------|
| **Existing infrastructure** | Uses university Microsoft 365 / Power Automate already in use |
| **No SMTP credentials in app** | Website only holds webhook URL + secret |
| **IT control** | Computer Section owns flows, templates, and sender accounts |
| **Audit trail** | Power Automate run history for each email |
| **RFP compliance** | Meets password reset and admin alert requirements |

#### Fallback (only if Power Automate unavailable)

If a flow is down during development, use a **dev-only** mock or temporary Resend/SMTP — **production must use Power Automate** as confirmed.

### 7.12 Clarifications Still Required

| Area | Status | Question |
|------|--------|----------|
| Supabase hosting | ✅ Done | Project `fvveqziyusjgqejowkfp` connected |
| Next.js hosting | ✅ Done | Vercel |
| Analytics | ⏸️ On hold | Matomo or GA4 — deferred; not blocking initial Go-Live |
| Email | ✅ Done | **Microsoft Power Automate** — need flow URLs + webhook secret from IT |
| Power Automate setup | ⏳ Pending | Flow URLs, shared secret, from-address, lockout recipient list |
| AMC Duration | ⏳ Pending | 2 years or 3 years post Go-Live? |
| Security Audit | ⏳ Pending | Formal third-party certificate or vendor-led VA? |

### 7.13 Database Naming Convention — CCSHAU_ Prefix (Mandatory)

All application database objects **must** use the **`CCSHAU_` prefix**:

| Object | Pattern | Example |
|--------|---------|---------|
| Tables | `CCSHAU_<entity>` | `CCSHAU_departments` → `ccshau_departments` |
| Functions | `CCSHAU_<name>` | `CCSHAU_set_updated_at` |
| Triggers | `CCSHAU_trg_<table>_<event>` | `CCSHAU_trg_pages_update` |
| RLS policies | `CCSHAU_pol_<table>_<action>` | `CCSHAU_pol_pages_select` |
| Indexes | `CCSHAU_idx_<table>_<columns>` | `CCSHAU_idx_news_published_at` |

- **PostgreSQL** stores unquoted names as lowercase (`ccshau_*`).
- **TypeScript:** use `Tables` and `Functions` from `apps/web/src/lib/database/names.ts`.
- **Migrations:** `supabase/migrations/20260623110000_ccshau_naming_convention.sql`
- **Documentation:** `docs/database-naming-convention.md`
- **Exceptions:** Supabase managed schemas (`auth.*`, `storage.*`) — no prefix.

---

## 8. Functional Module Scope

| Module | Scope Description |
|--------|-------------------|
| **Public Home Page** | Responsive home with branding, announcements, banners, quick links, news/notices, events, media highlights, search |
| **Bilingual Interface** | English/Hindi switch, Unicode Hindi, browser fallback guidance |
| **Dynamic Pages** | CMS-driven pages with title, slug, metadata, content owner, department/category, publish status |
| **Department Pages** | Department-wise pages via department-level logins and role permissions |
| **Notices/Latest News** | Official notices, corrigendum, cancellations with add/edit/archive controls |
| **Circulars** | Document upload, metadata, search and archival capability |
| **Tenders** | Category-wise listing, corrigendum mapping, closing/expiry date, automatic archival |
| **Media Centre** | Press releases, photos, videos, events calendar with archive mechanism |
| **Downloads** | File management with categorization and search indexing |
| **Banners/Campaigns** | Campaign banner placement for university programmes |
| **Related Links** | Government and institutional links section |
| **Feedback** | General and department-wise feedback submission with admin review |
| **Global Search** | Search across pages, sections and documents |
| **Visitor Counter/Analytics** | ⏸️ On hold — deferred to post-Go-Live / Phase 2 |
| **Accessibility Tools** | Font size/zoom, dark/light mode, special tools for differently abled users |
| **Admin Security** | Secure login, failed attempt monitoring, password reset, admin email alert |
| **Role Management** | Super admin, department admin, content editor, viewer categories |
| **Metadata & SEO** | Metadata, title, tag, SEO-friendly URL and redirect mapping |
| **Audit Logs** | Audit logs, access logs and security incident logs |
| **Event Portals** | Temporary event-based portals (youth festival, conferences, seminars, convocations) via admin |

### Module-wise Recommended Features

| Module | Feature Coverage |
|--------|------------------|
| **Public Website** | Home, About, Administration, Academics, Directorates, Colleges, Campus Life, Awards, News, Notifications, Tenders, Downloads, Media Gallery, Events, Contact, Feedback, Quick Links |
| **CMS Admin** | Secure login, role management, department ownership, content approval, page builder, menu manager, header/footer manager, metadata/SEO, media manager, audit logs |
| **News/Notifications** | Category, department, source, publish date, expiry date, pinned items, priority, attachments, archive, public search/filter |
| **Tender/Corrigendum** | Categories, details, documents, corrigendum, cancellation, open/closed status, automatic archive, public filter/search |
| **Downloads/Documents** | Category, department, tags, version, metadata, upload history, public/private flag, expiry, indexed search |
| **Bilingual Content** | English/Hindi fields, Unicode Hindi, translation status, fallback rules, bilingual menu labels and page templates |
| **Accessibility** | Keyboard navigation, alt text management, skip-to-content, font size, contrast, dark/light mode, screen-reader labels |
| **Security/Operations** | HTTPS, CAPTCHA, password policy, lockouts, JWT/session security, audit logs, backup, restore, monitoring |

---

## 9. Development Phases (Detailed)

### Phase 0 — Discovery & Project Setup ✅ Done
**Duration: 1 week** | **Completed: 23 June 2026** | **Status: ✅ Done**

| Task | Output | Status |
|------|--------|--------|
| Kick-off meeting with Computer Section and stakeholders | Project charter, contact matrix | ⏳ Pending (CCSHAU) |
| Collect legacy website access, sitemap, hosting/DNS, CMS/export access | Access checklist and content source list | ⏳ Partial — Supabase ✅ |
| RFP scope baseline review and clarification tracker | Scope baseline document | ✅ Done |
| Content inventory — catalogue pages, documents, media, departments, notices, tenders | Content inventory and migration matrix | ✅ Template done — data pending |
| Define RBAC matrix (super admin, dept admin, editor, viewer) | RBAC matrix approved by client | ✅ Draft done — approval pending |
| Set up Dev, Staging/UAT, Production environments | Configured environments and repository | ✅ Done |
| Prepare communication plan, risk register, weekly reporting format | Project governance documents | ✅ Done |

**Phase 0 technical deliverables completed:**
- Next.js app scaffolded (`apps/web`) — Vercel-ready
- Supabase Cloud connected — project `fvveqziyusjgqejowkfp`
- Migration applied: `ccshau_schema_meta`, `ccshau_set_updated_at()`
- `CCSHAU_` naming convention documented and enforced
- Governance docs in `docs/phase-0/`
- Health API verified: `/api/health` → `supabase: connected`

**Exit Criteria:** Requirement study report approved (Deliverable D1) — **draft complete**; formal CCSHAU sign-off pending

**Reference:** `docs/phase-0/README.md`, `docs/phase-0/supabase-setup.md`

---

### Phase 1 — Information Architecture & UI/UX Design
**Duration: 1–2 weeks** *(RFP baseline: 1 week)* | **Status: ✅ Done (23 Jun 2026)** — **Layout approved: Option B — Agri Future**

| Task | Output | Status |
|------|--------|--------|
| Define navigation hierarchy — main links, sub-links, multi-level links | IA / sitemap document | ✅ Done — `docs/phase-1/sitemap.md` |
| Prepare **three design layout options** (RFP mandatory) | Three UI/UX design layouts | ✅ Done — `/design/option-a`, `b`, `c` |
| Design homepage, listing pages, detail pages, tender pages, contact/feedback | Responsive page templates | ✅ Done — Option B templates |
| Design system — typography, spacing, components, bilingual behavior, accessibility controls | Design system / component library | ✅ Done — `docs/phase-1/design-system.md` |
| Include dark/light mode, font zoom, contrast tools in design | Accessibility-friendly design | ✅ Done — accessibility toolbar |
| Client review and approval of one layout | Signed-off design before development | ✅ Done — **Option B — Agri Future** (`docs/phase-1/approved-layout.md`) |

**Phase 1 technical deliverables completed:**
- Design gallery at `/design` with 3 interactive homepage prototypes
- **Option A** — Heritage Premium (`/design/option-a`)
- **Option B** — Agri Future **✅ APPROVED** (`/design/option-b`) — news ticker, Ken Burns hero, bento quick links, VC spotlight
- **Option C** — Clean Ministry (`/design/option-c`)
- Option B inner pages: news listing, news detail sample, tenders, contact
- Bilingual EN/HI toggle, dark mode, font zoom, skip link
- Docs: `docs/phase-1/README.md`, `sitemap.md`, `design-system.md`

**Exit Criteria:** One approved UI/UX layout (Deliverable D2) — **✅ Option B approved**; formal CCSHAU signatory pending

**Reference:** `docs/phase-1/README.md`, `docs/phase-1/approved-layout.md` — preview at http://localhost:3000/design/option-b

---

### Phase 2 — Technical Architecture & Database Design
**Duration: 1 week** | **Status: ✅ Done (23 Jun 2026)** — IT architecture approval pending

| Task | Output | Status |
|------|--------|--------|
| Design Option B architecture — Next.js + Supabase (DB, Auth, Storage) | Technical architecture document | ✅ Done — `docs/phase-2/architecture.md` |
| Design normalized PostgreSQL schema (Supabase migrations) | Database schema and SQL migration files | ✅ Done — `docs/phase-2/database-schema.md`, migrations |
| Design Next.js API routes and Server Actions for CMS modules | API specification document | ✅ Done — `docs/phase-2/api-spec.md` |
| Define Supabase Storage bucket structure (public/private) | Storage policy document | ✅ Done — `docs/phase-2/storage-policy.md` |
| Define URL taxonomy and legacy URL redirect plan | SEO slug structure and redirect map | ✅ Done — `docs/phase-2/url-redirect-plan.md` |
| Set up Supabase project (dev) + Next.js repo + CI/CD pipeline | Dev environment ready | ✅ Done — migrations applied to Supabase Cloud (`fvveqziyusjgqejowkfp`) |

**Phase 2 deliverables:**
- `docs/phase-2/README.md` — phase overview
- 20 `ccshau_*` tables, 8 enums, RLS policies, audit/search/archive functions
- Seed: 6 departments, 3 menu shells, 6 starter redirects
- TypeScript types: `apps/web/src/lib/database/types.ts`

**Exit Criteria:** Technical architecture document approved (Deliverable D3) — **docs complete**; formal IT approval pending

**Reference:** `docs/phase-2/README.md`

---

### Phase 3 — Admin Dashboard & CMS Development
**Duration: 3–4 weeks** | **Status: ~90% complete (23 Jun 2026)** — core modules done; role admin & related links pending

| Module | Features | Status |
|--------|----------|--------|
| **Security** | Auth login, CAPTCHA (dev bypass), lockout, audit on login | ✅ Done |
| **RBAC** | `ccshau_user_roles`, middleware, Server Action guards | ✅ Done |
| **Page CMS** | Create/edit/publish, bilingual fields, slug, metadata | ✅ Done |
| **News/Notices** | CRUD, attachments, publish workflow | ✅ Done |
| **Tenders** | CRUD, corrigenda, archive status | ✅ Done |
| **Circulars** | CRUD, PDF upload, publish | ✅ Done |
| **Downloads** | CRUD, categorized documents, publish | ✅ Done |
| **Media centre** | Albums, cover + item upload (photo/video) | ✅ Done |
| **Banners** | Image upload, scheduling, priority | ✅ Done |
| **Menu Manager** | Header/footer/quick links, multi-level nav | ✅ Done |
| **Feedback Admin** | Inbox, status workflow, remarks | ✅ Done |
| **Audit Logs** | Write on CMS actions; viewer UI (super admin) | ✅ Done |
| **User/role admin UI** | Assign roles via admin screen | ⏳ Pending |
| **Related links CMS** | `ccshau_related_links` management | ✅ Done |
| **Settings** | URL redirects admin, shortcuts | ✅ Partial — role admin pending |
| **Analytics Admin** | ⏸️ On hold | — |

**Admin routes:** `/admin`, `/admin/login`, `/admin/pages/*`, `/admin/news/*`, `/admin/tenders/*`, `/admin/circulars/*`, `/admin/downloads/*`, `/admin/media/*`, `/admin/banners/*`, `/admin/menus/*`, `/admin/feedback/*`, `/admin/audit`, `/admin/settings`  
**Reference:** `docs/phase-3/README.md`

**Exit Criteria:** CMS functional for all modules (Deliverable D4) — **core modules done**; role admin, related links, settings remain

---

### Phase 4 — Public Website Development
**Duration: 3–4 weeks** | **Status: 🔄 In progress (23 Jun 2026)** — Sprint 2 done

| Module | Features | Status |
|--------|----------|--------|
| **Home Page** | Banners, news ticker, quick links, media gallery | ✅ CMS for about, colleges, quick links, partners |
| **Bilingual Interface** | EN/HI toggle, Unicode Hindi rendering | ✅ Toggle + persistence |
| **Dynamic Pages** | CMS-driven pages via `/pages/[slug]` | ✅ Done |
| **News/Notifications** | Filtered listings, detail, attachments | ✅ Done — paginated (15/page) |
| **Circulars** | Searchable list with PDF download | ✅ Done |
| **Tenders** | Status filter, detail, corrigenda, attachments | ✅ Done |
| **Downloads** | Categorized, searchable repository | ✅ Done |
| **Media Centre** | Album grid, detail gallery (photo/video) | ✅ Done — event calendar pending |
| **Feedback** | Contact form, validation, ticket number | ✅ Done |
| **Related Links** | Government and institutional links section | ✅ Done |
| **Global Search** | Indexed search across pages, news, tenders, circulars | ✅ Done |
| **URL Redirects** | Legacy `hau.ac.in` → new URLs | ✅ Done |
| **Accessibility Toolbar** | Font size, zoom, dark/light mode, skip links | ✅ Done (design system) |
| **Visitor Counter** | ⏸️ On hold — deferred with analytics module | — |
| **Event Portals** | Temporary event microsites via admin | ⏳ Pending |

**Public routes:** `/`, `/news/*`, `/tenders/*`, `/circulars`, `/downloads`, `/media/*`, `/search`, `/contact`, `/pages/[slug]`  
**Reference:** `docs/phase-4/README.md`

**Exit Criteria:** Responsive bilingual public website live on staging (Deliverable D5) — **core routes done**; search, redirects, related links, homepage CMS polish remain

---

### Phase 5 — Content Migration & Quality Assurance
**Duration: 2–3 weeks**

| Task | Output |
|------|--------|
| Automated and manual content extraction from legacy site | Migration scripts and data dumps |
| Restructure and standardize content layout, headings, metadata | Standardized content |
| Apply editorial style guide — fix typos, label taxonomy | Content QA report |
| Tag content with owner, department, category, SEO metadata | Metadata-enriched content |
| Migrate documents, circulars, media, notices, tenders | Migrated assets |
| Map old URLs to new URLs; configure 301 redirects | URL redirect map |
| Department-by-department validation and sign-off | Migration validation report |
| Achieve minimum 90% successful migration target | Migration tracker with exceptions log |

**Exit Criteria:** Migration validation report with ≥90% success (Deliverable D6)

---

### Phase 6 — Security, Performance & Compliance
**Duration: 1–2 weeks**

| Area | Actions |
|------|---------|
| **Security** | Input validation, output encoding, CSRF protection, secure file upload validation, content moderation, hide internal URLs |
| **Security Audit Support** | Vulnerability assessment, fix critical/high issues, hardening report | 
| **Performance** | Image optimization, lazy loading, caching (Redis), CDN for static assets, DB query optimization, compressed assets |
| **Accessibility** | WCAG checklist validation, keyboard navigation, alt text, contrast ratios, screen-reader labels |
| **SEO** | Metadata on all pages, canonical URLs, XML sitemap, robots.txt, 301 redirects verified |

**Exit Criteria:** Security hardening report (D8) and SEO/accessibility/performance closure (D7)

---

### Phase 7 — Testing & UAT
**Duration: 1–2 weeks** *(RFP baseline: 1 week)*

| Test Type | Coverage |
|-----------|----------|
| **Functional** | All 34 user stories (US-01 to US-34) |
| **Responsive** | Mobile, tablet, desktop, projector breakpoints |
| **Cross-browser** | Chrome, Firefox, Edge, Safari (latest versions) |
| **Migration** | Redirect verification, broken link scan, content accuracy sampling |
| **Security** | Login lockout, RBAC restrictions, upload validation, session timeout |
| **Performance** | Page load time targets on desktop and mobile |
| **Accessibility** | Keyboard nav, font resize, dark/light mode, screen-reader compatibility |
| **UAT** | University users validate all public and admin features; defects logged and resolved |

**Exit Criteria:** UAT sign-off from University (Deliverable D9)

---

### Phase 8 — Deployment, Go-Live & Stabilization
**Duration: 1–2 weeks** *(RFP baseline: 2 weeks for data shift + Go-Live)*

| Task | Output |
|------|--------|
| Provision/configure cloud hosting (SSL, DNS coordination) | Production environment |
| Deploy application, database, environment configuration | Live production build |
| Create pre-Go-Live backup and rollback copy | Tested rollback plan |
| Configure automatic weekly backup (application + database) | Backup schedule and retention policy |
| Configure monitoring — access logs, audit logs, security incident logs | Monitoring dashboard |
| Go-Live after successful UAT approval only | Live website at production domain |
| Post-Go-Live stabilization support | Bug fixes and monitoring |

**Exit Criteria:** Production deployment package (Deliverable D10)

---

### Phase 9 — Training, Handover & AMC Setup
**Duration: 1 week + ongoing AMC**

| Task | Output |
|------|--------|
| On-site development coordination at Computer Section, CCS HAU Hisar | Development presence as per RFP |
| Hands-on training to designated University staff during development | Training attendance record |
| Final comprehensive training session after project completion | Training materials |
| Submit admin user manual, content update guide, backup/restore guide, technical manual | Documentation package |
| Handover source code, database schema, configuration files, deployment scripts, credentials | Final handover package |
| Set up AMC issue tracker and support process | AMC support records |

**Exit Criteria:** Training completed (D11), source code and credentials handed over (D12), AMC process active (D13)

---

## 10. Work Breakdown Structure (WBS)

| WBS ID | Work Package | Key Activities | Deliverables | Exit Criteria |
|--------|--------------|----------------|--------------|---------------|
| **1.0** | Project Initiation | Kick-off, stakeholder identification, communication plan, risk register | Project charter, contact matrix | Kick-off completed |
| **1.1** | RFP Scope Baseline | Review clauses, clarify AMC, hosting, security audit | Clarification tracker | Open points documented |
| **1.2** | Current Website Access | Collect legacy access, sitemap, hosting/DNS, content owners | Access checklist | Credentials available |
| **2.0** | Requirement Study | Workshops with Computer Section and departments | Requirement study report | Requirements approved |
| **2.1** | Content Inventory | Catalogue pages, documents, media, departments, notices, tenders | Content inventory and migration matrix | Major content covered |
| **2.2** | Role and Access Matrix | Define super admin, dept admin, editor, viewer roles | RBAC matrix | Roles approved |
| **3.0** | Information Architecture | Navigation hierarchy, page templates, content categories | IA/sitemap document | Navigation approved |
| **3.1** | UX Design Options | Three UI layout options | Three UI/UX layouts | One layout selected |
| **3.2** | Responsive Design System | Typography, components, bilingual behavior, accessibility | Design system | Supports all device views |
| **4.0** | Technical Architecture | API structure, DB schema, hosting, backup, security | Architecture document | Scalable and secure |
| **4.1** | Environment Setup | Dev, staging/UAT, production environments | Configured environments | Reliable build/deploy |
| **4.2** | Database Design | Normalized schema for all modules | DB schema and migrations | Supports all modules |
| **5.0** | Public Website Core | Layout, header/footer, navigation, language switch, templates | Public website base | Renders on all devices |
| **5.1** | Bilingual Support | EN/HI interface, Unicode, fallback | Bilingual interface | No glyph issues |
| **5.2** | Search and SEO URLs | Global search, metadata, URL rewrite, redirects | Search + SEO module | Searchable SEO-friendly URLs |
| **5.3** | Visitor Modules | Notices, circulars, tenders, media, events, downloads, feedback | Visitor module pages | All modules functional |
| **5.4** | Accessibility Tools | Font zoom, dark/light mode, special tools | Accessibility toolbar | Works on public pages |
| **6.0** | Admin Dashboard Core | Secure login, failed attempt monitoring, password reset | Admin dashboard base | Security controls work |
| **6.1** | Role Management | Department users, roles, permissions | Role management module | Access properly restricted |
| **6.2** | Page and Menu Management | Dynamic pages, publish/unpublish, menu hierarchy | CMS page/menu module | Non-technical users can maintain |
| **6.3** | Metadata and Ownership | Metadata, titles, tags, source, owner fields | Metadata module | Ownership tracked |
| **6.4** | Notice/Circular/Tender CMS | Add/edit/archive workflows, corrigendum | Admin update modules | Official updates manageable |
| **6.5** | Media and Download CMS | Gallery, press release, video, downloads, file validation | Media/download management | Secure file management |
| **6.6** | Feedback Admin (Analytics on hold) | Feedback review; analytics deferred | Feedback admin module | Feedback manageable; analytics TBD |
| **7.0** | Content Migration | Extract, clean, restructure, migrate legacy content | Migrated data | ≥90% migration achieved |
| **7.1** | URL Mapping | Old to new URL mapping, redirects, broken link checks | URL redirect map | Legacy URLs redirect correctly |
| **7.2** | Migration Validation | Page sampling, document checks, stakeholder review | Migration validation report | University confirms readiness |
| **8.0** | Security Implementation | HTTPS, CAPTCHA, JWT, RBAC, secure uploads, input validation | Security controls | Security tests pass |
| **8.1** | Logging and Monitoring | Audit, access, security incident, admin action logs | Logs and monitoring | Logs accessible to authorized users |
| **8.2** | Security Audit Support | Vulnerability review and fix identified issues | Security hardening report | Critical/high vulnerabilities closed |
| **9.0** | Performance Optimization | Asset optimization, caching, lazy loading, DB indexes | Performance report | Pages load within target |
| **9.1** | Accessibility Compliance | Keyboard nav, typography, accessibility controls | Accessibility check report | Defects resolved before UAT |
| **10.0** | Testing and QA | Functional, regression, browser, responsive, migration, security, performance | Test plan and QA report | Critical defects closed |
| **10.1** | UAT | UAT with university users, defect resolution | UAT tracker and sign-off | Launch approved |
| **11.0** | Production Deployment | Deploy app, DB, SSL, DNS, backup/rollback | Production deployment package | Website live |
| **11.1** | Training | Hands-on and final training to university staff | Training materials and attendance | Users can operate CMS |
| **11.2** | Handover | Source code, DB schema, configs, scripts, manuals, credentials | Final handover package | Handover acknowledged |
| **12.0** | AMC Support | Bug fixes, minor updates, maintenance, backup checks | AMC issue log and reports | Support per AMC terms |

---

## 11. User Stories Summary

| ID | Role | Priority | User Story (Summary) |
|----|------|----------|----------------------|
| US-01 | Public Visitor | Must | View website in English and Hindi |
| US-02 | Public Visitor | Must | Clean responsive website on all devices |
| US-03 | Public Visitor | Must | Intuitive multi-level navigation |
| US-04 | Public Visitor | Must | Search across pages and documents |
| US-05 | Public Visitor | Must | View official notices, corrigendum, cancellations |
| US-06 | Public Visitor | Must | Access circulars and downloadable files |
| US-07 | Public Visitor | Must | Category-wise tender listings with corrigendum and archive |
| US-08 | Public Visitor | Should | View press releases, photos, videos, event calendar |
| US-09 | Public Visitor | Should | Access related government and institutional links |
| US-10 | Public Visitor | Should | Submit general or department-wise feedback |
| US-11 | Public Visitor | Should | Use accessibility tools (font zoom, dark/light mode) |
| US-12 | Public Visitor | Should | Fast-loading pages on regular network conditions |
| US-13 | Super Admin | Must | Secure login with attempt monitoring |
| US-14 | Super Admin | Must | Role-based access control for departments |
| US-15 | Super Admin | Must | Create department-wise logins |
| US-16 | Content Admin | Must | Create and update pages dynamically |
| US-17 | Content Admin | Must | Manage menus and hierarchy |
| US-18 | Content Admin | Must | Add metadata, titles and tags for SEO |
| US-19 | Content Admin | Must | Store source and owner details for each content item |
| US-20 | Content Admin | Must | Manage notices, circulars and official updates |
| US-21 | Content Admin | Must | Manage tenders and corrigendum |
| US-22 | Content Admin | Should | Manage photo galleries and event photographs |
| US-23 | Content Admin | Should | Manage downloads |
| US-24 | Content Admin | Should | Manage banners and campaign placements |
| US-25 | Content Admin | Should | Review feedback submissions |
| US-26 | Administrator | Should | Visitor counter and analytics — **on hold** |
| US-27 | Administrator | Must | Audit logs for user actions and security events |
| US-28 | Administrator | Must | Secure file upload controls |
| US-29 | Administrator | Must | Backup and rollback before Go-Live |
| US-30 | Administrator | Must | Old URLs mapped to new URLs (301 redirects) |
| US-31 | University Reviewer | Must | UAT access to validate all features before Go-Live |
| US-32 | Technical Team | Must | Deployment scripts and configuration documentation |
| US-33 | Designated Staff | Must | Hands-on CMS training |
| US-34 | Support Team | Must | AMC issue log for bug fixes and operational assistance |

---

## 12. Deliverables and Acceptance Criteria

| ID | Deliverable | Acceptance Criteria |
|----|-------------|---------------------|
| **D1** | Project Kick-off and Requirement Study Report | Approved requirements, stakeholder matrix, content inventory and execution plan |
| **D2** | Information Architecture and UI/UX Layouts | Three design options submitted; one design approved before development |
| **D3** | Technical Architecture Document | Approved Option B architecture: Next.js + Supabase (Postgres, Auth, Storage), security model, hosting, backups, deployment |
| **D4** | CMS and Admin Dashboard | Admin users can securely log in, manage roles, create/edit pages, metadata, menus, notices, circulars, downloads, galleries and tenders |
| **D5** | Public Website | Responsive bilingual website on target browsers/devices with required public modules and search |
| **D6** | Migrated Content and Migration Report | Minimum 90% successful data/content migration validated by page count, asset count, link testing and university review |
| **D7** | SEO, Accessibility and Performance Closure | Metadata, URL rewriting, redirects, accessibility tools, performance optimization and cross-browser checks completed |
| **D8** | Security Audit/Hardening Report | Security controls implemented; vulnerabilities remediated; audit/access/security logs enabled |
| **D9** | Testing and UAT Sign-off | Functional, responsive, browser, migration, performance and UAT defects closed before Go-Live |
| **D10** | Go-Live and Deployment Package | Production deployment completed; backup/rollback copy created; SSL and monitoring configured |
| **D11** | Training and Manuals | Hands-on training completed; admin manual, user guide, technical manual and backup/restore guide submitted |
| **D12** | Source Code and Credential Handover | Next.js source repo, Supabase SQL migrations, `.env.example`, Storage bucket config, deployment scripts and credentials handed over |
| **D13** | AMC Support Records | Issue log, routine maintenance record, support actions and monthly/quarterly reports maintained |

---

## 13. Team Structure

### Recommended Team

| Role | Count | Responsibility |
|------|-------|----------------|
| **Project Manager** | 1 | Governance, weekly reports to Computer Section, client coordination, risk management |
| **UI/UX Designer** | 1 | Three layout options, design system, accessibility UX, responsive prototypes |
| **Full-Stack Developer (Next.js + Supabase)** | 2–3 | Public site, admin CMS, Server Actions/API routes, Supabase schema, Auth, Storage, RLS |
| **QA Engineer** | 1 | Test plan, functional/regression/UAT testing, cross-browser and responsive testing |
| **DevOps Engineer** | 0.5 | Next.js hosting, Supabase project setup, SSL, backups, CI/CD, monitoring |
| **Content/Migration Specialist** | 1 | Content inventory, migration execution, content QA, editorial standardization |

**Total Team Size:** 6–8 people (some part-time)

### Development Presence

- Development process to be carried out **on-site at Computer Section, CCS HAU Hisar** as per RFP
- Weekly progress reports to Incharge, Computer Section

---

## 14. Time Estimates

### 14.1 RFP Contractual Timeline

| Activity | RFP Timeline |
|----------|--------------|
| UI/UX Design | 1 week |
| Core Development | 1 month (4 weeks) |
| Testing and Quality Assurance | 1 week |
| Data Shifting and Go-Live | 2 weeks |
| **Total** | **~7 weeks** |

> The RFP timeline is very aggressive for the full scope (22 modules, 34 user stories, 90% migration, security audit, bilingual CMS, RBAC). Treat as minimum contractual reference.

### 14.2 Realistic Timeline Estimates

| Scenario | Team Size | Duration | Notes |
|----------|-----------|----------|-------|
| **Minimum Viable (MVP)** | 4 people | **12–14 weeks** | Core CMS + public modules; phased media/feedback |
| **Full RFP Scope** | 6–8 people | **16–20 weeks** | All modules, migration, security, UAT |
| **Conservative (with buffer)** | 6–8 people | **22–24 weeks** | Includes stakeholder delays, content validation |

### 14.3 Phase-wise Realistic Timeline (Full Scope, 6-Person Core Team)

| Phase | Description | Duration | Cumulative | Status |
|-------|-------------|----------|------------|--------|
| Phase 0 | Discovery & Project Setup | 1 week | Week 1 | **✅ Done** (23 Jun 2026) |
| Phase 1 | UI/UX Design (3 layouts + approval) | 2 weeks | Week 3 | **✅ Done** (23 Jun 2026) — **Option B approved** |
| Phase 2 | Technical Architecture & Database | 1 week | Week 4 | **✅ Done** (23 Jun 2026) |
| Phase 3 | Admin Dashboard & CMS | 4 weeks | Week 8 | **~90% Done** (23 Jun 2026) — role admin, related links pending |
| Phase 4 | Public Website Development | 4 weeks | Week 12 | **🔄 In progress** (23 Jun 2026) — Sprint 2 done |
| Phase 5 | Content Migration & QA | 3 weeks | Week 15 | ⏳ Pending |
| Phase 6 | Security, Performance & Compliance | 2 weeks | Week 17 | ⏳ Pending |
| Phase 7 | Testing & UAT | 2 weeks | Week 19 | ⏳ Pending |
| Phase 8 | Deployment, Go-Live & Stabilization | 1 week | Week 20 | ⏳ Pending |
| Phase 9 | Training, Handover & AMC Setup | 1 week | Week 21 | ⏳ Pending |
| **Total** | | **~21 weeks (~5 months)** | | |

### 14.4 Sprint-wise Build Priority

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1–2 | Auth + RBAC + pages CMS + file upload | ✅ Done |
| Sprint 3–4 | News, tenders, menus, banners, feedback, audit viewer | ✅ Done |
| Sprint 5–6 | Circulars, downloads, media admin modules | ✅ Done |
| Sprint 7–8 | Public site (`/`, news, tenders, contact, pages) | ✅ Done |
| Sprint 9 | Public circulars, downloads, media centre | ✅ Done |
| Sprint 10+ | Global search, URL redirects, related links | ✅ Done |
| Sprint 11+ | Language persistence, pagination, homepage CMS polish | ⏳ Next |
| Sprint 11–12 | Content migration + content QA | ⏳ Pending |
| Sprint 13–14 | Security hardening + performance + UAT + Go-Live | ⏳ Pending |

---

## 15. Risks, Assumptions and Clarifications

### 15.1 Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RFP timeline too short for full scope | Schedule slip, quality compromise | Parallel workstreams; MVP phasing; start CMS and migration early |
| Content not provided on time by departments | Migration delay | Content inventory in Week 1; define content freeze date |
| Department approval delays during UAT | Go-Live blocked | Nominate content owners early; weekly validation cycles |
| Hindi translation gaps | Incomplete bilingual site | University provides Hindi content; define EN fallback policy |
| Legacy IP/external links break after migration | Broken links for users | External link register; proxy/routing plan for internal services |
| AMC/hosting platform ambiguity | Contract disputes | Clarify before contract signing |
| Security audit scope unclear | Re-work after audit | Define VA vs certified third-party audit upfront |
| Stakeholder availability for workshops/UAT | Timeline extension | Schedule workshops early; assign backup reviewers |

### 15.2 Assumptions

- CCSHAU will provide timely access to existing website content, domain/DNS, hosting information, legacy credentials and content repositories
- Department-wise content owners and approvers will be nominated before content migration and UAT
- Official Hindi and English content will be provided by the University wherever translation or legal accuracy is required
- Third-party paid tools, SMS/email gateway, CDN, premium plugins, external audit certification or hosting charges treated as separate unless included in commercial bid
- Security audit scope finalized as website/application vulnerability assessment and hardening unless external certified audit body mandated
- Migration success measured against content available and accessible from legacy website or material provided by CCSHAU
- AMC duration and hosting OS/platform finalized per clarifications/contract

### 15.3 Dependencies

- Availability of CCSHAU stakeholders for requirement finalization, design approvals, content validation, UAT and sign-off
- Timely provision of legacy website access and content dump for migration within timeline
- Finalization of SSL/domain/DNS process and cloud hosting approach before deployment
- Availability of Power Automate flow URLs and webhook secret for password reset and admin alerts in production
- Timely security review and UAT feedback to avoid Go-Live delay

### 15.4 Clarifications Required Before Execution

| Area | Question / Risk |
|------|-----------------|
| **AMC Duration** | 3 years post Go-Live (work title) or 2 years (AMC clause)? |
| **Hosting Platform** | Windows-based cloud hosting or Linux-based/equivalent? |
| **Security Audit** | Formal third-party security audit certificate or vendor-led VA and hardening report? |
| **Email / Power Automate** | Provide HTTP trigger flow URLs, webhook secret, from-address, and lockout alert recipients |
| **Content Translation** | Will Hindi translations be provided by CCSHAU or created by bidder? |
| **Migration Cut-off** | Content freeze date for migration to avoid repeated delta migration? |
| **Analytics** | ⏸️ On hold — government-approved/self-hosted tool TBD when resumed |

---

## 16. Out of Scope

The following are explicitly out of scope unless added through a formal change request:

- Development of mobile applications (native iOS/Android)
- ERP, LMS, admission, fee payment, student portal or HR/payroll integrations
- Large-scale content creation, copywriting or official translation beyond restructuring/standardization of available content
- Procurement of hardware, paid software licenses, premium plugins, paid stock images, email/SMS gateway charges or third-party audit charges (unless included commercially)
- Major new modules during AMC period (AMC covers bug fixing, minor updates and operational assistance only)
- Legal verification of content accuracy (University content owners remain responsible for official correctness)

### Change Control

Any additional requirement outside approved RFP scope, approved UI layout, finalized sitemap or accepted user stories shall be handled through a written change request defining requirement impact, timeline impact, cost impact, acceptance criteria and approval authority.

---

## 17. Project Governance

| Governance Area | Recommended Practice |
|-----------------|---------------------|
| **Weekly Progress Report** | Submit to Incharge, Computer Section, CCS HAU Hisar as required in RFP |
| **Approval Gates** | Requirement sign-off → UI/UX approval → development review → migration validation → security closure → UAT sign-off → Go-Live approval |
| **Issue Management** | Maintain issue tracker for defects, decisions, dependencies and change requests |
| **UAT Gate** | Go-Live only after successful UAT approval and closure of reported bugs/UI issues |
| **Handover Gate** | Final payment/handover linked to source code, DB schema, configuration files, scripts, manuals and credentials |
| **AMC Reporting** | Support log and periodic AMC report for bug fixes, minor updates, backups and operational assistance |

---

## 18. Suggested Execution Order

### Development Roadmap (Gantt Overview)

```
Week 1-2:   Discovery, IA, Content Inventory
Week 3-4:   UI/UX (3 Layouts) + Architecture + DB Design
Week 5-8:   Admin CMS + RBAC + Security
Week 9-12:  Public Website + Bilingual + Search + Accessibility
Week 13-15: Content Migration + URL Redirects + Content QA
Week 16-17: Security Hardening + Performance Optimization
Week 18-19: Testing + UAT
Week 20:    Go-Live + Stabilization
Week 21:    Training + Handover + AMC Setup
```

### Work Package Sequence

```
1. Discovery & Audit
   ↓
2. Information Architecture Redesign
   ↓
3. UI/UX Design (3 layouts → 1 approved)
   ↓
4. CMS and Admin Dashboard
   ↓
5. Public Modules (parallel with CMS completion)
   ↓
6. Migration and Content QA
   ↓
7. Security, Accessibility and Performance Hardening
   ↓
8. Deployment, UAT and Go-Live
   ↓
9. Training, Handover and AMC
```

---

## 19. Acceptance Checklist

| Area | Acceptance Checkpoint |
|------|----------------------|
| **Migration** | Approved migration tracker confirms minimum 90% valid legacy content migrated or intentionally archived/excluded |
| **Bilingual** | Every core public template supports English/Hindi content and Unicode Hindi rendering without font breakage |
| **Search** | Global search returns pages, news, tenders, circulars, downloads and gallery content with filters |
| **Tenders** | Tender module supports category, corrigendum, expiry date, archive and attachment management |
| **Admin Security** | Login has HTTPS, CAPTCHA/lockout/reset policy, session timeout, role control and audit logs |
| **Accessibility** | Public pages pass agreed accessibility checklist including keyboard navigation, alt text, contrast and text resizing |
| **SEO** | SEO metadata and 301 redirect map implemented for migrated legacy URLs |
| **Performance** | Home and listing pages meet agreed load-time/performance thresholds on desktop and mobile |
| **Backup/Rollback** | Database and files have automated backups and a tested restore/rollback plan before Go-Live |
| **Handover** | Source code, database schema, configuration, credentials, deployment scripts, manuals and training records delivered |
| **Functionality Compliance** | 99% functionality compliance as per RFP requirements |
| **Cross-browser** | Error-free operation on latest Chrome, Firefox, Edge and Safari |

---

## 20. Recommended Next Steps

| # | Action | Owner | Status |
|---|--------|-------|--------|
| 1 | Submit RFP clarification questions (AMC, security audit, Power Automate flows) | Project Manager | Open |
| 2 | Conduct stakeholder workshop with Computer Section + department content owners | Project Manager + BA | Pending |
| 3 | Run formal technical audit — sitemap crawl, broken links, Lighthouse, WCAG baseline | Technical Team | Pending |
| 4 | Approve development plan — confirm MVP vs full scope and team size | Client + PM | Pending |
| 5 | Confirm Supabase Cloud + Vercel production setup | DevOps + PM | **✅ Done** |
| 6 | Complete Phase 0 — repo, governance docs, Supabase migrations | Dev Team | **✅ Done** |
| 7 | Obtain Power Automate flow URLs + webhook secret from CCSHAU IT | Client IT | Pending |
| 8 | **Present Phase 1** — 3 UI/UX design layouts for client approval | UI/UX Designer | **✅ Done** — **Option B approved** |
| 9 | Finalize Supabase database schema and Next.js API design (Phase 2) | Tech Lead | **✅ Done** |
| 10 | **Phase 3 Sprints 2–4** — News, tenders, menus, banners, feedback, audit | Full-Stack Dev | **✅ Done** |
| 11 | **Phase 3/4** — Circulars, downloads, media admin + public routes | Full-Stack Dev | **✅ Done** |
| 12 | **Phase 4 Sprint 3** — Global search, URL redirects, related links | Full-Stack Dev | **✅ Done** |
| 13 | **Phase 4 Sprint 4** — Language persistence, pagination, homepage CMS | Full-Stack Dev | **✅ Done** |
| 14 | **Phase 3 gap** — User/role admin UI | Full-Stack Dev | **Next** |
| 14 | **Client track** — Access checklist, Power Automate flows, D1–D3 sign-offs | PM + CCSHAU | Pending |

---

## 21. Phase Progress Tracker

> **Rule:** When a phase is complete, update **Status** to **✅ Done** and **Completed** date in this table and in [Section 9](#9-development-phases-detailed).

| Phase | Name | Status | Completed | Exit / Deliverable | Notes |
|-------|------|--------|-----------|-------------------|-------|
| **0** | Discovery & Project Setup | **✅ Done** | 23 Jun 2026 | D1 draft + repo + Supabase connected | Client kick-off, access checklist & D1 sign-off pending |
| **1** | UI/UX Design | **✅ Done** | 23 Jun 2026 | D2 — **Option B approved** | Formal CCSHAU signatory pending |
| **2** | Technical Architecture & Database | **✅ Done** | 23 Jun 2026 | D3 — schema + API spec + migrations | Formal IT architecture approval pending |
| **3** | Admin Dashboard & CMS | **✅ Done** | 23 Jun 2026 | D4 — CMS modules complete | IT: production reCAPTCHA + Power Automate URLs |
| **4** | Public Website Development | **🔄 ~85% Done** | 23 Jun 2026 | D5 — staging site | Event calendar/portals remain optional |
| **5** | Content Migration & QA | ⏳ Pending | — | D6 | Blocked on client content access |
| **6** | Security, Performance & Compliance | ⏳ Pending | — | D7, D8 | |
| **7** | Testing & UAT | ⏳ Pending | — | D9 | |
| **8** | Deployment & Go-Live | ⏳ Pending | — | D10 | |
| **9** | Training, Handover & AMC | ⏳ Pending | — | D11, D12, D13 | |

### Phase 3 — module checklist (D4)

| Module | Admin route | Status |
|--------|-------------|--------|
| Auth + RBAC + lockout | `/admin/login` | ✅ |
| Pages CMS | `/admin/pages/*` | ✅ |
| News & notices | `/admin/news/*` | ✅ |
| Tenders + corrigenda | `/admin/tenders/*` | ✅ |
| Circulars | `/admin/circulars/*` | ✅ |
| Downloads | `/admin/downloads/*` | ✅ |
| Media centre | `/admin/media/*` | ✅ |
| Banners | `/admin/banners/*` | ✅ |
| Menu manager | `/admin/menus/*` | ✅ |
| Feedback inbox | `/admin/feedback/*` | ✅ |
| Audit log viewer | `/admin/audit` | ✅ |
| User/role management | `/admin/users/*` | ✅ |
| Related links CMS | `/admin/related-links` | ✅ |
| URL redirects admin | `/admin/redirects` | ✅ |
| Settings (security toggles) | `/admin/settings` | ✅ |

### Phase 4 — module checklist (D5)

| Module | Public route | Status |
|--------|--------------|--------|
| Homepage (partial CMS) | `/` | ✅ Partial |
| News | `/news`, `/news/[slug]` | ✅ |
| Tenders | `/tenders`, `/tenders/[slug]` | ✅ |
| Circulars | `/circulars` | ✅ |
| Downloads | `/downloads` | ✅ |
| Media centre | `/media`, `/media/[slug]` | ✅ |
| Contact / feedback | `/contact` | ✅ |
| CMS pages | `/pages/[slug]` | ✅ |
| Global search | `/search` | ✅ |
| URL redirects | middleware + admin | ✅ |
| Related links section | homepage partners | ✅ |
| Bilingual persistence | — | ✅ |
| Homepage about/colleges CMS | `/pages/about`, `/pages/colleges/*` | ✅ Partial |
| Event calendar / portals | — | ⏳ |

---

## Appendix A — Bid Positioning / Technical Proposal Angles

- Treat existing website as source baseline; every page/document goes through migration, quality review, metadata tagging and department confirmation
- Position as **CMS re-platforming** with controlled workflows — not only UI redesign
- Include dedicated URL migration and redirect plan for SEO ranking retention
- Define content freeze and UAT cycle for 90% migration validation before Go-Live
- Include accessibility compliance checklist with special tools for differently abled users
- Include module-wise training plan for Computer Section and department users

## Appendix B — External Systems Integration Note

External systems such as admissions, e-governance, fee payment, farmer portals and other third-party services should remain integrated through governed links, SSO or proxy routing as approved by CCSHAU. These are not part of core CMS development unless explicitly added via change request.

## Appendix D — Finalized Architecture: Option B Summary

| Item | Decision |
|------|----------|
| **Architecture** | Option B — Next.js + Supabase |
| **Frontend** | Next.js 14+ (React, App Router) — public site + `/admin` CMS |
| **API Layer** | Next.js Route Handlers + Server Actions (no separate Laravel/Python backend) |
| **Database** | Supabase PostgreSQL with SQL migrations via Supabase CLI |
| **Auth** | Supabase Auth (JWT) for admin users |
| **Storage** | Supabase Storage for documents, media, downloads |
| **Search** | PostgreSQL FTS; Meilisearch optional |
| **Security** | Server-only service role; RLS on tables; CAPTCHA; RBAC in app layer |
| **Hosting (App)** | **Vercel** ✅ confirmed |
| **Hosting (Data)** | **Supabase Cloud** ✅ confirmed |
| **Analytics** | ⏸️ **On hold** — Matomo preferred when resumed |
| **Email** | **Microsoft Power Automate** ✅ confirmed | Password reset + lockout alerts via HTTP-triggered flows |
| **Coding Status** | **Phase 4 🔄 In progress** — Sprint 2 done (public + admin: circulars, downloads, media) |

### Planned Repository Structure (when coding begins)

```
CCSHAU_Project/
├── apps/
│   └── web/                    # Next.js app (public + admin)
│       ├── app/
│       │   ├── (public)/       # Public visitor routes
│       │   ├── admin/          # CMS dashboard routes
│       │   └── api/            # Route Handlers
│       ├── components/
│       ├── lib/
│       │   └── supabase/       # Server + client Supabase helpers
│       └── actions/            # Server Actions (CMS logic)
├── supabase/
│   ├── migrations/             # SQL schema migrations
│   ├── functions/              # Edge Functions (cron jobs)
│   └── seed.sql                # Dev seed data
├── docs/                       # Technical manuals
└── scripts/                    # Migration and deployment scripts
```

> Repository scaffolded and Phase 0 completed 23 June 2026. See [Section 21 — Phase Progress Tracker](#21-phase-progress-tracker).

## Appendix C — Intellectual Property

All intellectual property of the developed solution shall rest with CCS HAU Hisar. Complete source code, database schema, configuration files and deployment scripts to be submitted after completion or at UAT sign-off.

---

**Document End**

*This document consolidates information from: `CCSHAU_RFP_Scope_of_Work.pdf`, `CCSHAU_Website_Gap_Analysis as per scope (1).pdf`, `SOW, WBS and Study (1).pdf`, and public review of [https://hau.ac.in/](https://hau.ac.in/).*

*Architecture finalized as **Option B: Next.js + Supabase** on 23 June 2026.*  
*Phase 0–2 completed 23 June 2026. Phase 3 core CMS ~90% complete. Phase 4 in progress — Sprint 2 (circulars, downloads, media centre) completed 23 June 2026. See [Section 21 — Phase Progress Tracker](#21-phase-progress-tracker).*
