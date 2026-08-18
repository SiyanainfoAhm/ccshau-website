"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Eye, Pencil, Search, Trash2 } from "lucide-react";

import { deleteDepartmentAction, deleteFacultyAction } from "@/actions/college-register";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@/lib/data/admin-list";
import type { DepartmentOption, FacultyListItem } from "@/lib/pages/college-register-helpers";

function DeleteRowButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      title={`Delete ${label}`}
      onClick={() => {
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        startTransition(async () => {
          const result = await onConfirm();
          if (!result.success) {
            alert(result.error ?? "Delete failed.");
            return;
          }
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      Delete
    </button>
  );
}

function matchesDepartmentQuery(dept: DepartmentOption, query: string, includeCollege: boolean) {
  const parts = [dept.title_en, dept.slug];
  if (includeCollege) parts.push(dept.college_title);
  return parts.join(" ").toLowerCase().includes(query);
}

export function DepartmentRegisterList({
  departments,
  collegePageId,
  canEdit = true,
  canDelete = true,
}: {
  departments: DepartmentOption[];
  collegePageId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const showCollege = !collegePageId;
  const colSpan = showCollege ? 5 : 4;
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();

  const departmentOptions = useMemo(
    () =>
      [...departments]
        .map((dept) => ({
          id: dept.id,
          title: showCollege && dept.college_title ? `${dept.college_title} → ${dept.title_en}` : dept.title_en,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [departments, showCollege],
  );

  const filteredDepartments = useMemo(() => {
    let rows = departments;
    if (departmentId) {
      rows = rows.filter((dept) => dept.id === departmentId);
    }
    if (normalizedQuery) {
      rows = rows.filter((dept) => matchesDepartmentQuery(dept, normalizedQuery, showCollege));
    }
    return rows;
  }, [departments, departmentId, normalizedQuery, showCollege]);

  const hasFilter = Boolean(normalizedQuery || departmentId);
  const selectedDepartmentTitle = departmentOptions.find((dept) => dept.id === departmentId)?.title;

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / ADMIN_DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * ADMIN_DEFAULT_PAGE_SIZE;
  const pagedDepartments = filteredDepartments.slice(pageStart, pageStart + ADMIN_DEFAULT_PAGE_SIZE);
  const rangeStart = filteredDepartments.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + ADMIN_DEFAULT_PAGE_SIZE, filteredDepartments.length);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Registered departments</h2>
            <p className="text-xs text-slate-500">
              {hasFilter
                ? `${filteredDepartments.length} of ${departments.length} shown`
                : `${departments.length} department${departments.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            {departmentOptions.length > 0 ? (
              <label className="w-full sm:w-64">
                <span className="sr-only">Filter by department</span>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Filter by department"
                >
                  <option value="">All departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or slug…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Search departments by name or slug"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {showCollege && (
                <th className="px-4 py-3 text-left font-semibold text-slate-700">College</th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Slug</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                  No departments registered yet.
                </td>
              </tr>
            ) : filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                  {departmentId && normalizedQuery
                    ? `No departments match “${query.trim()}” in ${selectedDepartmentTitle}.`
                    : departmentId
                      ? `No departments match ${selectedDepartmentTitle}.`
                      : `No departments match “${query.trim()}”.`}
                </td>
              </tr>
            ) : (
              pagedDepartments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/80">
                  {showCollege && <td className="px-4 py-3 text-slate-600">{dept.college_title}</td>}
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/admin/register/department/${dept.id}`}
                      className="hover:text-emerald-800 hover:underline"
                    >
                      {dept.title_en}
                    </Link>
                    {!dept.showInDepartmentsMenu ? (
                      <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Hidden from menu
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{dept.sort_order}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{dept.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit ? (
                        <Link
                          href={`/admin/register/department/${dept.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/register/department/${dept.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          View
                        </Link>
                      )}
                      {canDelete && (
                        <DeleteRowButton
                          label={dept.title_en}
                          onConfirm={() => deleteDepartmentAction(dept.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredDepartments.length > 0 && (
        <nav
          className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Pagination"
        >
          <p className="text-sm text-slate-500">
            Showing {rangeStart}–{rangeEnd} of {filteredDepartments.length}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </button>
              <span className="px-2 text-sm font-medium text-slate-600">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </nav>
      )}
    </section>
  );
}

function matchesFacultyQuery(member: FacultyListItem, query: string, includeCollege: boolean) {
  const parts = [
    member.department_title,
    member.name_en,
    member.email ?? "",
    ...(member.other_departments ?? []),
  ];
  if (includeCollege) parts.push(member.college_title);
  return parts.join(" ").toLowerCase().includes(query);
}

type FacultyGroup = {
  key: string;
  personId: string | null;
  name: string;
  email: string | null;
  rows: FacultyListItem[];
};

function groupFaculty(rows: FacultyListItem[]): FacultyGroup[] {
  const map = new Map<string, FacultyGroup>();
  for (const row of rows) {
    const key = row.person_id || row.id;
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
      if (!existing.email && row.email) existing.email = row.email;
    } else {
      map.set(key, {
        key,
        personId: row.person_id,
        name: row.name_en,
        email: row.email,
        rows: [row],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function FacultyRegisterList({
  faculty,
  departments = [],
  collegePageId,
  canEdit = true,
  canDelete = true,
}: {
  faculty: FacultyListItem[];
  departments?: DepartmentOption[];
  collegePageId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();

  const departmentOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const dept of departments) {
      unique.set(dept.id, dept.title_en);
    }
    for (const row of faculty) {
      if (row.page_id && !unique.has(row.page_id)) {
        unique.set(row.page_id, row.department_title);
      }
    }
    return [...unique.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [departments, faculty]);

  const filteredFaculty = useMemo(() => {
    let rows = faculty;
    if (departmentId) {
      rows = rows.filter((member) => member.page_id === departmentId);
    }
    if (normalizedQuery) {
      rows = rows.filter((member) => matchesFacultyQuery(member, normalizedQuery, !collegePageId));
    }
    return rows;
  }, [faculty, departmentId, normalizedQuery, collegePageId]);

  const groups = useMemo(() => groupFaculty(filteredFaculty), [filteredFaculty]);
  const totalPeople = useMemo(() => groupFaculty(faculty).length, [faculty]);
  const hasFilter = Boolean(normalizedQuery || departmentId);
  const selectedDepartmentTitle = departmentOptions.find((dept) => dept.id === departmentId)?.title;
  const totalPages = Math.max(1, Math.ceil(groups.length / ADMIN_DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * ADMIN_DEFAULT_PAGE_SIZE;
  const pagedGroups = groups.slice(pageStart, pageStart + ADMIN_DEFAULT_PAGE_SIZE);
  const rangeStart = groups.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + ADMIN_DEFAULT_PAGE_SIZE, groups.length);

  function editHref(group: FacultyGroup) {
    if (group.personId) return `/admin/register/faculty/person/${group.personId}`;
    return `/admin/register/faculty/${group.rows[0].id}`;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Registered faculty</h2>
            <p className="text-xs text-slate-500">
              {hasFilter
                ? `${groups.length} of ${totalPeople} people shown`
                : `${groups.length} ${groups.length === 1 ? "person" : "people"} · ${faculty.length} assignment${faculty.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            {departmentOptions.length > 0 ? (
              <label className="w-full sm:w-64">
                <span className="sr-only">Filter by department</span>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Filter by department"
                >
                  <option value="">All departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Search faculty by name or email"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Person</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Departments</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {faculty.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No faculty registered yet.
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  {departmentId && normalizedQuery
                    ? `No faculty match “${query.trim()}” in ${selectedDepartmentTitle}.`
                    : departmentId
                      ? `No faculty in ${selectedDepartmentTitle}.`
                      : `No faculty match “${query.trim()}”.`}
                </td>
              </tr>
            ) : (
              pagedGroups.map((group) => (
                <tr key={group.key} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={editHref(group)} className="hover:text-emerald-800 hover:underline">
                      {group.name}
                    </Link>
                    {group.email ? <span className="mt-0.5 block text-xs font-normal text-slate-500">{group.email}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {group.rows.map((row) => (
                        <span
                          key={row.id}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            row.member_type === "hod" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          }`}
                          title={row.designation_en}
                        >
                          {row.member_type === "hod" ? "HOD · " : ""}
                          {row.department_title}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {group.rows[0]?.detail_href && (
                        <a
                          href={group.rows[0].detail_href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Public
                        </a>
                      )}
                      <Link
                        href={editHref(group)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        {canEdit ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                        {canEdit ? "Edit profile" : "View"}
                      </Link>
                      {canDelete && !group.personId && (
                        <DeleteRowButton
                          label={group.name}
                          onConfirm={() => deleteFacultyAction(group.rows[0].id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {groups.length > 0 && (
        <nav
          className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Pagination"
        >
          <p className="text-sm text-slate-500">
            Showing {rangeStart}–{rangeEnd} of {groups.length}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </button>
              <span className="px-2 text-sm font-medium text-slate-600">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </nav>
      )}
    </section>
  );
}
