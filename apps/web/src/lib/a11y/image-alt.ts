import type { Lang } from "@/lib/i18n/language-storage";

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function buildImageAlt(parts: {
  altEn?: string | null;
  altHi?: string | null;
  titleEn?: string | null;
  titleHi?: string | null;
  captionEn?: string | null;
  captionHi?: string | null;
  nameEn?: string | null;
  nameHi?: string | null;
  designationEn?: string | null;
  designationHi?: string | null;
  contextEn?: string | null;
  lang?: Lang;
  fallback?: string;
}): string {
  const en = firstNonEmpty(
    parts.altEn,
    parts.captionEn,
    parts.nameEn && parts.designationEn ? `${parts.nameEn}, ${parts.designationEn}` : null,
    parts.titleEn,
    parts.nameEn,
    parts.contextEn,
  );
  const hi = firstNonEmpty(
    parts.altHi,
    parts.captionHi,
    parts.nameHi && parts.designationHi ? `${parts.nameHi}, ${parts.designationHi}` : null,
    parts.titleHi,
    parts.nameHi,
  );

  if (parts.lang === "hi") {
    return hi ?? en ?? parts.fallback ?? "CCSHAU image";
  }
  return en ?? hi ?? parts.fallback ?? "CCSHAU image";
}

export function heroSlideAlt(
  slide: {
    titleEn: string;
    titleHi?: string | null;
    imageAltEn?: string | null;
    imageAltHi?: string | null;
  },
  lang?: Lang,
): string {
  return buildImageAlt({
    altEn: slide.imageAltEn,
    altHi: slide.imageAltHi,
    titleEn: slide.titleEn,
    titleHi: slide.titleHi,
    contextEn: "CCSHAU banner",
    lang,
  });
}

export function staffPhotoAlt(
  member: {
    nameEn: string;
    nameHi?: string | null;
    designationEn: string;
    designationHi?: string | null;
  },
  lang?: Lang,
): string {
  return buildImageAlt({
    nameEn: member.nameEn,
    nameHi: member.nameHi,
    designationEn: member.designationEn,
    designationHi: member.designationHi,
    lang,
    fallback: "Faculty portrait",
  });
}

export function galleryImageAlt(
  image: {
    titleEn?: string | null;
    titleHi?: string | null;
  },
  lang?: Lang,
): string {
  return buildImageAlt({
    titleEn: image.titleEn,
    titleHi: image.titleHi,
    contextEn: "Gallery image",
    lang,
  });
}
