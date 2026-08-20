import type { PublicOfficeContactLine } from "@/lib/data/public-types";

const CONTACT_PAGE_ONLY_LABELS = new Set(["college", "address", "phone"]);

export function isCollegeContactPageOnlyLabel(label: string | null | undefined): boolean {
  return CONTACT_PAGE_ONLY_LABELS.has(String(label || "").trim().toLowerCase());
}

export function officerContactLines<T extends { labelEn?: string; label_en?: string }>(
  lines: T[],
): T[] {
  return lines.filter((line) => !isCollegeContactPageOnlyLabel(line.labelEn ?? line.label_en));
}

export function findExactContactLine<T extends { labelEn?: string; label_en?: string }>(
  lines: T[],
  label: string,
): T | undefined {
  const wanted = label.trim().toLowerCase();
  return lines.find((line) => {
    const value = line.labelEn ?? line.label_en ?? "";
    return String(value).trim().toLowerCase() === wanted;
  });
}
