"use client";

import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";

import type { CollegeOption } from "@/lib/pages/college-register-helpers";

export function CollegeRegisterList({ colleges }: { colleges: CollegeOption[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-display text-lg font-bold text-slate-900">Registered colleges</h2>
        <p className="text-xs text-slate-500">
          {colleges.length} college{colleges.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">College</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Slug</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {colleges.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No colleges registered yet. Use Register college to add one.
                </td>
              </tr>
            ) : (
              colleges.map((college) => (
                <tr key={college.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/register/${college.id}`}
                      className="font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
                    >
                      {college.title_en}
                    </Link>
                  </td>
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
