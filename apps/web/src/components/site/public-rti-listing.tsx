"use client";

import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { PublicPagination } from "@/components/site/public-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicDownloadItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import {
  publicCardClass,
  publicMainClass,
  typeHeroTitleClass,
} from "@/lib/design/public-page-classes";

export function PublicRtiListing({
  data,
}: {
  data: PaginatedResult<PublicDownloadItem>;
}) {
  const { t } = useLanguage();
  const pageOffset = (data.page - 1) * data.pageSize;

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
              <ArrowLeft className="h-4 w-4" /> {t("Back to home", "मुख्य पृष्ठ पर वापस")}
            </Link>
            <h1 className={typeHeroTitleClass}>
              {t("Right To Information", "सूचना का अधिकार")}
            </h1>
            <p className="mt-2 text-emerald-100">
              {t(
                "RTI Act documents, rules, and suo-motu disclosures",
                "आरटीआई अधिनियम दस्तावेज़, नियम और स्वतः प्रकटीकरण",
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className={`overflow-hidden ${publicCardClass}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white">
                <tr>
                  <th className="w-24 px-5 py-4 font-semibold">
                    {t("Sr. No.", "क्रमांक")}
                  </th>
                  <th className="px-5 py-4 font-semibold">{t("Content", "विषय")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-slate-500">
                      {t(
                        "No RTI documents published yet.",
                        "अभी कोई आरटीआई दस्तावेज़ प्रकाशित नहीं है।",
                      )}
                    </td>
                  </tr>
                ) : (
                  data.items.map((item, index) => {
                    const sr = pageOffset + index + 1;
                    const href = item.downloadUrl || item.fileUrl;
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 hover:bg-emerald-50/50"
                      >
                        <td className="px-5 py-4 align-top text-slate-600">{sr}.</td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-emerald-800 hover:underline"
                              >
                                {t(item.titleEn, item.titleHi ?? item.titleEn)}
                                <Download className="ml-1.5 inline h-3.5 w-3.5 opacity-70" />
                              </a>
                            ) : (
                              <span className="font-medium text-slate-900">
                                {t(item.titleEn, item.titleHi ?? item.titleEn)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
