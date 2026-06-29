# Information Architecture & Sitemap — CCSHAU

**Phase:** 1 | **Date:** 23 June 2026

## Primary navigation (Level 1)

| EN | HI | Type |
|----|-----|------|
| Home | मुख पृष्ठ | Page |
| Administration | प्रशासन | Mega menu |
| Academics | शिक्षा | Mega menu |
| Directorates | निदेशालय | Mega menu |
| Colleges | महाविद्यालय | Listing |
| Research | अनुसंधान | Section |
| Extension | विस्तार शिक्षा | Section |
| Campus Life | कैंपस जीवन | Mega menu |
| News & Notices | समाचार | Listing |
| Tenders | निविदाएं | Listing + archive |
| Downloads | डाउनलोड | Repository |
| Media Gallery | मीडिया | Gallery |
| Contact / Feedback | संपर्क | Page + form |

## URL taxonomy (proposed)

```
/                          → Home
/about                     → About University
/administration/*          → Administration pages
/academics/colleges/*      → College pages
/academics/admissions      → Admissions
/news                      → News listing
/news/[slug]               → News detail
/tenders                   → Tenders (open)
/tenders/archive           → Archived tenders
/circulars                 → Circulars
/downloads                 → Downloads
/media                     → Media centre
/contact                   → Contact
/feedback                  → Feedback form
/hi/*                      → Hindi mirror (or query ?lang=hi)
```

## Footer quick links

Aligned with current [hau.ac.in](https://hau.ac.in/) quick links panel — e-Governance, fee payment, RTI, NIRF, student corner, etc.

## Bilingual model

- Language toggle in header (EN ↔ HI)
- Unicode Hindi (Noto Sans Devanagari)
- Fallback: show English if Hindi field empty
