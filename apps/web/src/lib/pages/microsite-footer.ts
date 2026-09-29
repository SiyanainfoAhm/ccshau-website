export interface MicrositeFooterLink {
  labelEn: string;
  labelHi: string;
  href: string;
}

export interface MicrositeFooterSection {
  titleEn: string;
  titleHi: string;
  links: MicrositeFooterLink[];
}

export interface MicrositeFooterInput {
  custom: boolean;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  addressEn: string;
  addressHi: string;
  phone: string;
  email: string;
  links: MicrositeFooterLink[];
  sections: MicrositeFooterSection[];
  useHauLinks: boolean;
}

export interface PublicMicrositeFooter {
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  addressEn: string;
  addressHi: string;
  phone: string;
  email: string;
  links: MicrositeFooterLink[];
  sections: MicrositeFooterSection[];
  useHauLinks: boolean;
}

export interface MicrositeContactLine {
  labelEn: string;
  labelHi: string | null;
  valueEn: string;
  valueHi: string | null;
}

const EMPTY_FOOTER: MicrositeFooterInput = {
  custom: false,
  nameEn: "",
  nameHi: "",
  descriptionEn: "",
  descriptionHi: "",
  addressEn: "",
  addressHi: "",
  phone: "",
  email: "",
  links: [],
  sections: [],
  useHauLinks: false,
};

export const FOOTER_SECTION_COUNT = 4;

export function defaultFooterSections(): MicrositeFooterSection[] {
  return [
    { titleEn: "Visit Us", titleHi: "हमसे मिलें", links: [] },
    { titleEn: "Departments", titleHi: "विभाग", links: [] },
    { titleEn: "", titleHi: "", links: [] },
    { titleEn: "HAU Links", titleHi: "एचएयू लिंक", links: [] },
  ];
}

function parseLinks(raw: unknown, limit = 30): MicrositeFooterLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const link = item as Record<string, unknown>;
    const href = text(link.href);
    const labelEn = text(link.labelEn);
    if (!href || !labelEn) return [];
    return [{ labelEn, labelHi: text(link.labelHi), href }];
  }).slice(0, limit);
}

function sectionsFromLinks(links: MicrositeFooterLink[]): MicrositeFooterSection[] {
  const sections = defaultFooterSections();
  const mid = Math.ceil(links.length / 2);
  sections[1] = { ...sections[1], links: links.slice(0, mid) };
  sections[2] = { ...sections[2], links: links.slice(mid) };
  return sections;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function lineValue(lines: MicrositeContactLine[], labels: string[]): MicrositeContactLine | undefined {
  const wanted = new Set(labels.map((label) => label.toLowerCase()));
  return lines.find((line) => wanted.has(line.labelEn.trim().toLowerCase()));
}

function cleanContactValue(value: string | null | undefined): string {
  return (value ?? "").replace(/^(office|phone|telephone|mobile|email|email id|e-mail)\s*:\s*/i, "").trim();
}

export function parseMicrositeFooter(raw: unknown): MicrositeFooterInput {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_FOOTER, links: [], sections: defaultFooterSections() };
  }
  const row = raw as Record<string, unknown>;
  const links = parseLinks(row.links, 40);
  const parsedSections = Array.isArray(row.sections)
    ? row.sections.slice(0, FOOTER_SECTION_COUNT).map((item) => {
        if (!item || typeof item !== "object") return { titleEn: "", titleHi: "", links: [] };
        const section = item as Record<string, unknown>;
        return {
          titleEn: text(section.titleEn),
          titleHi: text(section.titleHi),
          links: parseLinks(section.links),
        };
      })
    : [];
  const sections = defaultFooterSections().map((fallback, index) => parsedSections[index] ?? fallback);
  const hasSectionLinks = sections.some((section, index) => index > 0 && section.links.length > 0);
  return {
    custom: row.custom === true,
    nameEn: text(row.nameEn),
    nameHi: text(row.nameHi),
    descriptionEn: text(row.descriptionEn),
    descriptionHi: text(row.descriptionHi),
    addressEn: text(row.addressEn),
    addressHi: text(row.addressHi),
    phone: text(row.phone),
    email: text(row.email),
    links,
    useHauLinks: row.useHauLinks === true,
    sections: hasSectionLinks || parsedSections.length > 0 ? sections : sectionsFromLinks(links),
  };
}

export function footerFromContacts(
  nameEn: string,
  nameHi: string | null,
  lines: MicrositeContactLine[],
): PublicMicrositeFooter {
  const address = lineValue(lines, ["mailing address", "address", "college"]);
  const phone = lineValue(lines, ["phone", "telephone", "mobile", "office"]);
  const email =
    lineValue(lines, ["email", "e-mail", "email id"]) ??
    lines.find((line) => line.valueEn.includes("@"));
  return {
    nameEn,
    nameHi: nameHi?.trim() || nameEn,
    descriptionEn: "",
    descriptionHi: "",
    addressEn: cleanContactValue(address?.valueEn),
    addressHi: cleanContactValue(address?.valueHi) || cleanContactValue(address?.valueEn),
    phone: cleanContactValue(phone?.valueEn),
    email: cleanContactValue(email?.valueEn),
    links: [],
    sections: defaultFooterSections(),
    useHauLinks: false,
  };
}

export function placeDepartmentLinks(
  footer: MicrositeFooterInput,
  departmentLinks: MicrositeFooterLink[],
): MicrositeFooterInput {
  const alreadyPlaced = footer.sections.some((section, index) => index > 0 && section.links.length > 0);
  if (alreadyPlaced || departmentLinks.length === 0) return footer;
  const sections = sectionsFromLinks(departmentLinks);
  sections[0] = footer.sections[0] ?? sections[0];
  sections[3] = footer.sections[3]?.titleEn ? footer.sections[3] : sections[3];
  return { ...footer, links: departmentLinks, sections };
}

export function publicFooterFromSaved(
  saved: MicrositeFooterInput,
  fallback: PublicMicrositeFooter,
): PublicMicrositeFooter {
  if (!saved.custom) return fallback;
  return {
    nameEn: saved.nameEn || fallback.nameEn,
    nameHi: saved.nameHi || fallback.nameHi,
    descriptionEn: saved.descriptionEn,
    descriptionHi: saved.descriptionHi,
    addressEn: saved.addressEn,
    addressHi: saved.addressHi || saved.addressEn,
    phone: saved.phone,
    email: saved.email,
    links: saved.links,
    sections: saved.sections,
    useHauLinks: saved.useHauLinks,
  };
}
