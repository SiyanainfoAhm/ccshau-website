"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import type { PublicNavItem } from "@/lib/data/public-types";

type NavTone = "future" | "heritage" | "ministry" | "light";

function hasGrandchildren(item: PublicNavItem): boolean {
  return Boolean(item.children?.some((child) => child.children && child.children.length > 0));
}

function MegaMenuPanel({
  item,
  resolveHref,
  open,
}: {
  item: PublicNavItem;
  resolveHref: (href: string) => string;
  open: boolean;
}) {
  const { lang, t } = useLanguage();
  const [activeChild, setActiveChild] = useState(0);
  const level2 = item.children ?? [];
  const level3 = level2[activeChild]?.children ?? [];

  return (
    <div
      className={`absolute left-0 right-0 top-full z-50 pt-1 transition ${
        open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex max-w-7xl overflow-hidden rounded-b-xl border border-slate-200 bg-white shadow-2xl">
        <div className="w-72 shrink-0 bg-gradient-to-b from-[#e85d04] to-[#f48c06] py-2">
          {level2.map((child, index) => {
            const isActive = index === activeChild;
            const hasKids = Boolean(child.children?.length);
            return (
              <button
                key={child.labelEn}
                type="button"
                onMouseEnter={() => setActiveChild(index)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold uppercase tracking-wide transition ${
                  isActive ? "bg-[#0b3d2e] text-white" : "text-white/95 hover:bg-white/15"
                }`}
              >
                <span className={lang === "hi" ? "font-hindi normal-case" : ""}>
                  {t(child.labelEn, child.labelHi ?? child.labelEn)}
                </span>
                {hasKids && <ChevronRight className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="min-h-[220px] flex-1 bg-[#f8faf8] p-4">
          {level3.length > 0 ? (
            <ul className="grid gap-1 sm:grid-cols-2">
              {level3.map((grandchild) => (
                <li key={grandchild.labelEn}>
                  <Link
                    href={resolveHref(grandchild.href)}
                    target={grandchild.openInNewTab ? "_blank" : undefined}
                    rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                    className={`block rounded-lg px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-900 ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {t(grandchild.labelEn, grandchild.labelHi ?? grandchild.labelEn)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : level2[activeChild] ? (
            <div className="p-4">
              <Link
                href={resolveHref(level2[activeChild].href)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
              >
                {t(level2[activeChild].labelEn, level2[activeChild].labelHi ?? level2[activeChild].labelEn)}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SimpleDropdown({
  item,
  resolveHref,
  open,
}: {
  item: PublicNavItem;
  resolveHref: (href: string) => string;
  open: boolean;
}) {
  const { lang, t } = useLanguage();

  return (
    <div
      className={`absolute left-0 top-full z-50 min-w-[260px] pt-1 transition ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
      {item.children?.map((child) => (
        <div key={child.labelEn}>
          <Link
            href={resolveHref(child.href)}
            target={child.openInNewTab ? "_blank" : undefined}
            rel={child.openInNewTab ? "noopener noreferrer" : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {t(child.labelEn, child.labelHi ?? child.labelEn)}
          </Link>
          {child.children && child.children.length > 0 && (
            <div className="ml-3 border-l border-emerald-100 pl-2">
              {child.children.map((grandchild) => (
                <Link
                  key={grandchild.labelEn}
                  href={resolveHref(grandchild.href)}
                  className={`block rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}
                >
                  {t(grandchild.labelEn, grandchild.labelHi ?? grandchild.labelEn)}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

function MobileNavTree({
  items,
  resolveHref,
  depth = 0,
  onNavigate,
}: {
  items: PublicNavItem[];
  resolveHref: (href: string) => string;
  depth?: number;
  onNavigate: () => void;
}) {
  const { lang, t } = useLanguage();

  return (
    <ul className={depth > 0 ? "ml-4 border-l border-white/20 pl-2" : ""}>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const rowClass = `flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-white/90 hover:bg-white/10 ${lang === "hi" ? "font-hindi" : ""}`;
        const rowStyle = { paddingLeft: `${depth * 12 + 16}px` };

        return (
        <li key={`${depth}-${item.labelEn}`}>
          {isDropdownTrigger(item.href, hasChildren) ? (
            <span className={rowClass} style={rowStyle}>
              {t(item.labelEn, item.labelHi ?? item.labelEn)}
            </span>
          ) : (
            <Link href={resolveHref(item.href)} onClick={onNavigate} className={rowClass} style={rowStyle}>
              {t(item.labelEn, item.labelHi ?? item.labelEn)}
            </Link>
          )}
          {hasChildren && (
            <MobileNavTree
              items={item.children!}
              resolveHref={resolveHref}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          )}
        </li>
        );
      })}
    </ul>
  );
}

function isDropdownTrigger(href: string, hasChildren: boolean) {
  return hasChildren && (href === "#" || href === "");
}

export function MainNavigation({
  items,
  resolveHref,
  tone = "future",
  mobileOpen,
  onMobileClose,
}: {
  items: PublicNavItem[];
  resolveHref: (href: string) => string;
  tone?: NavTone;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { lang, t } = useLanguage();
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const isLight = tone === "light" || tone === "heritage" || tone === "ministry";

  const topLinkClass = isLight
    ? tone === "heritage"
      ? "text-slate-700 hover:bg-gradient-to-r hover:from-rose-50 hover:to-violet-50 hover:text-violet-700"
      : tone === "ministry"
        ? "text-white hover:bg-white/15"
        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
    : "text-white/90 hover:bg-white/10 hover:text-amber-200";

  const openItem = items.find((item) => item.labelEn === openLabel);
  const openMegaItem =
    openItem && hasGrandchildren(openItem) ? openItem : null;

  return (
    <nav
      aria-label="Main navigation"
      className="relative"
      onMouseLeave={() => setOpenLabel(null)}
    >
      <ul className="mx-auto hidden max-w-7xl items-center gap-1 px-4 lg:flex">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isOpen = openLabel === item.labelEn;
          const isMega = hasGrandchildren(item);
          const triggerClass = `flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wide transition ${topLinkClass} ${lang === "hi" ? "font-hindi normal-case" : ""}`;

          return (
          <li
            key={item.labelEn}
            className="relative"
            onMouseEnter={() => hasChildren && setOpenLabel(item.labelEn)}
          >
            {isDropdownTrigger(item.href, hasChildren) ? (
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setOpenLabel(isOpen ? null : item.labelEn)}
                className={triggerClass}
              >
                {t(item.labelEn, item.labelHi ?? item.labelEn)}
                <ChevronDown className={`h-4 w-4 opacity-70 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <Link href={resolveHref(item.href)} className={triggerClass}>
                {t(item.labelEn, item.labelHi ?? item.labelEn)}
                {hasChildren && (
                  <ChevronDown className={`h-4 w-4 opacity-70 transition ${isOpen ? "rotate-180" : ""}`} />
                )}
              </Link>
            )}
            {hasChildren && !isMega && (
              <SimpleDropdown item={item} resolveHref={resolveHref} open={isOpen} />
            )}
          </li>
          );
        })}
      </ul>

      {openMegaItem && (
        <MegaMenuPanel
          key={openMegaItem.labelEn}
          item={openMegaItem}
          resolveHref={resolveHref}
          open
        />
      )}

      {mobileOpen && (
        <div className="border-t border-white/10 lg:hidden">
          <MobileNavTree items={items} resolveHref={resolveHref} onNavigate={onMobileClose} />
        </div>
      )}
    </nav>
  );
}
