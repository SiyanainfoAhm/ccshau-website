"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import type { PublicNavItem } from "@/lib/data/public-types";

type NavTone = "future" | "heritage" | "ministry" | "light";

function hasGrandchildren(item: PublicNavItem): boolean {
  return Boolean(item.children?.some((child) => child.children && child.children.length > 0));
}

function isNavItemActive(
  item: PublicNavItem,
  pathname: string,
  resolveHref: (href: string) => string,
): boolean {
  const href = resolveHref(item.href);
  if (href && href !== "#") {
    if (href === "/") {
      if (pathname === "/") return true;
    } else if (pathname === href || pathname.startsWith(`${href}/`)) {
      return true;
    }
  }

  return (item.children ?? []).some((child) => isNavItemActive(child, pathname, resolveHref));
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
        open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
      }`}
    >
      <div className="ccshau-mega-panel mx-auto flex max-w-7xl overflow-hidden rounded-b-xl bg-white">
        <div className="ccshau-mega-panel-sidebar w-72 shrink-0 py-2">
          {level2.map((child, index) => {
            const isActive = index === activeChild;
            const hasKids = Boolean(child.children?.length);
            return (
              <button
                key={child.labelEn}
                type="button"
                onMouseEnter={() => setActiveChild(index)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold uppercase tracking-wide transition ${
                  isActive ? "is-active" : "text-white/90 hover:bg-white/10"
                }`}
              >
                <span className={lang === "hi" ? "font-hindi normal-case" : ""}>
                  {t(child.labelEn, child.labelHi ?? child.labelEn)}
                </span>
                {hasKids && <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />}
              </button>
            );
          })}
        </div>
        <div className="ccshau-mega-panel-content min-h-[220px] flex-1 p-4">
          {level3.length > 0 ? (
            <ul className="grid gap-1 sm:grid-cols-2">
              {level3.map((grandchild) => (
                <li key={grandchild.labelEn}>
                  <Link
                    href={resolveHref(grandchild.href)}
                    target={grandchild.openInNewTab ? "_blank" : undefined}
                    rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                    className={`block rounded-lg border border-transparent px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white hover:text-emerald-900 hover:shadow-sm ${lang === "hi" ? "font-hindi" : ""}`}
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
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
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
      <div className="ccshau-nav-dropdown rounded-lg bg-white p-2">
        {item.children?.map((child) => (
          <div key={child.labelEn}>
            <Link
              href={resolveHref(child.href)}
              target={child.openInNewTab ? "_blank" : undefined}
              rel={child.openInNewTab ? "noopener noreferrer" : undefined}
              className={`block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}
            >
              {t(child.labelEn, child.labelHi ?? child.labelEn)}
            </Link>
            {child.children && child.children.length > 0 && (
              <div className="ml-3 border-l border-emerald-100 pl-2">
                {child.children.map((grandchild) => (
                  <Link
                    key={grandchild.labelEn}
                    href={resolveHref(grandchild.href)}
                    className={`block rounded-md px-2 py-1.5 text-xs text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}
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
    <ul className={depth > 0 ? "ml-4 border-l border-amber-400/30 pl-2" : ""}>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const rowClass = `flex w-full items-center justify-between border-b border-white/5 px-4 py-2.5 text-left text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${lang === "hi" ? "font-hindi" : ""}`;
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

function navLinkClass(
  tone: NavTone,
  options: { isOpen: boolean; isActive: boolean },
  lang: string,
): string {
  const { isOpen, isActive } = options;
  const hi = lang === "hi" ? "font-hindi normal-case" : "";

  if (tone === "future") {
    return [
      "ccshau-main-nav-link",
      isOpen && !isActive ? "ccshau-main-nav-link--open" : "",
      isActive ? "ccshau-main-nav-link--active" : "",
      hi,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (tone === "heritage") {
    return `flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wide transition text-slate-700 hover:bg-gradient-to-r hover:from-rose-50 hover:to-violet-50 hover:text-violet-700 ${isOpen || isActive ? "bg-rose-50 text-violet-700" : ""} ${hi}`;
  }

  if (tone === "ministry") {
    return `flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wide transition text-white hover:bg-white/15 ${isOpen || isActive ? "bg-white/15 text-amber-200" : ""} ${hi}`;
  }

  return `flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wide transition text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 ${isOpen || isActive ? "bg-emerald-50 text-emerald-800" : ""} ${hi}`;
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
  const pathname = usePathname();
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  const openItem = items.find((item) => item.labelEn === openLabel);
  const openMegaItem = openItem && hasGrandchildren(openItem) ? openItem : null;

  return (
    <nav
      aria-label="Main navigation"
      className="relative"
      onMouseLeave={() => setOpenLabel(null)}
    >
      <ul
        className={`mx-auto hidden max-w-7xl items-center px-4 lg:flex ${
          tone === "future" ? "ccshau-main-nav-list justify-center gap-0" : "gap-1"
        }`}
      >
        {items.map((item, index) => {
          const hasChildren = Boolean(item.children?.length);
          const isOpen = openLabel === item.labelEn;
          const isMega = hasGrandchildren(item);
          const href = resolveHref(item.href);
          const isActive = isNavItemActive(item, pathname, resolveHref);
          const triggerClass = navLinkClass(tone, { isOpen, isActive }, lang);

          return (
            <li
              key={item.labelEn}
              className="relative flex items-center"
              onMouseEnter={() => hasChildren && setOpenLabel(item.labelEn)}
            >
              {index > 0 && tone === "future" && <span className="ccshau-main-nav-separator" aria-hidden />}
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
                <Link href={href} className={triggerClass}>
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
        <div className="border-t border-amber-400/20 lg:hidden">
          <MobileNavTree items={items} resolveHref={resolveHref} onNavigate={onMobileClose} />
        </div>
      )}
    </nav>
  );
}
