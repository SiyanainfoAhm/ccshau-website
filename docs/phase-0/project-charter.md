# Project Charter — CCSHAU Official Website

**Project:** Development, Migration, Security Audit and Implementation of Official University Website  
**Client:** Chaudhary Charan Singh Haryana Agricultural University (CCSHAU), Hisar  
**Phase:** 0 — Project Initiation  
**Version:** 1.0  
**Date:** 23 June 2026

---

## 1. Purpose

Re-platform the existing university website ([hau.ac.in](https://hau.ac.in/)) to a modern, secure, bilingual, CMS-driven platform that meets RFP requirements and Government of India guidelines.

## 2. Objectives

1. Deliver a responsive bilingual (English/Hindi) public website
2. Provide department-wise CMS with role-based access control
3. Migrate ≥90% of legacy content with SEO URL preservation
4. Meet security, accessibility, and audit requirements
5. Hand over full source code, documentation, and training to CCSHAU

## 3. Scope (Summary)

**In scope:** Public website, admin CMS, content migration, Supabase hosting, Vercel deployment, Power Automate email, security hardening, UAT, training, AMC.

**On hold:** Analytics / visitor counter (deferred post-Go-Live).

**Out of scope:** Mobile apps, ERP/LMS integrations, large-scale new content writing.

## 4. Finalized Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend + API | Next.js 14+ |
| Hosting (app) | Vercel |
| Database / Auth / Storage | Supabase Cloud |
| Email | Microsoft Power Automate |
| Analytics | On hold |

## 5. Success Criteria

- ≥90% successful content migration
- 99% RFP functionality compliance
- UAT sign-off from University
- Security audit closure
- Complete source and credential handover

## 6. Timeline (Realistic)

| Phase | Duration |
|-------|----------|
| 0 — Initiation | 1 week |
| 1 — UI/UX | 2 weeks |
| 2 — Architecture | 1 week |
| 3–4 — CMS + Public | 8 weeks |
| 5–8 — Migration, QA, Go-Live | 6 weeks |
| **Total** | ~18–21 weeks |

## 7. Governance

- **Weekly reports** to Incharge, Computer Section, CCS HAU Hisar
- **Approval gates:** Requirements → UI/UX → Architecture → Migration → UAT → Go-Live
- **Issue tracker:** Defects, dependencies, change requests

## 8. Key Stakeholders

See [stakeholder-matrix.md](./stakeholder-matrix.md).

## 9. Deliverables (Phase 0)

| ID | Deliverable | Location |
|----|-------------|----------|
| — | Project charter | This document |
| — | Stakeholder matrix | `stakeholder-matrix.md` |
| — | Access checklist | `access-checklist.md` |
| — | Clarification tracker | `clarification-tracker.md` |
| — | Content inventory template | `content-inventory-template.csv` |
| — | RBAC matrix | `rbac-matrix.md` |
| — | Communication plan | `communication-plan.md` |
| — | Risk register | `risk-register.md` |
| — | Weekly report template | `weekly-report-template.md` |
| D1 | Requirement study report | `requirement-study-report.md` |

## 10. Approvals

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Incharge, Computer Section | | | |
| Project Manager | | | |
| Director (Store & Purchase) | | | |
