"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Gavel } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicTenderItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

export function PublicTendersListing({
  data,
  activeStatus,
}: {
  data: PaginatedResult<PublicTenderItem>;
  activeStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    params.delete("page");
    router.push(`/tenders?${params.toString()}`);
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-slate-50">
        <div className="gradient-hero px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">Tenders & Auctions</h1>
            <p className="mt-2 text-emerald-100">निविदाएं और नीलामी</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Open", value: "open" },
              { label: "Closed", value: "closed" },
              { label: "Archived", value: "archived" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  activeStatus === tab.value
                    ? "bg-[#0b3d2e] text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-4 font-semibold">Title</th>
                  <th className="hidden px-5 py-4 font-semibold md:table-cell">Department</th>
                  <th className="px-5 py-4 font-semibold">Closing</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                      No tenders published yet.
                    </td>
                  </tr>
                ) : (
                  data.items.map((tender) => (
                    <tr key={tender.id} className="border-t border-slate-100 hover:bg-emerald-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Gavel className="h-4 w-4 shrink-0 text-emerald-600" />
                          <Link
                            href={`/tenders/${tender.slug}`}
                            className="font-medium text-slate-900 hover:text-emerald-800 hover:underline"
                          >
                            {tender.titleEn}
                          </Link>
                        </div>
                        {tender.tenderNumber && (
                          <p className="mt-1 text-xs text-slate-500">{tender.tenderNumber}</p>
                        )}
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                        {tender.departmentName ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {tender.closingDate
                          ? new Date(tender.closingDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                            tender.status === "open"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tender.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {tender.documents[0]?.url ? (
                          <a
                            href={tender.documents[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <Download className="h-4 w-4" /> PDF
                          </a>
                        ) : (
                          <Link href={`/tenders/${tender.slug}`} className="text-emerald-700 hover:underline">
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PublicPagination data={data} />
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
