"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, ScrollText, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type {
  PublicCircularCategory,
  PublicCircularItem,
} from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import {
  publicCardClass,
  publicMainClass,
  publicSearchInputClass,
  typeHeroTitleClass,
} from "@/lib/design/public-page-classes";

export function PublicCircularsListing({
  data,
  offices,
  initialQuery,
  activeOfficeSlug,
  activeBranchSlug,
}: {
  data: PaginatedResult<PublicCircularItem>;
  offices: PublicCircularCategory[];
  initialQuery: string;
  activeOfficeSlug: string | null;
  activeBranchSlug: string | null;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const activeOffice = useMemo(() => {
    if (!offices.length) return null;
    return (
      offices.find((o) => o.slug === activeOfficeSlug) ??
      offices[0] ??
      null
    );
  }, [offices, activeOfficeSlug]);

  const branches = activeOffice?.children ?? [];
  const activeBranch = useMemo(() => {
    if (!branches.length) return null;
    return (
      branches.find((b) => b.slug === activeBranchSlug) ??
      branches[0] ??
      null
    );
  }, [branches, activeBranchSlug]);

  function pushParams(next: {
    office?: string | null;
    branch?: string | null;
    q?: string | null;
    clearPage?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.office !== undefined) {
      if (next.office) params.set("office", next.office);
      else params.delete("office");
    }
    if (next.branch !== undefined) {
      if (next.branch) params.set("branch", next.branch);
      else params.delete("branch");
    }
    if (next.q !== undefined) {
      if (next.q?.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.clearPage) params.delete("page");
    router.push(`/circulars?${params.toString()}`, { scroll: false });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: query, clearPage: true });
  }

  function selectOffice(office: PublicCircularCategory) {
    const firstBranch = office.children[0]?.slug ?? null;
    pushParams({
      office: office.slug,
      branch: firstBranch,
      clearPage: true,
    });
  }

  function selectBranch(branch: PublicCircularCategory) {
    pushParams({
      office: activeOffice?.slug ?? null,
      branch: branch.slug,
      clearPage: true,
    });
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" tabIndex={-1} className={publicMainClass}>
        <div className="gradient-hero px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className={typeHeroTitleClass}>
              {t("Circular Section", "परिपत्र अनुभाग")}
            </h1>
            <p className="mt-2 text-emerald-100">
              {t(
                "Official university circulars and administrative orders",
                "आधिकारिक विश्वविद्यालय परिपत्र",
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          {offices.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div
                role="tablist"
                aria-label={t("Circular offices", "परिपत्र कार्यालय")}
                className="flex min-w-max gap-1 border-b border-emerald-200"
              >
                {offices.map((office) => {
                  const selected = activeOffice?.id === office.id;
                  return (
                    <button
                      key={office.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => selectOffice(office)}
                      className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
                        selected
                          ? "border-b-2 border-emerald-800 text-emerald-900"
                          : "text-slate-600 hover:text-emerald-800"
                      }`}
                    >
                      {t(office.nameEn, office.nameHi ?? office.nameEn)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {branches.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div
                role="tablist"
                aria-label={t("Circular branches", "परिपत्र शाखाएँ")}
                className="flex min-w-max gap-1 rounded-xl bg-emerald-50/80 p-1"
              >
                {branches.map((branch) => {
                  const selected = activeBranch?.id === branch.id;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => selectBranch(branch)}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
                        selected
                          ? "bg-white text-emerald-900 shadow-sm"
                          : "text-slate-600 hover:text-emerald-800"
                      }`}
                    >
                      {t(branch.nameEn, branch.nameHi ?? branch.nameEn)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSearch} className="mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  "Search by title or circular number…",
                  "शीर्षक या परिपत्र संख्या से खोजें…",
                )}
                className={publicSearchInputClass}
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
            >
              {t("Search", "खोजें")}
            </button>
          </form>

          <div className={`overflow-hidden ${publicCardClass}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="px-5 py-4 font-semibold">{t("Title", "शीर्षक")}</th>
                  <th className="hidden px-5 py-4 font-semibold md:table-cell">
                    {t("Published", "प्रकाशित")}
                  </th>
                  <th className="px-5 py-4 font-semibold">{t("Download", "डाउनलोड")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                      {t(
                        "No circulars published in this section yet.",
                        "इस अनुभाग में अभी कोई परिपत्र प्रकाशित नहीं है।",
                      )}
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-emerald-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ScrollText className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="font-medium text-slate-900">
                            {t(item.titleEn, item.titleHi ?? item.titleEn)}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {item.fileUrl ? (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <Download className="h-4 w-4" />
                            {item.fileName ?? "PDF"}
                          </a>
                        ) : (
                          "—"
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
