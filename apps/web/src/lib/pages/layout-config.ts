import type { LayoutTemplate } from "@/lib/database/types";

export interface PageLayoutConfig {
  hero: boolean;
  headOfficer: boolean;
  contacts: boolean;
  staff: boolean;
  gallery: boolean;
  mainContent: boolean;
  leftSidebar: boolean;
  rightSidebar: boolean;
  collegeTopMenu: boolean;
  farmersCta: boolean;
  heroContactButton: boolean;
}

export const LAYOUT_CONFIG_KEYS = [
  "hero",
  "headOfficer",
  "contacts",
  "staff",
  "gallery",
  "mainContent",
  "leftSidebar",
  "rightSidebar",
  "collegeTopMenu",
  "farmersCta",
  "heroContactButton",
] as const satisfies readonly (keyof PageLayoutConfig)[];

export const LAYOUT_PRESETS: Record<"college_home" | "office_portal" | "minimal", PageLayoutConfig> = {
  college_home: {
    hero: true,
    headOfficer: true,
    contacts: true,
    staff: false,
    gallery: false,
    mainContent: true,
    leftSidebar: false,
    rightSidebar: false,
    collegeTopMenu: true,
    farmersCta: false,
    heroContactButton: true,
  },
  office_portal: {
    hero: true,
    headOfficer: true,
    contacts: true,
    staff: true,
    gallery: false,
    mainContent: true,
    leftSidebar: true,
    rightSidebar: true,
    collegeTopMenu: false,
    farmersCta: true,
    heroContactButton: false,
  },
  minimal: {
    hero: false,
    headOfficer: false,
    contacts: false,
    staff: false,
    gallery: false,
    mainContent: true,
    leftSidebar: false,
    rightSidebar: false,
    collegeTopMenu: false,
    farmersCta: false,
    heroContactButton: false,
  },
};

export function presetForLayoutTemplate(template: LayoutTemplate): PageLayoutConfig {
  if (template === "office_portal") return { ...LAYOUT_PRESETS.office_portal };
  if (template === "college_home") return { ...LAYOUT_PRESETS.college_home };
  return { ...LAYOUT_PRESETS.minimal };
}

export function mergeLayoutConfig(
  stored: Partial<PageLayoutConfig> | null | undefined,
  template: LayoutTemplate,
): PageLayoutConfig {
  const preset = presetForLayoutTemplate(template);
  if (!stored) return preset;

  const config = { ...preset };
  for (const key of LAYOUT_CONFIG_KEYS) {
    if (typeof stored[key] === "boolean") {
      config[key] = stored[key];
    }
  }
  return config;
}

export function hasCompleteLayoutConfig(
  config: Partial<PageLayoutConfig> | null | undefined,
): config is PageLayoutConfig {
  if (!config) return false;
  return LAYOUT_CONFIG_KEYS.every((key) => typeof config[key] === "boolean");
}

/** Persist exactly what the admin toggles (including explicit false values). */
export function layoutConfigFromForm(
  formData: FormData,
  template: LayoutTemplate,
): PageLayoutConfig | null {
  const fromForm = parseLayoutConfigFromForm(formData);

  if (hasCompleteLayoutConfig(fromForm)) {
    return fromForm;
  }

  if (template === "standard") return null;
  return mergeLayoutConfig(fromForm, template);
}

export function isCollegeLayoutPage(page: {
  page_type?: string | null;
  layout_template?: string | null;
  layout_config?: unknown;
}): boolean {
  if (page.page_type === "college") return true;
  if (page.layout_template === "office_portal" || page.layout_template === "college_home") {
    return true;
  }
  return Boolean(parseLayoutConfigJson(page.layout_config));
}

export function readStoredLayoutConfig(
  stored: unknown,
  template: LayoutTemplate,
): PageLayoutConfig {
  const parsed = parseLayoutConfigJson(stored);
  if (hasCompleteLayoutConfig(parsed)) {
    return parsed;
  }
  return mergeLayoutConfig(parsed, template);
}

export function applyLayoutConfigToFormData(
  formData: FormData,
  config: PageLayoutConfig,
): void {
  formData.set("layoutConfigJson", JSON.stringify(config));
  for (const key of LAYOUT_CONFIG_KEYS) {
    formData.set(`layout_${key}`, config[key] ? "true" : "false");
  }
}

export function resolveLayoutTemplateFromForm(formData: FormData): LayoutTemplate {
  const raw = formData.get("layoutTemplate");
  if (raw === "office_portal" || raw === "college_home" || raw === "standard") {
    return raw;
  }
  if (formData.get("parentId")) return "college_home";
  if (formData.get("pageType") === "college") return "college_home";
  return "standard";
}

export function needsOfficePortalData(config: PageLayoutConfig): boolean {
  return (
    config.headOfficer ||
    config.contacts ||
    config.staff ||
    config.gallery ||
    config.leftSidebar ||
    config.rightSidebar
  );
}

export function needsOfficeDataLoad(config: PageLayoutConfig): boolean {
  return needsOfficePortalData(config) || config.farmersCta;
}

export function usesConfigurableCollegeLayout(
  pageType: string,
  template: LayoutTemplate,
): boolean {
  return pageType === "college" && template !== "standard";
}

export function parseLayoutConfigJson(raw: unknown): Partial<PageLayoutConfig> | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const partial: Partial<PageLayoutConfig> = {};
  for (const key of LAYOUT_CONFIG_KEYS) {
    if (typeof input[key] === "boolean") {
      partial[key] = input[key];
    }
  }
  return Object.keys(partial).length > 0 ? partial : null;
}

export function parseLayoutConfigFromForm(formData: FormData): Partial<PageLayoutConfig> | null {
  const partial: Partial<PageLayoutConfig> = {};
  let found = false;

  for (const key of LAYOUT_CONFIG_KEYS) {
    const value = formData.get(`layout_${key}`);
    if (value === "true") {
      partial[key] = true;
      found = true;
    } else if (value === "false") {
      partial[key] = false;
      found = true;
    }
  }

  if (found) return partial;

  const raw = formData.get("layoutConfigJson");
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return parseLayoutConfigJson(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const LAYOUT_SECTION_LABELS: Record<
  keyof PageLayoutConfig,
  { en: string; hi: string; description: string }
> = {
  hero: {
    en: "Hero banner",
    hi: "हीरो बैनर",
    description: "Large banner with college/office title",
  },
  headOfficer: {
    en: "Head officer / Dean",
    hi: "प्रमुख अधिकारी / डीन",
    description: "Photo, name and role block",
  },
  contacts: {
    en: "Contact lines",
    hi: "संपर्क विवरण",
    description: "Telephone, email and address lines",
  },
  staff: {
    en: "Staff directory",
    hi: "कर्मचारी सूची",
    description: "Staff table with photos",
  },
  gallery: {
    en: "Photo gallery",
    hi: "फोटो गैलरी",
    description: "Zoomable image grid with lightbox",
  },
  mainContent: {
    en: "Main content",
    hi: "मुख्य सामग्री",
    description: "Page body HTML from the content editor",
  },
  leftSidebar: {
    en: "Left sidebar",
    hi: "बायाँ साइडबार",
    description: "Quick links on the left",
  },
  rightSidebar: {
    en: "Right sidebar",
    hi: "दायाँ साइडबार",
    description: "Related links on the right",
  },
  collegeTopMenu: {
    en: "College top menu",
    hi: "महाविद्यालय शीर्ष मेनू",
    description: "Home, Department, Gallery tabs",
  },
  farmersCta: {
    en: "Farmers portal band",
    hi: "किसान पोर्टल पट्टी",
    description: "Farmers portal call-to-action at page bottom",
  },
  heroContactButton: {
    en: "Hero contact button",
    hi: "हीरो संपर्क बटन",
    description: "Contact Us button on the hero banner",
  },
};
