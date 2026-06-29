"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, Share2, Video } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { usePublicSiteChrome } from "@/components/site/public-site-context";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import type { PublicQuickLink } from "@/lib/data/public-types";
import { quickLinks, university } from "@/lib/mock/site-content";

export function SiteFooter({
  variant = "future",
  quickLinks: quickLinksProp,
}: {
  variant?: "heritage" | "future" | "ministry";
  quickLinks?: PublicQuickLink[];
}) {
  const { t } = useLanguage();
  const chrome = usePublicSiteChrome();
  const footerLinks =
    quickLinksProp ??
    chrome?.footerLinks ??
    quickLinks.map((label) => ({ labelEn: label, labelHi: null, href: "#" }));
  const isHeritage = variant === "heritage";
  const isMinistry = variant === "ministry";
  const isFuture = variant === "future";

  if (isFuture) {
    return (
      <footer className="footer-future border-t border-emerald-800/50 text-emerald-50">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400" aria-hidden />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-bold text-gradient-gold">{university.shortName}</p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">
              {t(university.nameEn, university.nameHi)}
            </p>
            <p className="mt-2 text-xs font-medium text-amber-200/90">
              {t(university.taglineEn, university.taglineHi)}
            </p>
            <div className="mt-5 flex gap-2">
              {[Share2, Video, Mail, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={t("Social link", "सोशल लिंक")}
                  className="rounded-full border border-white/15 bg-white/10 p-2.5 text-amber-200 transition hover:border-amber-300/40 hover:bg-amber-400/20 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-300">
              {t("Quick Links", "त्वरित लिंक")}
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {footerLinks.slice(0, 8).map((link) => (
                <li key={link.labelEn}>
                  <Link
                    href={link.href}
                    className="text-emerald-100/85 transition hover:text-amber-200 hover:underline"
                  >
                    {t(link.labelEn, link.labelHi ?? link.labelEn)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-300">
              {t("Visit Us", "हमसे मिलें")}
            </h3>
            <ul className="space-y-4 text-sm text-emerald-100/90">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <span>{university.location}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <a href={`tel:${university.phone}`} className="transition hover:text-amber-200">
                  {university.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <a href="mailto:info@hau.ac.in" className="transition hover:text-amber-200">
                  info@hau.ac.in
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-300">
              {t("Important", "महत्वपूर्ण")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "RTI", href: "#" },
                { label: "NIRF", href: "#" },
                { label: t("Tenders", "निविदाएं"), href: SELECTED_LAYOUT.routes.tenders },
                { label: t("Contact", "संपर्क"), href: SELECTED_LAYOUT.routes.contact },
                { label: t("Design Gallery", "डिज़ाइन गैलरी"), href: SELECTED_LAYOUT.galleryPath },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-emerald-100/85 transition hover:text-amber-200 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/20 px-4 py-5 text-center text-xs text-emerald-200/80">
          © {new Date().getFullYear()} {university.shortName}, Hisar.{" "}
          {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={
        isHeritage
          ? "gradient-heritage-light pattern-heritage-light border-t border-rose-100 text-slate-700"
          : "border-t border-slate-200 bg-slate-50 text-slate-700"
      }
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p
            className={`font-display text-2xl font-bold ${isHeritage ? "text-gradient-heritage" : "text-[#146c43]"}`}
          >
            {university.shortName}
          </p>
          <p className="mt-2 font-hindi text-sm leading-relaxed opacity-90">
            {t(university.nameEn, university.nameHi)}
          </p>
          <div className="mt-4 flex gap-3">
            {[Share2, Video, Mail, Mail].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className={`rounded-full p-2 transition ${isHeritage ? "bg-gradient-to-br from-rose-100 to-violet-100 text-violet-600 hover:from-rose-200 hover:to-violet-200" : "bg-emerald-100 text-[#146c43] hover:bg-emerald-200"}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3
            className={`mb-4 font-semibold ${isHeritage ? "text-[#9e4a5a]" : "text-[#146c43]"}`}
          >
            {t("Quick Links", "त्वरित लिंक")}
          </h3>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {quickLinks.slice(0, 8).map((link) => (
              <li key={link}>
                <Link href="#" className="opacity-85 transition hover:opacity-100 hover:underline">
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3
            className={`mb-4 font-semibold ${isHeritage ? "text-[#9e4a5a]" : "text-[#146c43]"}`}
          >
            {t("Visit Us", "हमसे मिलें")}
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin
                className={`mt-0.5 h-4 w-4 shrink-0 ${isHeritage ? "text-[#b45368]" : "text-[#146c43]"}`}
              />
              {university.location}
            </li>
            <li className="flex gap-2">
              <Phone
                className={`h-4 w-4 shrink-0 ${isHeritage ? "text-[#b45368]" : "text-[#146c43]"}`}
              />
              {university.phone}
            </li>
          </ul>
        </div>

        <div>
          <h3
            className={`mb-4 font-semibold ${isHeritage ? "text-[#9e4a5a]" : "text-[#146c43]"}`}
          >
            {t("Important", "महत्वपूर्ण")}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="#" className="hover:underline">
                RTI
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline">
                NIRF
              </Link>
            </li>
            <li>
              <Link href="/design/option-c/tenders" className="hover:underline">
                {t("Tenders", "निविदाएं")}
              </Link>
            </li>
            <li>
              <Link href="/design" className="hover:underline">
                UI Design Gallery
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {isMinistry && <div className="goi-tricolor-bar" />}
      {isHeritage && <div className="heritage-rainbow-bar" />}
      <div
        className={`border-t px-4 py-4 text-center text-xs ${isHeritage ? "border-rose-100 text-slate-500" : "border-slate-200 text-slate-500"}`}
      >
        © {new Date().getFullYear()} {university.shortName}, Hisar.{" "}
        {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
      </div>
    </footer>
  );
}
