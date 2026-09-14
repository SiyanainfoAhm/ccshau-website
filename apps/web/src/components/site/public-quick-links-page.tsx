"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ExternalLink, Link2 } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import { usePublicSiteChrome } from "@/components/site/public-site-context";
import type { PublicQuickLink } from "@/lib/data/public-types";
import {
  publicCardSoftClass,
  publicMainGradientClass,
  publicMutedTextClass,
  typeHeroTitleClass,
} from "@/lib/design/public-page-classes";

function isExternalQuickLink(link: PublicQuickLink): boolean {
  return link.openInNewTab === true || /^https?:\/\//i.test(link.href);
}

export function PublicQuickLinksPage() {
  const { t } = useLanguage();
  const chrome = usePublicSiteChrome();
  const links = chrome?.quickLinks ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader variant="future" />
      <main id="main-content" tabIndex={-1} className={publicMainGradientClass}>
        <div className="gradient-hero pattern-dots px-4 py-12 text-white">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> {t("Home", "होम")}
            </Link>
            <h1 className={typeHeroTitleClass}>{t("Quick Links", "त्वरित लिंक")}</h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-100/90 sm:text-base">
              {t(
                "Browse all frequently used university services and resources in one place.",
                "विश्वविद्यालय की सभी प्रमुख सेवाएँ और संसाधन एक ही स्थान पर देखें।",
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          {links.length === 0 ? (
            <p className={publicMutedTextClass}>
              {t("No quick links are available right now.", "इस समय कोई त्वरित लिंक उपलब्ध नहीं है।")}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link, index) => {
                const external = isExternalQuickLink(link);
                return (
                  <li key={`${link.href}-${link.labelEn}-${index}`}>
                    <Link
                      href={link.href}
                      {...(external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={`${publicCardSoftClass} group flex h-full items-start gap-3 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700`}
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
                        <Link2 className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-slate-800 dark:text-emerald-50">
                          {t(link.labelEn, link.labelHi ?? link.labelEn)}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          {external
                            ? t("Open link", "लिंक खोलें")
                            : t("View page", "पेज देखें")}
                          {external ? (
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter variant="future" />
    </div>
  );
}
