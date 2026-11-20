import { describe, expect, it } from "vitest";

import {
  defaultMicrositeMenu,
  isCollegeTopNavSection,
  normalizeMicrositeMenuDraft,
  parseMicrositeMenu,
  preserveMicrositeMenu,
  resolvePublishedCollegeMenu,
} from "@/lib/pages/microsite-menu";

const departments = {
  id: "dept",
  slug: "hisar-department",
  title_en: "Departments",
  title_hi: "विभाग",
  sort_order: 0,
  status: "published",
};
const gallery = {
  id: "gal",
  slug: "hisar-gallery",
  title_en: "Gallery",
  title_hi: "गैलरी",
  sort_order: 0,
  status: "published",
};
const magazine = {
  id: "mag",
  slug: "hisar-college-magazine",
  title_en: "College Magazine",
  title_hi: "महाविद्यालय पत्रिका",
  sort_order: 1,
  status: "published",
};
const about = {
  id: "about",
  slug: "about-the-college",
  title_en: "About",
  sort_order: 2,
  status: "published",
};

describe("microsite menu", () => {
  it("keeps the legacy top-nav allowlist", () => {
    expect(isCollegeTopNavSection(gallery, "college-of-agriculture-hisar")).toBe(true);
    expect(isCollegeTopNavSection(magazine, "college-of-agriculture-hisar")).toBe(true);
    expect(isCollegeTopNavSection(about, "college-of-agriculture-hisar")).toBe(false);
    expect(isCollegeTopNavSection({ slug: "digital-library", title_en: "Digital" }, "nehru-library")).toBe(true);
    expect(isCollegeTopNavSection(gallery, "nehru-library")).toBe(false);
  });

  it("builds Home, sections, then Contact, with Nehru Library extras", () => {
    const hisar = defaultMicrositeMenu("college-of-agriculture-hisar", [gallery, departments, magazine, about]);
    expect(hisar.items.map((item) => item.kind === "page" ? item.pageId : item.kind)).toEqual([
      "home",
      "dept",
      "gal",
      "mag",
      "contact",
    ]);

    const library = defaultMicrositeMenu("nehru-library", [
      { id: "dig", slug: "digital-library", title_en: "Digital Library", sort_order: 3, status: "published" },
      { id: "about-lib", slug: "about-library", title_en: "About", sort_order: 0, status: "published" },
    ]);
    expect(library.items.map((item) => (item.kind === "link" ? item.labelEn : item.kind === "page" ? item.pageId : item.kind))).toEqual([
      "home",
      "about-lib",
      "Online Catalogue",
      "dig",
      "Faculty",
      "contact",
    ]);
  });

  it("uses a saved menu for order and visibility, and still routes hidden legacy pages", () => {
    const layout = {
      hero: true,
      micrositeMenu: {
        items: [
          { id: "home", kind: "home", visible: false, labelEn: "Home", labelHi: "होम" },
          { id: "page:mag", kind: "page", pageId: "mag", visible: true },
          { id: "page:gal", kind: "page", pageId: "gal", visible: false },
          { id: "link:1", kind: "link", visible: true, labelEn: "OPAC", labelHi: "", href: "https://example.com", openInNewTab: true },
          { id: "contact", kind: "contact", visible: true, labelEn: "Contact Us", labelHi: "संपर्क करें" },
        ],
      },
    };

    const resolved = resolvePublishedCollegeMenu("college-of-agriculture-hisar", layout, [
      departments,
      gallery,
      magazine,
    ]);
    expect(resolved.navPlan).toEqual([
      { type: "section", pageId: "mag" },
      { type: "external", labelEn: "OPAC", labelHi: "OPAC", href: "https://example.com", openInNewTab: true },
      { type: "contact", labelEn: "Contact Us", labelHi: "संपर्क करें" },
    ]);
    expect(resolved.rows.map((row) => row.id)).toEqual(["mag", "gal", "dept"]);
  });

  it("ignores a broken saved menu and falls back to the legacy sections", () => {
    expect(parseMicrositeMenu({ micrositeMenu: { items: [{ kind: "home" }] } })).toBeNull();
    const resolved = resolvePublishedCollegeMenu(
      "college-of-agriculture-hisar",
      { micrositeMenu: { items: [] } },
      [gallery],
    );
    expect(resolved.navPlan).toBeNull();
    expect(resolved.rows.map((row) => row.id)).toEqual(["gal"]);
  });

  it("keeps the saved menu when a page save replaces layout flags", () => {
    const existing = {
      hero: true,
      micrositeMenu: defaultMicrositeMenu("college-of-agriculture-hisar", [gallery]),
    };
    const next = preserveMicrositeMenu({ hero: false, mainContent: true }, existing);
    expect(parseMicrositeMenu(next)?.items.some((item) => item.kind === "page" && item.pageId === "gal")).toBe(true);
    expect((next as { hero: boolean }).hero).toBe(false);
  });

  it("rejects an unsafe link and a menu without Contact", () => {
    expect(
      normalizeMicrositeMenuDraft([
        { kind: "home", visible: true, labelEn: "Home", labelHi: "होम" },
        { kind: "link", visible: true, labelEn: "Bad", labelHi: "", href: "javascript:alert(1)" },
        { kind: "contact", visible: true, labelEn: "Contact Us", labelHi: "" },
      ]).ok,
    ).toBe(false);
    expect(
      normalizeMicrositeMenuDraft([
        { kind: "home", visible: true, labelEn: "Home", labelHi: "" },
        { kind: "page", visible: true, labelEn: "Gallery", labelHi: "", pageId: "gal" },
      ]).ok,
    ).toBe(false);
  });
});
