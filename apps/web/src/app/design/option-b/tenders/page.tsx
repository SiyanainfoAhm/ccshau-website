"use client";

import Link from "next/link";
import { ArrowLeft, Download, Gavel } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { tenders } from "@/lib/mock/site-content";

export default function TendersPage() {
  return (
    <DesignShell>
      <SiteHeader variant="future" homeHref="/design/option-b" />
      <main id="main-content" className="flex-1 bg-slate-50">
        <div className="gradient-hero px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/design/option-b"
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">Tenders & Auctions</h1>
            <p className="mt-2 text-emerald-100">निविदाएं और नीलामी</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-4 font-semibold">Title</th>
                  <th className="hidden px-5 py-4 font-semibold md:table-cell">Department</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-emerald-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Gavel className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="font-medium text-slate-900">{t.title}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-slate-600 md:table-cell">{t.dept}</td>
                    <td className="px-5 py-4 text-slate-600">{t.date}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${t.status === "Open" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        <Download className="h-4 w-4" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter variant="future" />
    </DesignShell>
  );
}
