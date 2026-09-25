import type { SiteSettings } from "@/lib/database/types";
import type { PublicHeaderBranding } from "@/lib/data/public-types";
import { university } from "@/lib/mock/site-content";
import { resolvePublicMediaUrl } from "@/lib/storage/urls";

export const DEFAULT_HEADER_LOGO = "/images/ccshau-logo.png";
export const DEFAULT_HEADER_PORTRAIT = "/images/chaudhary-charan-singh.png";
export const DEFAULT_HEADER_ACCREDITATION_EN = "NAEAB A+ Accredited University";
export const DEFAULT_HEADER_ACCREDITATION_HI = "एनएईएबी ए+ मान्यता प्राप्त विश्वविद्यालय";

type HeaderSettings = Pick<
  SiteSettings,
  | "header_tagline_en"
  | "header_tagline_hi"
  | "header_logo_path"
  | "header_portrait_path"
  | "header_short_name"
  | "header_name_en"
  | "header_name_hi"
  | "header_accreditation_en"
  | "header_accreditation_hi"
>;

export function resolveHeaderBranding(settings: HeaderSettings): PublicHeaderBranding {
  return {
    taglineEn: settings.header_tagline_en?.trim() || university.taglineEn,
    taglineHi: settings.header_tagline_hi?.trim() || university.taglineHi,
    shortName: settings.header_short_name?.trim() || university.shortName,
    nameEn: settings.header_name_en?.trim() || university.nameEn,
    nameHi: settings.header_name_hi?.trim() || university.nameHi,
    accreditationEn: settings.header_accreditation_en?.trim() || DEFAULT_HEADER_ACCREDITATION_EN,
    accreditationHi: settings.header_accreditation_hi?.trim() || DEFAULT_HEADER_ACCREDITATION_HI,
    logoUrl: resolvePublicMediaUrl(settings.header_logo_path) || DEFAULT_HEADER_LOGO,
    portraitUrl: resolvePublicMediaUrl(settings.header_portrait_path) || DEFAULT_HEADER_PORTRAIT,
  };
}
