export interface MicrositeHeaderInput {
  custom: boolean;
  nameEn: string;
  nameHi: string;
  taglineEn: string;
  taglineHi: string;
  logoPath: string;
  showUniversityMenu: boolean;
}

export interface PublicMicrositeHeader {
  nameEn: string;
  nameHi: string;
  taglineEn: string;
  taglineHi: string;
  logoUrl: string | null;
  showUniversityMenu: boolean;
}

const EMPTY_HEADER: MicrositeHeaderInput = {
  custom: false,
  nameEn: "",
  nameHi: "",
  taglineEn: "",
  taglineHi: "",
  logoPath: "",
  showUniversityMenu: false,
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseMicrositeHeader(raw: unknown): MicrositeHeaderInput {
  if (!raw || typeof raw !== "object") return { ...EMPTY_HEADER };
  const row = raw as Record<string, unknown>;
  return {
    custom: row.custom === true,
    nameEn: text(row.nameEn),
    nameHi: text(row.nameHi),
    taglineEn: text(row.taglineEn),
    taglineHi: text(row.taglineHi),
    logoPath: text(row.logoPath),
    showUniversityMenu: row.showUniversityMenu === true,
  };
}

export function publicHeaderFromSaved(
  saved: MicrositeHeaderInput,
  logoUrl: string | null,
): PublicMicrositeHeader | null {
  if (!saved.custom) return null;
  return {
    nameEn: saved.nameEn,
    nameHi: saved.nameHi || saved.nameEn,
    taglineEn: saved.taglineEn,
    taglineHi: saved.taglineHi,
    logoUrl,
    showUniversityMenu: saved.showUniversityMenu,
  };
}
