# Requirement Study Report (Deliverable D1)

**Project:** CCSHAU Official University Website  
**Version:** 1.0 — Draft  
**Date:** 23 June 2026  
**Status:** Phase 0 — Pending stakeholder approval

---

## 1. Introduction

This report documents functional and non-functional requirements for re-platforming the CCSHAU official website, derived from the RFP, gap analysis, and finalized Option B architecture (Next.js + Supabase).

## 2. Sources

| Source | Description |
|--------|-------------|
| RFP (`202716651.pdf`) | Standard bidding document |
| Scope extract | `CCSHAU_RFP_Scope_of_Work.pdf` |
| Gap analysis | 22 gaps G-01 to G-22 |
| SOW / WBS | User stories US-01 to US-34 |
| Current site | [https://hau.ac.in/](https://hau.ac.in/) |
| Development plan | `Documents/CCSHAU_Website_Development_Plan.md` v1.4 |

## 3. Business Objectives

1. Modernize public-facing university web presence
2. Enable non-technical staff to manage content by department
3. Improve accessibility, security, and searchability
4. Preserve SEO through URL migration and redirects
5. Comply with GOI guidelines and RFP acceptance criteria

## 4. Finalized Technical Architecture

| Layer | Selection |
|-------|-----------|
| Frontend + API | Next.js 14+ on Vercel |
| Database | Supabase PostgreSQL — all tables prefixed **`CCSHAU_`** (`ccshau_*`) |
| Auth | Supabase Auth (admin) |
| Storage | Supabase Storage |
| Email | Microsoft Power Automate |
| Analytics | **On hold** |

## 5. Functional Requirements Summary

### 5.1 Public Website

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-P01 | Bilingual English/Hindi interface with Unicode Hindi | Must |
| FR-P02 | Responsive layout (mobile, tablet, desktop, projector) | Must |
| FR-P03 | Multi-level navigation (main, sub, nested links) | Must |
| FR-P04 | Global search across pages and documents | Must |
| FR-P05 | News, notices, corrigendum, cancellations | Must |
| FR-P06 | Circulars and downloadable files | Must |
| FR-P07 | Category-wise tenders with corrigendum and archive | Must |
| FR-P08 | Media centre (press, photos, videos, events calendar) | Should |
| FR-P09 | Related government/institutional links | Should |
| FR-P10 | Department-wise feedback forms | Should |
| FR-P11 | Accessibility toolbar (font zoom, dark/light, keyboard nav) | Should |
| FR-P12 | Campaign banners with scheduling | Should |
| FR-P13 | Visitor counter / analytics | **On hold** |

### 5.2 Admin CMS

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-A01 | Secure login with CAPTCHA and lockout after 5 failures | Must |
| FR-A02 | Password reset via Power Automate email | Must |
| FR-A03 | Role-based access (super admin, dept admin, editor, viewer) | Must |
| FR-A04 | Department-scoped content ownership | Must |
| FR-A05 | Dynamic page create/edit/publish with SEO metadata | Must |
| FR-A06 | Menu manager (header/footer, hierarchy) | Must |
| FR-A07 | News, circulars, tenders, downloads, media modules | Must |
| FR-A08 | Audit logs for login and content changes | Must |
| FR-A09 | Banner/campaign manager | Should |
| FR-A10 | Feedback review dashboard | Should |

### 5.3 Migration & Operations

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-M01 | Migrate ≥90% legacy content | Must |
| FR-M02 | 301 redirects for legacy URLs | Must |
| FR-M03 | Weekly automated backups | Must |
| FR-M04 | Pre-Go-Live rollback plan | Must |
| FR-M05 | Source code and credential handover | Must |
| FR-M06 | Staff CMS training | Must |

## 6. Non-Functional Requirements

| ID | Area | Requirement |
|----|------|-------------|
| NFR-01 | Performance | Optimized loading, caching, lazy load, image compression |
| NFR-02 | Security | HTTPS, JWT, RBAC, RLS, secure uploads, audit logs |
| NFR-03 | Accessibility | WCAG-aligned controls and markup |
| NFR-04 | SEO | Friendly URLs, metadata, sitemap, redirects |
| NFR-05 | Browser support | Latest Chrome, Firefox, Edge, Safari |
| NFR-06 | Availability | Cloud hosting with backup and monitoring |
| NFR-07 | Maintainability | Modular Next.js codebase, SQL migrations |
| NFR-08 | Compliance | GOI accessibility and security guidelines |

## 7. User Roles

See [rbac-matrix.md](./rbac-matrix.md).

## 8. Content Categories (Migration)

| Category | Examples | Owner |
|----------|----------|-------|
| Static pages | About, Administration, Academics | Various depts |
| News / Notifications | Latest news, orders | PRO, sections |
| Tenders | NIT, corrigendum, auctions | Store & Purchase |
| Circulars | Official circulars PDFs | Registrar / sections |
| Downloads | Forms, calendars, rules | Multiple |
| Media | Photos, videos, events | PRO |
| Quick links | External portals | Computer Section |

Inventory template: [content-inventory-template.csv](./content-inventory-template.csv)

## 9. Integrations

| System | Type | Status |
|--------|------|--------|
| Supabase Cloud | Database/Auth/Storage | Confirmed |
| Vercel | App hosting | Confirmed |
| Power Automate | Transactional email | Confirmed — flows pending |
| Matomo / GA4 | Analytics | On hold |
| Legacy external portals | Hyperlinks | Link-only integration |

## 10. Assumptions

1. CCSHAU provides legacy content access and department content owners
2. Power Automate HTTP flows will be provisioned before admin module testing
3. Analytics deferral is accepted for initial Go-Live
4. Hindi content provided by university where legally sensitive

## 11. Dependencies

See [access-checklist.md](./access-checklist.md) and [clarification-tracker.md](./clarification-tracker.md).

## 12. Out of Scope

- Native mobile apps
- ERP, LMS, admission, fee payment deep integrations
- Analytics (initial release)
- Large-scale new content writing

## 13. Acceptance Criteria (High Level)

- [ ] 99% RFP functionality (excluding deferred analytics)
- [ ] ≥90% content migration validated
- [ ] UAT sign-off
- [ ] Security hardening report
- [ ] Training and handover complete

## 14. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Incharge, Computer Section | | | |
| Project Manager | | | |

---

**Next phase:** Phase 1 — Information Architecture & UI/UX (3 design layouts)
