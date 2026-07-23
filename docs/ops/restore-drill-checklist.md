# Restore drill checklist — CCSHAU

Use this once before Go-Live and after major schema changes.  
**Do not run an in-place restore on production without an approved window.**

| Field | Value |
|-------|--------|
| Drill date | |
| Operator | |
| Backup chosen (date/time or PITR) | |
| Method | ☐ Dashboard same-project ☐ New/duplicate project ☐ Logical dump into staging |
| Duration (minutes) | |
| DB size at time | ~510 MB (verify in Dashboard) |
| Smoke tests | ☐ Admin login ☐ Sample CMS page ☐ Faculty ☐ One Storage image |
| Storage files restored from off-site? | ☐ Yes ☐ N/A |
| Custom role passwords reset? | ☐ Yes ☐ N/A |
| Result | ☐ Pass ☐ Fail |
| Notes / follow-ups | |

## Steps (new project — preferred)

1. Create temporary Supabase project (or duplicate).
2. Restore selected backup / import dump into temp project only.
3. Point staging `apps/web/.env.local` at temp project URL + keys.
4. Run smoke tests above.
5. Delete temp project.
6. File this checklist with Computer Section / AMC log.

See full procedure: [backup-restore-guide.md](./backup-restore-guide.md#5-restore-drill-staging--new-project)
