# RBAC Matrix — Role-Based Access Control

**Last updated:** 23 June 2026  
**Status:** Draft — pending approval from Computer Section

## Roles

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `super_admin` | Full system access; user management; all departments |
| Department Admin | `dept_admin` | Full CMS access within assigned department(s) |
| Content Editor | `editor` | Create/edit content within department; may require approval to publish |
| Viewer | `viewer` | Read-only access to admin dashboard and drafts |

## Permission Matrix

| Module / Action | Super Admin | Dept Admin | Editor | Viewer |
|-----------------|-------------|------------|--------|--------|
| **Users & roles** | CRUD | — | — | — |
| **Departments** | CRUD | Read (own) | Read (own) | Read (own) |
| **Pages** | CRUD all | CRUD own dept | CRU own dept | Read |
| **Publish pages** | Yes | Yes | Configurable | No |
| **Menus (header/footer)** | CRUD | — | — | — |
| **News / Notices** | CRUD all | CRUD own dept | CRU own dept | Read |
| **Circulars** | CRUD all | CRUD own dept | CRU own dept | Read |
| **Tenders** | CRUD all | CRUD own dept | CRU own dept | Read |
| **Downloads** | CRUD all | CRUD own dept | CRU own dept | Read |
| **Media gallery** | CRUD all | CRUD own dept | CRU own dept | Read |
| **Banners** | CRUD | CRUD own dept | — | Read |
| **Feedback** | Read all | Read own dept | Read own dept | Read |
| **Audit logs** | Read all | Read own dept | — | — |
| **Settings / SEO** | CRUD | Read | — | — |

**Legend:** C=Create, R=Read, U=Update, D=Delete

## Department Scoping Rules

1. Every content item stores `department_id` and `content_owner_id`
2. `dept_admin` and `editor` can only access rows where `department_id` matches their assignment
3. `super_admin` bypasses department filter
4. Cross-department publishing requires `super_admin` or explicit multi-dept assignment

## Maker-Checker (Optional — confirm with client)

| Workflow | Maker | Checker |
|----------|-------|---------|
| Publish news/tender | Editor | Dept Admin |
| Publish page | Editor | Dept Admin |
| Create admin user | Dept Admin | Super Admin |

## Database Mapping (Phase 2)

All objects use **`CCSHAU_` prefix** (PostgreSQL: `ccshau_`). See `docs/database-naming-convention.md`.

```
ccshau_profiles     → links auth.users to display name, department
ccshau_user_roles   → user_id, role, department_id
ccshau_departments  → id, slug, name_en, name_hi
ccshau_audit_logs   → login, content changes, security events
```

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Incharge, Computer Section | | | ☐ |
| Project Manager | | | ☐ |
