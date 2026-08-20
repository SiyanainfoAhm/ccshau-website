"use client";

import { Download, Gavel } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { HeritageInnerHero } from "@/components/design/shared/heritage-inner-hero";
import { useLanguage } from "@/components/design/shared/language-context";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import {
  OPTION_A_BASE,
  optionADemoTenders,
  optionANavItems,
} from "@/lib/design/option-a-demo";

export default function OptionATendersPage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <TendersContent />
    </DesignShell>
  );
}

function TendersContent() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader
        variant="heritage"
        homeHref={OPTION_A_BASE}
        navItems={optionANavItems}
        showMainNav
      />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <HeritageInnerHero
          title="Tenders & Auctions"
          titleHi="निविदाएं और नीलामी"
          subtitle="Heritage card layout for active and closed university tenders."
          subtitleHi="सक्रिय और बंद विश्वविद्यालय निविदाओं के लिए विरासत कार्ड लेआउट।"
        />

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-4">
            {optionADemoTenders.map((item, i) => {
              const accents = [
                "from-rose-50 to-white border-rose-200",
                "from-amber-50 to-white border-amber-200",
                "from-sky-50 to-white border-sky-200",
                "from-violet-50 to-white border-violet-200",
              ];
              const iconBg = [
                "bg-rose-100 text-rose-700",
                "bg-amber-100 text-amber-700",
                "bg-sky-100 text-sky-700",
                "bg-violet-100 text-violet-700",
              ];
              return (
                <article
                  key={item.id}
                  className={`flex flex-col gap-4 rounded-2xl border bg-gradient-to-r p-5 shadow-sm sm:flex-row sm:items-center ${accents[i % accents.length]}`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg[i % iconBg.length]}`}
                  >
                    <Gavel className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      {t(item.title, item.titleHi)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.dept} · {item.date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      item.status === "Open"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.status === "Open" ? t("Open", "खुली") : t("Closed", "बंद")}
                  </span>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <SiteFooter variant="heritage" />
    </>
  );
}
