import { compareBySortOrderThenTitle } from "@/lib/pages/college-nav";
import { getCollegePublicHomePath } from "@/lib/pages/routes";

/** Child page fields the microsite menu needs. */
export interface CollegeMenuPageRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi?: string | null;
  sort_order?: number | null;
  status?: string | null;
}

export interface MicrositeMenuHomeItem {
  id: string;
  kind: "home";
  visible: boolean;
  labelEn: string;
  labelHi: string;
}

export interface MicrositeMenuContactItem {
  id: string;
  kind: "contact";
  visible: boolean;
  labelEn: string;
  labelHi: string;
}

export interface MicrositeMenuPageItem {
  id: string;
  kind: "page";
  pageId: string;
  visible: boolean;
}

export interface MicrositeMenuLinkItem {
  id: string;
  kind: "link";
  visible: boolean;
  labelEn: string;
  labelHi: string;
  href: string;
  openInNewTab: boolean;
}

export type MicrositeMenuStoredItem =
  | MicrositeMenuHomeItem
  | MicrositeMenuContactItem
  | MicrositeMenuPageItem
  | MicrositeMenuLinkItem;

export interface MicrositeMenuStored {
  items: MicrositeMenuStoredItem[];
}

export interface MicrositeMenuDraftItem {
  kind: "home" | "contact" | "page" | "link" | "new-page";
  visible: boolean;
  labelEn: string;
  labelHi: string;
  pageId?: string | null;
  href?: string | null;
  openInNewTab?: boolean | null;
}

export interface MicrositeMenuEditorItem {
  key: string;
  kind: MicrositeMenuDraftItem["kind"];
  visible: boolean;
  labelEn: string;
  labelHi: string;
  pageId: string | null;
  href: string;
  openInNewTab: boolean;
  missing: boolean;
}

export type CollegeNavPlanItem =
  | { type: "home"; labelEn: string; labelHi: string }
  | { type: "contact"; labelEn: string; labelHi: string }
  | { type: "section"; pageId: string }
  | { type: "external"; labelEn: string; labelHi: string; href: string; openInNewTab: boolean }
  | { type: "faculty"; labelEn: string; labelHi: string; href: string };

const HOME_LABEL = { labelEn: "Home", labelHi: "होम" };
const CONTACT_LABEL = { labelEn: "Contact Us", labelHi: "संपर्क करें" };
const RESERVED_SLUGS = new Set(["home", "contact", "contact-us"]);
const MAX_ITEMS = 40;
const MAX_LABEL = 120;

const NEHRU_LIBRARY_TOP_NAV_SLUGS = new Set([
  "about-library",
  "resources",
  "library-timings-holidays",
  "digital-library",
]);

const CAMPUS_SCHOOL_TOP_NAV_SLUGS = new Set([
  "cs-about-us",
  "cs-messages",
  "cs-video-gallery",
  "cs-school-management",
  "cs-school-info",
  "campus-school-gallery",
]);

/** Structural college nav sections only (legacy: Departments + Gallery, plus saved exceptions). */
export function isCollegeTopNavSection(
  page: { slug?: string | null; title_en?: string | null },
  collegeSlug?: string,
): boolean {
  if (collegeSlug === "nehru-library") {
    return NEHRU_LIBRARY_TOP_NAV_SLUGS.has(String(page.slug || "").toLowerCase());
  }
  if (collegeSlug === "campus-school") {
    return CAMPUS_SCHOOL_TOP_NAV_SLUGS.has(String(page.slug || "").toLowerCase());
  }
  const slug = String(page.slug || "").toLowerCase();
  const title = String(page.title_en || "").trim().toLowerCase();
  return (
    /^(department|departments|gallery|dhrm)$/.test(slug) ||
    /(?:^|-)department$/.test(slug) ||
    /(?:^|-)gallery$/.test(slug) ||
    slug === "alumni-association-executive-committee" ||
    title === "departments" ||
    title === "department" ||
    title === "gallery" ||
    title === "college magazine" ||
    slug === "hisar-college-magazine" ||
    title === "dhrm" ||
    title === "d h r m" ||
    title === "dsw sections" ||
    title === "sections" ||
    title === "alumni ass. executive committee" ||
    title === "alumni association executive committee"
  );
}

export function isSafeMenuHref(href: string): boolean {
  const value = href.trim();
  if (!value || value.length > 500) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isFacultyHref(href: string): boolean {
  return href.includes("tab=faculty");
}

function readLayoutObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanLabel(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL);
}

function storedLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return cleanLabel(value) || fallback;
}

function parseStoredItem(entry: unknown): MicrositeMenuStoredItem | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;
  const id = cleanLabel(row.id);
  const visible = row.visible !== false;
  if (!id) return null;
  if (row.kind === "home" || row.kind === "contact") {
    const fallback = row.kind === "home" ? HOME_LABEL : CONTACT_LABEL;
    return {
      id,
      kind: row.kind,
      visible,
      labelEn: storedLabel(row.labelEn, fallback.labelEn),
      labelHi: storedLabel(row.labelHi, fallback.labelHi),
    };
  }
  if (row.kind === "page") {
    const pageId = cleanLabel(row.pageId);
    if (!pageId) return null;
    return { id, kind: "page", pageId, visible };
  }
  if (row.kind === "link") {
    const href = String(row.href ?? "").trim();
    const labelEn = cleanLabel(row.labelEn);
    if (!labelEn || !isSafeMenuHref(href)) return null;
    return {
      id,
      kind: "link",
      visible,
      labelEn,
      labelHi: cleanLabel(row.labelHi),
      href,
      openInNewTab: row.openInNewTab !== false,
    };
  }
  return null;
}

/** Saved menu on the college root layout_config, or null when the site should use the legacy menu. */
export function parseMicrositeMenu(layout: unknown): MicrositeMenuStored | null {
  const raw = readLayoutObject(layout)?.micrositeMenu;
  if (!raw || typeof raw !== "object") return null;
  const itemsRaw = (raw as { items?: unknown }).items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0 || itemsRaw.length > MAX_ITEMS) return null;
  const items: MicrositeMenuStoredItem[] = [];
  for (const entry of itemsRaw) {
    const parsed = parseStoredItem(entry);
    if (!parsed) return null;
    items.push(parsed);
  }
  const homes = items.filter((item) => item.kind === "home");
  const contacts = items.filter((item) => item.kind === "contact");
  if (homes.length !== 1 || contacts.length !== 1) return null;
  return { items };
}

/** Keep a saved menu when the page editor rewrites layout_config. */
export function preserveMicrositeMenu(next: unknown, existing: unknown): unknown {
  const menu = parseMicrositeMenu(existing);
  if (!menu) return next;
  const base = readLayoutObject(next);
  if (!base) return next;
  return { ...base, micrositeMenu: menu };
}

function byMenuOrder(a: CollegeMenuPageRef, b: CollegeMenuPageRef): number {
  return compareBySortOrderThenTitle(
    { sortOrder: a.sort_order, titleEn: a.title_en },
    { sortOrder: b.sort_order, titleEn: b.title_en },
  );
}

function publishedChildren<T extends CollegeMenuPageRef>(children: T[]): T[] {
  return children.filter((page) => !page.status || page.status === "published");
}

/** Menu shown before an editor saves a custom order. Matches the public legacy nav. */
export function defaultMicrositeMenu(
  collegeSlug: string,
  children: CollegeMenuPageRef[],
): MicrositeMenuStored {
  const pages = publishedChildren(children)
    .filter((page) => !RESERVED_SLUGS.has(page.slug.toLowerCase()))
    .filter((page) => isCollegeTopNavSection(page, collegeSlug))
    .sort(byMenuOrder);
  const sectionItems: MicrositeMenuStoredItem[] = pages.map((page) => ({
    id: `page:${page.id}`,
    kind: "page",
    pageId: page.id,
    visible: true,
  }));

  if (collegeSlug === "nehru-library") {
    const digitalIdx = pages.findIndex((page) => page.slug === "digital-library");
    const opac: MicrositeMenuLinkItem = {
      id: "link:opac",
      kind: "link",
      visible: true,
      labelEn: "Online Catalogue",
      labelHi: "ऑनलाइन कैटलॉग",
      href: "https://haulibopac.ltsinformatics.com",
      openInNewTab: true,
    };
    if (digitalIdx >= 0) sectionItems.splice(digitalIdx, 0, opac);
    else sectionItems.push(opac);
    sectionItems.push({
      id: "link:faculty",
      kind: "link",
      visible: true,
      labelEn: "Faculty",
      labelHi: "संकाय",
      href: `${getCollegePublicHomePath(collegeSlug)}?tab=faculty`,
      openInNewTab: false,
    });
  }

  return {
    items: [
      { id: "home", kind: "home", visible: true, ...HOME_LABEL },
      ...sectionItems,
      { id: "contact", kind: "contact", visible: true, ...CONTACT_LABEL },
    ],
  };
}

export function toEditorItems(
  menu: MicrositeMenuStored,
  pages: CollegeMenuPageRef[],
): MicrositeMenuEditorItem[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  return menu.items.map((item) => {
    if (item.kind === "page") {
      const page = byId.get(item.pageId);
      return {
        key: item.id,
        kind: "page",
        visible: item.visible,
        labelEn: page?.title_en ?? "Missing page",
        labelHi: page?.title_hi ?? "",
        pageId: item.pageId,
        href: "",
        openInNewTab: false,
        missing: !page,
      };
    }
    if (item.kind === "link") {
      return {
        key: item.id,
        kind: "link",
        visible: item.visible,
        labelEn: item.labelEn,
        labelHi: item.labelHi,
        pageId: null,
        href: item.href,
        openInNewTab: item.openInNewTab,
        missing: false,
      };
    }
    return {
      key: item.id,
      kind: item.kind,
      visible: item.visible,
      labelEn: item.labelEn,
      labelHi: item.labelHi,
      pageId: null,
      href: "",
      openInNewTab: false,
      missing: false,
    };
  });
}

export function normalizeMicrositeMenuDraft(
  input: unknown,
): { ok: true; items: MicrositeMenuDraftItem[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Add at least Home and Contact." };
  }
  if (input.length > MAX_ITEMS) {
    return { ok: false, error: `A microsite menu can have at most ${MAX_ITEMS} items.` };
  }

  const items: MicrositeMenuDraftItem[] = [];
  const pageIds = new Set<string>();
  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "A menu item is invalid." };
    }
    const row = entry as Record<string, unknown>;
    const kind = row.kind;
    const visible = row.visible !== false;
    const labelEn = cleanLabel(row.labelEn);
    const labelHi = cleanLabel(row.labelHi);
    if (kind === "home" || kind === "contact") {
      if (!labelEn) return { ok: false, error: "Home and Contact need an English name." };
      items.push({ kind, visible, labelEn, labelHi });
      continue;
    }
    if (kind === "page") {
      const pageId = cleanLabel(row.pageId);
      if (!pageId) return { ok: false, error: "A page menu item is missing its page." };
      if (pageIds.has(pageId)) return { ok: false, error: "The same page is in the menu twice." };
      pageIds.add(pageId);
      if (!labelEn) return { ok: false, error: "Each page menu item needs an English name." };
      items.push({ kind, visible, labelEn, labelHi, pageId });
      continue;
    }
    if (kind === "new-page") {
      if (!labelEn) return { ok: false, error: "Enter an English name for the new menu." };
      items.push({ kind, visible, labelEn, labelHi });
      continue;
    }
    if (kind === "link") {
      const href = String(row.href ?? "").trim();
      if (!labelEn) return { ok: false, error: "A web link needs an English name." };
      if (!isSafeMenuHref(href)) {
        return { ok: false, error: "Web links must start with / or http:// or https://." };
      }
      items.push({
        kind,
        visible,
        labelEn,
        labelHi,
        href,
        openInNewTab: row.openInNewTab !== false,
      });
      continue;
    }
    return { ok: false, error: "A menu item type is not supported." };
  }

  if (items.filter((item) => item.kind === "home").length !== 1) {
    return { ok: false, error: "The menu needs one Home item." };
  }
  if (items.filter((item) => item.kind === "contact").length !== 1) {
    return { ok: false, error: "The menu needs one Contact item." };
  }
  return { ok: true, items };
}

export function resolvePublishedCollegeMenu<T extends CollegeMenuPageRef>(
  collegeSlug: string,
  layout: unknown,
  children: T[],
): { rows: T[]; navPlan: CollegeNavPlanItem[] | null } {
  const published = publishedChildren(children).sort(byMenuOrder);
  const menu = parseMicrositeMenu(layout);
  if (!menu) {
    return {
      rows: published.filter(
        (page) =>
          !RESERVED_SLUGS.has(page.slug.toLowerCase()) && isCollegeTopNavSection(page, collegeSlug),
      ),
      navPlan: null,
    };
  }

  const byId = new Map(published.map((page) => [page.id, page]));
  const rows: T[] = [];
  const navPlan: CollegeNavPlanItem[] = [];
  const seen = new Set<string>();

  for (const item of menu.items) {
    if (item.kind === "home") {
      if (item.visible) {
        navPlan.push({ type: "home", labelEn: item.labelEn, labelHi: item.labelHi || item.labelEn });
      }
      continue;
    }
    if (item.kind === "contact") {
      if (item.visible) {
        navPlan.push({ type: "contact", labelEn: item.labelEn, labelHi: item.labelHi || item.labelEn });
      }
      continue;
    }
    if (item.kind === "link") {
      if (!item.visible) continue;
      const labelHi = item.labelHi || item.labelEn;
      if (isFacultyHref(item.href)) {
        navPlan.push({
          type: "faculty",
          labelEn: item.labelEn,
          labelHi,
          href: item.href,
        });
      } else {
        navPlan.push({
          type: "external",
          labelEn: item.labelEn,
          labelHi,
          href: item.href,
          openInNewTab: item.openInNewTab,
        });
      }
      continue;
    }

    const page = byId.get(item.pageId);
    if (!page || seen.has(page.id)) continue;
    seen.add(page.id);
    rows.push(page);
    if (item.visible) navPlan.push({ type: "section", pageId: page.id });
  }

  for (const page of published) {
    if (seen.has(page.id)) continue;
    if (RESERVED_SLUGS.has(page.slug.toLowerCase())) continue;
    if (!isCollegeTopNavSection(page, collegeSlug)) continue;
    rows.push(page);
  }

  return { rows, navPlan };
}
