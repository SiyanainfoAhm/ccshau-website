"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, Mail, MapPin, Phone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FooterSocialIcons } from "@/components/design/shared/footer-social-icons";
import { useLanguage } from "@/components/design/shared/language-context";
import { usePublicSiteChrome } from "@/components/site/public-site-context";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import type { PublicNavItem, PublicQuickLink } from "@/lib/data/public-types";
import type { PublicMicrositeFooter } from "@/lib/pages/microsite-footer";
import { quickLinks, university } from "@/lib/mock/site-content";

/** Keep the footer compact; full list lives on /quick-links. */
const FOOTER_QUICK_LINKS_LIMIT = 10;

function isRealHref(href: string | null | undefined): href is string {
  const value = href?.trim();
  return Boolean(value && value !== "#");
}

function FooterNavLink({
  item,
  className,
}: {
  item: PublicNavItem;
  className: string;
}) {
  const { t } = useLanguage();
  const label = t(item.labelEn, item.labelHi ?? item.labelEn);
  if (!isRealHref(item.href)) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link
      href={item.href}
      className={className}
      {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </Link>
  );
}

function FooterHauMenu({ items }: { items: PublicNavItem[] }) {
  const { t } = useLanguage();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState(0);
  const [panelBox, setPanelBox] = useState<{ right: number; bottom: number } | null>(null);
  const openAnchorRef = useRef<HTMLLIElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const placePanel = useCallback(() => {
    const anchor = openAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPanelBox({
      right: Math.max(8, window.innerWidth - rect.right),
      bottom: Math.max(8, window.innerHeight - rect.top + 4),
    });
  }, []);

  useEffect(() => {
    if (!openKey) return;
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (openAnchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpenKey(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openKey, placePanel]);

  return (
    <ul className="space-y-1 text-sm">
      {items.map((item, index) => {
        const key = `${item.labelEn}-${index}`;
        const children = (item.children ?? []).filter((child) => child.labelEn?.trim());
        const open = openKey === key;
        const selected = children[activeChild] ?? children[0];
        const grandchildren = (selected?.children ?? []).filter((child) => child.labelEn?.trim());
        return (
          <li key={key} ref={open ? openAnchorRef : undefined} className="relative">
            <div className="flex items-center gap-1">
              <FooterNavLink item={item} className="text-emerald-100/90 hover:text-amber-200 hover:underline" />
              {children.length > 0 && (
                <button
                  type="button"
                  className="rounded p-0.5 text-amber-200 hover:bg-white/10"
                  aria-expanded={open}
                  aria-label={t(`Open ${item.labelEn}`, `${item.labelEn} खोलें`)}
                  onClick={() => {
                    setActiveChild(children.findIndex((child) => (child.children?.length ?? 0) > 0) || 0);
                    setOpenKey(open ? null : key);
                  }}
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} aria-hidden />
                </button>
              )}
            </div>
            {open && children.length > 0 && panelBox
              ? createPortal(
              <div
                ref={panelRef}
                className="fixed z-[80] flex max-h-[70vh] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-800 shadow-xl"
                style={{
                  right: panelBox.right,
                  bottom: panelBox.bottom,
                  maxWidth: `calc(100vw - ${panelBox.right + 72}px)`,
                }}
              >
                {grandchildren.length > 0 && (
                  <ul className="grid max-h-[70vh] min-w-0 flex-1 grid-cols-2 content-start gap-x-4 overflow-y-auto border-r border-slate-100 p-3">
                    {grandchildren.map((child) => (
                      <li key={`${child.href}-${child.labelEn}`}>
                        <FooterNavLink
                          item={child}
                          className="block py-1.5 text-sm text-slate-800 hover:text-emerald-800 hover:underline"
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="max-h-[70vh] w-56 shrink-0 overflow-y-auto py-1">
                  {children.map((child, childIndex) => {
                    const hasKids = (child.children?.length ?? 0) > 0;
                    const active = childIndex === activeChild;
                    return (
                      <li
                        key={`${child.href}-${child.labelEn}`}
                        onMouseEnter={() => setActiveChild(childIndex)}
                        onFocus={() => setActiveChild(childIndex)}
                      >
                        {hasKids || !isRealHref(child.href) ? (
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                              active ? "bg-emerald-800 font-semibold text-white" : "hover:bg-emerald-50"
                            }`}
                            onClick={() => setActiveChild(childIndex)}
                          >
                            {hasKids && <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                            <span className="flex-1">{t(child.labelEn, child.labelHi ?? child.labelEn)}</span>
                          </button>
                        ) : (
                          <Link
                            href={child.href}
                            className={`flex w-full items-center px-3 py-2 text-sm ${
                              active ? "bg-emerald-800 font-semibold text-white" : "hover:bg-emerald-50"
                            }`}
                            {...(child.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          >
                            {t(child.labelEn, child.labelHi ?? child.labelEn)}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>,
              document.body,
            )
              : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SiteFooter({
  variant = "future",
  quickLinks: quickLinksProp,
  microsite = null,
}: {
  variant?: "heritage" | "future" | "ministry";
  quickLinks?: PublicQuickLink[];
  microsite?: PublicMicrositeFooter | null;
}) {
  const { t } = useLanguage();
  const chrome = usePublicSiteChrome();
  // Prefer CMS Quick Links menu (all active items). Footer menu is a separate column source.
  const allQuickLinks: PublicQuickLink[] =
    quickLinksProp ??
    chrome?.quickLinks ??
    chrome?.footerLinks ??
    quickLinks.map((label) => ({ labelEn: label, labelHi: null, href: "#" }));
  const footerLinks = allQuickLinks.slice(0, FOOTER_QUICK_LINKS_LIMIT);
  const hasMoreQuickLinks = allQuickLinks.length > FOOTER_QUICK_LINKS_LIMIT;
  const socialLinks = chrome?.socialLinks ?? [];
  const headerNav = chrome?.headerNav ?? [];
  const isHeritage = variant === "heritage";
  const isMinistry = variant === "ministry";
  const isFuture = variant === "future";

  if (isFuture && microsite) {
    const linkClass = "text-emerald-100/90 transition hover:text-amber-200 hover:underline";
    return (
      <footer className="footer-future border-t border-emerald-800/50 text-emerald-50">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400" aria-hidden />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {microsite.sections.map((section, index) => (
            <div key={`${section.titleEn}-${index}`} className="space-y-3">
              {(section.titleEn || section.titleHi) && (
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  {t(section.titleEn, section.titleHi || section.titleEn)}
                </h3>
              )}
              {index === 0 && (
                <div className="space-y-2 text-sm text-emerald-100/90">
                  <p className="font-display text-lg font-bold text-white">{t(microsite.nameEn, microsite.nameHi)}</p>
                  {(microsite.descriptionEn || microsite.descriptionHi) && (
                    <p>{t(microsite.descriptionEn, microsite.descriptionHi || microsite.descriptionEn)}</p>
                  )}
                  {microsite.addressEn && (
                    <p className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                      {t(microsite.addressEn, microsite.addressHi || microsite.addressEn)}
                    </p>
                  )}
                  {microsite.phone && (
                    <p className="flex gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                      {microsite.phone}
                    </p>
                  )}
                  {microsite.email && (
                    <p className="flex gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                      <span>{microsite.email}</span>
                    </p>
                  )}
                </div>
              )}
              {index === 3 && microsite.useHauLinks ? (
                <FooterHauMenu items={headerNav} />
              ) : (
                section.links.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {section.links.map((link) => (
                      <li key={`${link.href}-${link.labelEn}`}>
                        <Link href={link.href} className={linkClass}>
                          {t(link.labelEn, link.labelHi || link.labelEn)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}
        </div>
      </footer>
    );
  }

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
            <FooterSocialIcons
              links={socialLinks}
              linkClassName="rounded-full border border-white/15 bg-white/10 p-2.5 text-amber-200 transition hover:border-amber-300/40 hover:bg-amber-400/20 hover:text-white"
              getAriaLabel={(link) => t(link.labelEn, link.labelHi)}
            />
          </div>

          <div className="lg:col-span-1">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-amber-300">
              {t("Quick Links", "त्वरित लिंक")}
            </h3>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              {footerLinks.map((link, index) => {
                const isExternal =
                  link.openInNewTab === true || /^https?:\/\//i.test(link.href);
                return (
                  <li key={`${link.href}-${link.labelEn}-${index}`}>
                    <Link
                      href={link.href}
                      {...(isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-emerald-100/85 transition hover:text-amber-200 hover:underline"
                    >
                      {t(link.labelEn, link.labelHi ?? link.labelEn)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4">
              <Link
                href={SELECTED_LAYOUT.routes.quickLinks}
                className="inline-flex items-center text-sm font-semibold text-amber-300 transition hover:text-amber-200 hover:underline"
              >
                {hasMoreQuickLinks
                  ? t("View all quick links", "सभी त्वरित लिंक देखें")
                  : t("All quick links", "सभी त्वरित लिंक")}
              </Link>
            </p>
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
                <a href="mailto:web@hau.ac.in" className="transition hover:text-amber-200">
                  web@hau.ac.in
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
                { label: "RTI", href: SELECTED_LAYOUT.routes.rti },
                { label: "NIRF", href: "#" },
                { label: t("Circulars", "परिपत्र"), href: SELECTED_LAYOUT.routes.circulars },
                { label: t("Tenders", "निविदाएं"), href: SELECTED_LAYOUT.routes.tenders },
                { label: t("Contact", "संपर्क"), href: SELECTED_LAYOUT.routes.contact },
                {
                  label: t("Screen Reader Access", "स्क्रीन रीडर"),
                  href: SELECTED_LAYOUT.routes.screenReaderAccess,
                },
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
            className={`font-display text-2xl font-bold ${isHeritage ? "text-gradient-heritage" : "text-[#0c3b6e]"}`}
          >
            {university.shortName}
          </p>
          <p className="mt-2 font-hindi text-sm leading-relaxed opacity-90">
            {t(university.nameEn, university.nameHi)}
          </p>
          <FooterSocialIcons
            links={socialLinks}
            className="mt-4 flex flex-wrap gap-3"
            linkClassName={
              isHeritage
                ? "rounded-full bg-gradient-to-br from-rose-100 to-violet-100 p-2 text-violet-600 transition hover:from-rose-200 hover:to-violet-200"
                : "rounded-full bg-sky-100 p-2 text-[#0c3b6e] transition hover:bg-sky-200"
            }
            getAriaLabel={(link) => t(link.labelEn, link.labelHi)}
          />
        </div>

        <div>
          <h3
            className={`mb-4 font-semibold ${isHeritage ? "text-[#9e4a5a]" : "text-[#0c3b6e]"}`}
          >
            {t("Quick Links", "त्वरित लिंक")}
          </h3>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {footerLinks.map((link, index) => {
              const isExternal =
                link.openInNewTab === true || /^https?:\/\//i.test(link.href);
              return (
                <li key={`${link.href}-${link.labelEn}-${index}`}>
                  <Link
                    href={link.href}
                    {...(isExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="opacity-85 transition hover:opacity-100 hover:underline"
                  >
                    {t(link.labelEn, link.labelHi ?? link.labelEn)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3">
            <Link
              href={SELECTED_LAYOUT.routes.quickLinks}
              className={`text-sm font-semibold hover:underline ${isHeritage ? "text-[#9e4a5a]" : "text-[#0c3b6e]"}`}
            >
              {hasMoreQuickLinks
                ? t("View all quick links", "सभी त्वरित लिंक देखें")
                : t("All quick links", "सभी त्वरित लिंक")}
            </Link>
          </p>
        </div>

        <div>
          <h3
            className={`mb-4 font-semibold ${isHeritage ? "text-[#9e4a5a]" : "text-[#0c3b6e]"}`}
          >
            {t("Visit Us", "हमसे मिलें")}
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin
                className={`mt-0.5 h-4 w-4 shrink-0 ${isHeritage ? "text-[#b45368]" : "text-[#0c3b6e]"}`}
              />
              {university.location}
            </li>
            <li className="flex gap-2">
              <Phone
                className={`h-4 w-4 shrink-0 ${isHeritage ? "text-[#b45368]" : "text-[#0c3b6e]"}`}
              />
              {university.phone}
            </li>
          </ul>
        </div>

        <div>
          <h3
            className={`mb-4 font-semibold ${isHeritage ? "text-[#9e4a5a]" : "text-[#0c3b6e]"}`}
          >
            {t("Important", "महत्वपूर्ण")}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/rti" className="hover:underline">
                RTI
              </Link>
            </li>
            <li>
              <Link href={SELECTED_LAYOUT.routes.screenReaderAccess} className="hover:underline">
                {t("Screen Reader Access", "स्क्रीन रीडर")}
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
