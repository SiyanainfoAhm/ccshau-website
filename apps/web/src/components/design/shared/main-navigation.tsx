"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { useEscapeKey } from "@/lib/a11y/use-escape-key";
import { formatMenuLabel } from "@/lib/i18n/menu-label";
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
  onNavigate,
}: {
  item: PublicNavItem;
  resolveHref: (href: string) => string;
  open: boolean;
  onNavigate?: () => void;
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
      role="region"
      aria-label={t(item.labelEn, item.labelHi ?? item.labelEn)}
      aria-hidden={!open}
    >
      <div className="ccshau-mega-panel mx-auto flex max-w-7xl overflow-hidden rounded-b-xl bg-white">
        <div className="ccshau-mega-panel-sidebar w-72 shrink-0 py-2">
          {level2.map((child, index) => {
            const isActive = index === activeChild;
            const hasKids = Boolean(child.children?.length);
            const labelClass = lang === "hi" ? "font-hindi normal-case" : "";
            const label = formatMenuLabel(
              t(child.labelEn, child.labelHi ?? child.labelEn),
              lang,
              "title",
            );
            const rowClass = `flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold tracking-wide transition ${
              isActive ? "is-active" : "text-white/90 hover:bg-white/10"
            }`;

            // Leaf items navigate on click; parents only expand the right panel.
            if (!hasKids) {
              const href = resolveHref(child.href);
              if (!href || href === "#") {
                return (
                  <span key={child.labelEn} className={`${rowClass} cursor-default opacity-80`}>
                    <span className={labelClass}>{label}</span>
                  </span>
                );
              }
              return (
                <Link
                  key={child.labelEn}
                  href={href}
                  target={child.openInNewTab ? "_blank" : undefined}
                  rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                  onMouseEnter={() => setActiveChild(index)}
                  onFocus={() => setActiveChild(index)}
                  onClick={() => onNavigate?.()}
                  className={rowClass}
                >
                  <span className={labelClass}>{label}</span>
                </Link>
              );
            }

            return (
              <button
                key={child.labelEn}
                type="button"
                onMouseEnter={() => setActiveChild(index)}
                onFocus={() => setActiveChild(index)}
                onClick={() => setActiveChild(index)}
                aria-pressed={isActive}
                className={rowClass}
              >
                <span className={labelClass}>{label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
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
                    onClick={() => onNavigate?.()}
                    className={`block rounded-lg border border-transparent px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white hover:text-emerald-900 hover:shadow-sm ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {formatMenuLabel(
                      t(grandchild.labelEn, grandchild.labelHi ?? grandchild.labelEn),
                      lang,
                      "title",
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : level2[activeChild] && !level2[activeChild].children?.length ? (
            <div className="flex h-full min-h-[180px] items-center justify-center p-6 text-center text-sm text-slate-500">
              {formatMenuLabel(
                t(
                  "Click the menu item on the left to open this page.",
                  "पेज खोलने के लिए बाईं ओर मेनू आइटम पर क्लिक करें।",
                ),
                lang,
                "title",
              )}
            </div>
          ) : level2[activeChild] ? (
            <div className="p-4">
              <Link
                href={resolveHref(level2[activeChild].href)}
                onClick={() => onNavigate?.()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                {formatMenuLabel(
                  t(
                    level2[activeChild].labelEn,
                    level2[activeChild].labelHi ?? level2[activeChild].labelEn,
                  ),
                  lang,
                  "title",
                )}
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
        open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
      }`}
      role="menu"
      aria-hidden={!open}
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
              {formatMenuLabel(
                t(child.labelEn, child.labelHi ?? child.labelEn),
                lang,
                "title",
              )}
            </Link>
            {child.children && child.children.length > 0 && (
              <div className="ml-3 border-l border-emerald-100 pl-2">
                {child.children.map((grandchild) => (
                  <Link
                    key={grandchild.labelEn}
                    href={resolveHref(grandchild.href)}
                    className={`block rounded-md px-2 py-1.5 text-xs text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {formatMenuLabel(
                      t(grandchild.labelEn, grandchild.labelHi ?? grandchild.labelEn),
                      lang,
                      "title",
                    )}
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
        const label = formatMenuLabel(
          t(item.labelEn, item.labelHi ?? item.labelEn),
          lang,
          depth === 0 ? "upper" : "title",
        );

        return (
          <li key={`${depth}-${item.labelEn}`}>
            {isDropdownTrigger(item.href, hasChildren) ? (
              <span className={rowClass} style={rowStyle}>
                {label}
              </span>
            ) : (
              <Link href={resolveHref(item.href)} onClick={onNavigate} className={rowClass} style={rowStyle}>
                {label}
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
    return `flex items-center gap-1 rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wide transition text-white hover:bg-white/15 ${isOpen || isActive ? "bg-[#082952] text-amber-200" : ""} ${hi}`;
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

  useEscapeKey(openLabel != null, () => setOpenLabel(null));

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
              onFocusCapture={() => hasChildren && setOpenLabel(item.labelEn)}
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
                  {formatMenuLabel(
                    t(item.labelEn, item.labelHi ?? item.labelEn),
                    lang,
                    "upper",
                  )}
                  <ChevronDown className={`h-4 w-4 opacity-70 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
              ) : (
                <Link href={href} className={triggerClass} aria-current={isActive ? "page" : undefined}>
                  {formatMenuLabel(
                    t(item.labelEn, item.labelHi ?? item.labelEn),
                    lang,
                    "upper",
                  )}
                  {hasChildren && (
                    <ChevronDown className={`h-4 w-4 opacity-70 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
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
          onNavigate={() => setOpenLabel(null)}
        />
      )}

      {mobileOpen && (
        <div className="border-t border-amber-400/20 lg:hidden" data-mobile-nav>
          <MobileNavTree items={items} resolveHref={resolveHref} onNavigate={onMobileClose} />
        </div>
      )}
    </nav>
  );
}
