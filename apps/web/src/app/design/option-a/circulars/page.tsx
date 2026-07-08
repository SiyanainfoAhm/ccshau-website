"use client";

import { Download, ScrollText } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { HeritageInnerHero } from "@/components/design/shared/heritage-inner-hero";
import { useLanguage } from "@/components/design/shared/language-context";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import {
  OPTION_A_BASE,
  optionADemoCirculars,
  optionANavItems,
} from "@/lib/design/option-a-demo";

export default function OptionACircularsPage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <CircularsContent />
    </DesignShell>
  );
}

function CircularsContent() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader
        variant="heritage"
        homeHref={OPTION_A_BASE}
        navItems={optionANavItems}
        showMainNav
      />
      <main id="main-content" className="flex-1">
        <HeritageInnerHero
          title="Circulars & Orders"
          titleHi="परिपत्र और आदेश"
          subtitle="Official circulars in a warm heritage table with rose accents."
          subtitleHi="गुलाबी रंगों के साथ विरासत शैली में आधिकारिक परिपत्र।"
        />

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-lg shadow-rose-100/50">
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-white">
                {t("Published circulars", "प्रकाशित परिपत्र")}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Demo circulars for Heritage Premium layout</caption>
                <thead className="bg-gradient-to-r from-rose-50 to-amber-50 text-slate-700">
                  <tr>
                    <th className="px-5 py-3 font-bold" scope="col">
                      {t("Number", "संख्या")}
                    </th>
                    <th className="px-5 py-3 font-bold" scope="col">
                      {t("Title", "शीर्षक")}
                    </th>
                    <th className="hidden px-5 py-3 font-bold md:table-cell" scope="col">
                      {t("Department", "विभाग")}
                    </th>
                    <th className="px-5 py-3 font-bold" scope="col">
                      {t("Date", "तिथि")}
                    </th>
                    <th className="px-5 py-3 font-bold" scope="col">
                      {t("File", "फ़ाइल")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {optionADemoCirculars.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-rose-100 transition hover:bg-rose-50/60"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-violet-700">
                        {item.number}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                          <span className="font-semibold text-slate-900">
                            {t(item.titleEn, item.titleHi)}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 text-slate-600 md:table-cell">{item.dept}</td>
                      <td className="px-5 py-4 text-slate-600">{item.date}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-200"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter variant="heritage" />
    </>
  );
}
