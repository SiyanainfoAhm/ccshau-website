"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { CollegeOption } from "@/lib/pages/college-register-helpers";
import { MICROSITE_KIND_LABELS, type MicrositeKind } from "@/lib/pages/microsite-kind";

type TypeFilter = "all" | MicrositeKind;

function matchesMicrositeQuery(college: CollegeOption, query: string) {
  const haystack = [college.title_en, college.slug, MICROSITE_KIND_LABELS[college.kind].en]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function CollegeRegisterList({ colleges }: { colleges: CollegeOption[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const hasActiveFilters = Boolean(normalizedQuery) || typeFilter !== "all";

  const filteredColleges = useMemo(() => {
    return colleges.filter((college) => {
      if (typeFilter !== "all" && college.kind !== typeFilter) return false;
      if (normalizedQuery && !matchesMicrositeQuery(college, normalizedQuery)) return false;
      return true;
    });
  }, [colleges, normalizedQuery, typeFilter]);

  const academicCount = colleges.filter((c) => c.kind === "academic").length;
  const directorateCount = colleges.filter((c) => c.kind === "directorate").length;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Registered microsites</h2>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? `${filteredColleges.length} of ${colleges.length} shown`
                : `${colleges.length} total`}
              {!hasActiveFilters && academicCount > 0
                ? ` · ${academicCount} college${academicCount === 1 ? "" : "s"}`
                : ""}
              {!hasActiveFilters && directorateCount > 0
                ? ` · ${directorateCount} directorate${directorateCount === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Filter microsites by type"
            >
              <option value="all">All types</option>
              <option value="academic">{MICROSITE_KIND_LABELS.academic.en}</option>
              <option value="directorate">{MICROSITE_KIND_LABELS.directorate.en}</option>
            </select>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Search microsites by name"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Slug</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {colleges.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No microsites registered yet. Register a college or directorate to get started.
                </td>
              </tr>
            ) : filteredColleges.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {normalizedQuery && typeFilter !== "all"
                    ? `No ${MICROSITE_KIND_LABELS[typeFilter].en.toLowerCase()} microsites match "${query.trim()}".`
                    : normalizedQuery
                      ? `No microsites match "${query.trim()}".`
                      : `No ${MICROSITE_KIND_LABELS[typeFilter].en.toLowerCase()} microsites found.`}
                </td>
              </tr>
            ) : (
              filteredColleges.map((college) => (
                <tr key={college.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/register/${college.id}`}
                      className="font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
                    >
                      {college.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{MICROSITE_KIND_LABELS[college.kind].en}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{college.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/college/${college.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        View
                      </a>
                      <Link
                        href={`/admin/pages/${college.id}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
