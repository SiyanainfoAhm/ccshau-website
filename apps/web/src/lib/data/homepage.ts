import { unstable_cache } from "next/cache";

import type { PublicPageSummary } from "@/lib/data/public-types";
import { Tables } from "@/lib/database/names";
import type {
  HomepageCta,
  HomepageDignitary,
  HomepageInitiative,
  HomepageQuote,
} from "@/lib/database/types";
import {
  enrichHomepageQuotes,
  legacyColleges,
  legacyDignitaries,
  legacyFlagships,
  legacyQuotes,
  type LegacyDignitary,
  type LegacyQuote,
} from "@/lib/legacy/homepage-content";
import { getPublicPagePath } from "@/lib/pages/routes";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHomepageDignitary } from "@/lib/data/homepage-dignitary";

export interface HomepageCollege {
  slug: string;
  nameEn: string;
  nameHi: string;
  href: string;
  logoUrl: string;
  color: string;
}

export type HomepageQuoteItem = LegacyQuote;

export interface HomepageFlagshipItem {
  slug: string;
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  imageUrl: string;
  href: string;
}

export interface HomepageCtaItem {
  titleEn: string;
  titleHi: string;
  subtitleEn: string;
  subtitleHi: string;
  buttonEn: string;
  buttonHi: string;
  href: string;
}

export interface HomepageContent {
  quotes: HomepageQuoteItem[];
  dignitaries: LegacyDignitary[];
  flagships: HomepageFlagshipItem[];
  cta: HomepageCtaItem | null;
}

function mapImage(path: string): string {
  return getStoredFileUrl(path) ?? path;
}

function mapQuote(row: HomepageQuote): HomepageQuoteItem {
  return {
    authorEn: row.author_en,
    authorHi: row.author_hi ?? row.author_en,
    quoteEn: row.quote_en,
    quoteHi: row.quote_hi ?? row.quote_en,
    imageUrl: row.image_path ? mapImage(row.image_path) : "",
  };
}

function mapDignitary(row: HomepageDignitary): LegacyDignitary {
  return {
    nameEn: row.name_en,
    nameHi: row.name_hi ?? row.name_en,
    roleEn: row.role_en,
    roleHi: row.role_hi ?? row.role_en,
    imageUrl: mapImage(row.image_path),
  };
}

function mapInitiative(row: HomepageInitiative): HomepageFlagshipItem {
  const slug = row.link_slug ?? "";
  const href =
    row.link_href ??
    (slug ? getPublicPagePath(slug, "college") : "#");

  return {
    slug: slug || row.id,
    titleEn: row.title_en,
    titleHi: row.title_hi ?? row.title_en,
    descEn: row.description_en,
    descHi: row.description_hi ?? row.description_en,
    imageUrl: mapImage(row.image_path),
    href,
  };
}

function mapCta(row: HomepageCta): HomepageCtaItem {
  return {
    titleEn: row.title_en,
    titleHi: row.title_hi ?? row.title_en,
    subtitleEn: row.subtitle_en ?? "",
    subtitleHi: row.subtitle_hi ?? row.subtitle_en ?? "",
    buttonEn: row.button_en,
    buttonHi: row.button_hi ?? row.button_en,
    href: row.link_href,
  };
}

function cmsSlugMatchesLegacy(cmsSlug: string, legacySlug: string, aliases?: string[]): boolean {
  if (cmsSlug === legacySlug) return true;
  return aliases?.includes(cmsSlug) ?? false;
}

const HOMEPAGE_QUOTE_SELECT =
  "id, author_en, author_hi, quote_en, quote_hi, image_path, sort_order, is_active";
const HOMEPAGE_DIGNITARY_SELECT = "*";
const HOMEPAGE_INITIATIVE_SELECT =  "id, title_en, title_hi, description_en, description_hi, image_path, link_slug, link_href, sort_order, is_active";
const HOMEPAGE_CTA_SELECT =
  "id, title_en, title_hi, subtitle_en, subtitle_hi, button_en, button_hi, link_href, is_active";

async function loadHomepageContent(): Promise<HomepageContent> {
  const admin = createAdminClient();

  if (!admin) {
    return {
      quotes: enrichHomepageQuotes(legacyQuotes),
      dignitaries: legacyDignitaries,
      flagships: legacyFlagships.map((item) => ({
        ...item,
        href: getPublicPagePath(item.slug, "college"),
      })),
      cta: null,
    };
  }

  const [quotesRes, dignitariesRes, initiativesRes, ctaRes] = await Promise.all([
    admin
      .from(Tables.homepageQuotes)
      .select(HOMEPAGE_QUOTE_SELECT)
      .eq("is_active", true)
      .order("sort_order")
      .order("author_en"),
    admin
      .from(Tables.homepageDignitaries)
      .select(HOMEPAGE_DIGNITARY_SELECT)
      .eq("is_active", true)
      .order("sort_order")
      .order("name_en"),
    admin
      .from(Tables.homepageInitiatives)
      .select(HOMEPAGE_INITIATIVE_SELECT)
      .eq("is_active", true)
      .order("sort_order")
      .order("title_en"),
    admin
      .from(Tables.homepageCta)
      .select(HOMEPAGE_CTA_SELECT)
      .eq("id", 1)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const quotes = enrichHomepageQuotes(
    ((quotesRes.data ?? []) as HomepageQuote[]).map(mapQuote),
  );
  const dignitaries = ((dignitariesRes.data ?? []) as HomepageDignitary[])
    .map((row) => normalizeHomepageDignitary(row))
    .map(mapDignitary);
  const flagships = ((initiativesRes.data ?? []) as HomepageInitiative[]).map(mapInitiative);
  const ctaRow = ctaRes.data as HomepageCta | null;

  return {
    quotes: quotes.length > 0 ? quotes : enrichHomepageQuotes(legacyQuotes),
    dignitaries: dignitaries.length > 0 ? dignitaries : legacyDignitaries,
    flagships:
      flagships.length > 0
        ? flagships
        : legacyFlagships.map((item) => ({
            ...item,
            href: getPublicPagePath(item.slug, "college"),
          })),
    cta: ctaRow ? mapCta(ctaRow) : null,
  };
}

export const getHomepageContent = unstable_cache(
  loadHomepageContent,
  ["ccshau-homepage-content"],
  { revalidate: 60, tags: ["public-homepage"] },
);

export function resolveHomepageColleges(cmsPages: PublicPageSummary[]): HomepageCollege[] {
  const cmsBySlug = new Map(cmsPages.map((page) => [page.slug, page]));

  return legacyColleges.map((legacy) => {
    const cms =
      cmsBySlug.get(legacy.slug) ??
      cmsPages.find((page) => cmsSlugMatchesLegacy(page.slug, legacy.slug, legacy.slugAliases));

    const slug = cms?.slug ?? legacy.slug;
    const pageType = cms?.pageType ?? "college";

    return {
      slug,
      nameEn: cms?.titleEn ?? legacy.nameEn,
      nameHi: cms?.titleHi ?? legacy.nameHi,
      href: getPublicPagePath(slug, pageType),
      logoUrl: cms?.logoImageUrl ?? legacy.logoUrl,
      color: legacy.color,
    };
  });
}
