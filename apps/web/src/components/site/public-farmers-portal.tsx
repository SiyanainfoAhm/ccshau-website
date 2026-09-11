"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { PublicPdfViewer } from "@/components/site/public-pdf-viewer";
import {
  FARMERS_PORTAL_INTRO_EN,
  FARMERS_PORTAL_INTRO_HI,
  FARMERS_PORTAL_ITEMS,
  type FarmersPortalItem,
} from "@/lib/data/farmers-portal-content";
import {
  publicCardClass,
  publicMainClass,
  publicProseClass,
  publicSidebarClass,
  typeHeroTitleClass,
  typeSidebarHeadingClass,
} from "@/lib/design/public-page-classes";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import { getStoredFileUrl } from "@/lib/storage/urls";

function resolveItemUrl(item: FarmersPortalItem): string | null {
  if (item.kind === "pdf" && item.pdfStoredPath) {
    return getStoredFileUrl(item.pdfStoredPath);
  }
  if (item.href) return item.href;
  return null;
}

export function PublicFarmersPortal() {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => FARMERS_PORTAL_ITEMS.find((item) => item.id === activeId) ?? null,
    [activeId],
  );

  const activePdfUrl =
    active?.kind === "pdf" && active.pdfStoredPath
      ? getStoredFileUrl(active.pdfStoredPath)
      : null;

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
            <p className="text-sm font-medium text-amber-200/90">
              {t("Welcome to The", "आपका स्वागत है")}
            </p>
            <h1 className={`mt-1 ${typeHeroTitleClass}`}>
              {t("Farmers' Portal", "किसान पोर्टल")}
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className={`${publicCardClass} p-6 sm:p-8`}>
              {!active ? (
                <div className={publicProseClass}>
                  <p className="text-justify text-[17px] leading-relaxed text-slate-700">
                    {t(FARMERS_PORTAL_INTRO_EN, FARMERS_PORTAL_INTRO_HI)}
                  </p>
                </div>
              ) : active.kind === "pdf" && activePdfUrl ? (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-emerald-900">
                    {active.labelEn}
                  </h2>
                  <PublicPdfViewer src={activePdfUrl} title={active.labelEn} />
                </div>
              ) : active.kind === "html" && active.htmlEn ? (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-emerald-900">
                    {active.labelEn}
                  </h2>
                  <CmsHtmlContent html={active.htmlEn} className={publicProseClass} />
                </div>
              ) : (
                <p className="text-slate-600">
                  {t("Content is not available yet.", "सामग्री अभी उपलब्ध नहीं है।")}
                </p>
              )}
            </div>

            <aside className={publicSidebarClass}>
              <h2
                className={`border-b border-emerald-100 bg-emerald-50 px-4 py-3 ${typeSidebarHeadingClass}`}
              >
                {t("Quick Link", "त्वरित लिंक")}
              </h2>
              <ul className="divide-y divide-slate-100">
                {FARMERS_PORTAL_ITEMS.map((item) => {
                  const isActive = activeId === item.id;
                  const url = resolveItemUrl(item);
                  const baseClass = `flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-emerald-50 hover:text-emerald-900 ${
                    isActive ? "bg-emerald-50 text-emerald-900" : "text-slate-700"
                  }`;

                  if (item.kind === "external" || item.kind === "page") {
                    if (!url) return null;
                    return (
                      <li key={item.id}>
                        <a
                          href={url}
                          target={item.openInNewTab ? "_blank" : undefined}
                          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                          className={baseClass}
                        >
                          <span className="flex-1">{item.labelEn}</span>
                          {item.openInNewTab ? (
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                          ) : null}
                        </a>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className={baseClass}
                      >
                        {item.kind === "pdf" ? (
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : null}
                        <span className="flex-1">{item.labelEn}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
