# Legacy Website Access Checklist

**Project:** CCSHAU Website Re-platforming  
**Date:** 23 June 2026  
**Status:** Pending collection from CCSHAU

Use this checklist during kick-off with Computer Section. Mark each item when received.

## Website & Content Access

| # | Item | Required | Received | Owner | Notes |
|---|------|----------|----------|-------|-------|
| 1 | Current website admin / CMS credentials | Yes | ☐ | Computer Section | Legacy Drish Infotech CMS if available |
| 2 | FTP / hosting panel access | Yes | ☐ | Computer Section | |
| 3 | Full sitemap or URL export | Yes | ☐ | Computer Section | Include /page/* legacy URLs |
| 4 | Database dump (if CMS is database-driven) | If available | ☐ | Computer Section | |
| 5 | Document repository / file server paths | Yes | ☐ | Computer Section | PDFs, circulars, tenders |
| 6 | Media assets (images, videos) | Yes | ☐ | PRO / Computer Section | |
| 7 | Hindi content sources | Yes | ☐ | Departments | Unicode text files or CMS export |

## Infrastructure

| # | Item | Required | Received | Owner | Notes |
|---|------|----------|----------|-------|-------|
| 8 | Domain DNS access (`hau.ac.in`) | Yes | ☐ | Computer Section | For Go-Live cutover |
| 9 | Supabase Cloud project (or create new) | Yes | ☑ | Dev Team | Project `fvveqziyusjgqejowkfp` — connected |
| 10 | Vercel project / team access | Yes | ☐ | Dev Team | |
| 11 | SSL certificate process | Yes | ☐ | Computer Section | Vercel provides auto SSL |
| 12 | Power Automate flow URLs + secret | Yes | ☐ | IT / M365 Admin | See development plan §7.11 |

## Organizational

| # | Item | Required | Received | Owner | Notes |
|---|------|----------|----------|-------|-------|
| 13 | Department list with codes | Yes | ☐ | Computer Section | For RBAC mapping |
| 14 | Content owner per department | Yes | ☐ | Computer Section | Name + email |
| 15 | Approval workflow (maker-checker) | Yes | ☐ | Computer Section | Draft → publish rules |
| 16 | Official sender email for notifications | Yes | ☐ | IT | e.g. noreply@hau.ac.in |
| 17 | Lockout alert recipient email(s) | Yes | ☐ | Computer Section | |

## External Systems (Link Only)

| # | System | Action | Notes |
|---|--------|--------|-------|
| 18 | Admissions portal | Document URL | Link integration only |
| 19 | e-Governance / fee payment | Document URL | |
| 20 | Faculty login (existing) | Document URL | May remain separate system |
| 21 | Farmer portals / quick links | Inventory | Replace IP-based links |

## Sign-off

| Role | Name | Date |
|------|------|------|
| Computer Section | | |
| Development Lead | | |
