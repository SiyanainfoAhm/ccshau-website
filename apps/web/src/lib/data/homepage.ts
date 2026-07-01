import type { PublicPageSummary } from "@/lib/data/public-types";
import { Tables } from "@/lib/database/names";
import type {
  HomepageCta,
  HomepageDignitary,
  HomepageInitiative,
  HomepageQuote,
} from "@/lib/database/types";
import {
  legacyColleges,
  legacyDignitaries,
  legacyFlagships,
  legacyQuotes,
  type LegacyDignitary,
  type LegacyFlagship,
} from "@/lib/legacy/homepage-content";
import { getPublicPagePath } from "@/lib/pages/routes";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";

export interface HomepageCollege {
  slug: string;
  nameEn: string;
  nameHi: string;
  href: string;
  logoUrl: string;
  color: string;
}

export interface HomepageQuoteItem {
  authorEn: string;
  authorHi: string;
  quoteEn: string;
  quoteHi: string;
}

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

export async function getHomepageContent(): Promise<HomepageContent> {
  const admin = createAdminClient();

  if (!admin) {
    return {
      quotes: legacyQuotes,
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
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("author_en"),
    admin
      .from(Tables.homepageDignitaries)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name_en"),
    admin
      .from(Tables.homepageInitiatives)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("title_en"),
    admin.from(Tables.homepageCta).select("*").eq("id", 1).eq("is_active", true).maybeSingle(),
  ]);

  const quotes = ((quotesRes.data ?? []) as HomepageQuote[]).map(mapQuote);
  const dignitaries = ((dignitariesRes.data ?? []) as HomepageDignitary[]).map(mapDignitary);
  const flagships = ((initiativesRes.data ?? []) as HomepageInitiative[]).map(mapInitiative);
  const ctaRow = ctaRes.data as HomepageCta | null;

  return {
    quotes: quotes.length > 0 ? quotes : legacyQuotes,
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
