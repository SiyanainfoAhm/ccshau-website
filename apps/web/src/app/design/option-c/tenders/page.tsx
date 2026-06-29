"use client";

import { Download, Gavel } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { MinistryInnerHero } from "@/components/design/shared/ministry-inner-hero";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { tenders } from "@/lib/mock/site-content";

export default function OptionCTendersPage() {
  return (
    <DesignShell className="bg-slate-50">
      <SiteHeader variant="ministry" homeHref="/design/option-c" />
      <main id="main-content" className="flex-1">
        <MinistryInnerHero title="Tenders & Auctions" titleHi="निविदाएं और नीलामी" />

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="overflow-hidden rounded-md border-2 border-slate-300 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Active tenders and auctions at CCSHAU</caption>
              <thead className="bg-[#146c43] text-white">
                <tr>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Title
                  </th>
                  <th className="hidden px-5 py-4 font-bold md:table-cell" scope="col">
                    Department
                  </th>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Date
                  </th>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Status
                  </th>
                  <th className="px-5 py-4 font-bold" scope="col">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((t) => (
                  <tr key={t.id} className="border-t border-slate-200 hover:bg-emerald-50/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Gavel className="h-4 w-4 shrink-0 text-[#146c43]" aria-hidden />
                        <span className="font-semibold text-slate-900">{t.title}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-slate-600 md:table-cell">{t.dept}</td>
                    <td className="px-5 py-4 text-slate-600">{t.date}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${
                          t.status === "Open"
                            ? "bg-emerald-100 text-[#146c43]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="ministry-focus inline-flex items-center gap-1 font-semibold text-[#146c43] hover:underline"
                      >
                        <Download className="h-4 w-4" aria-hidden /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter variant="ministry" />
    </DesignShell>
  );
}
