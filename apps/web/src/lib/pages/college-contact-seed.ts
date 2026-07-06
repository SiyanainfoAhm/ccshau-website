import type { SupabaseClient } from "@supabase/supabase-js";

import { Tables } from "@/lib/database/names";
import type { PageContactLine } from "@/lib/database/types";

export interface CollegeContactSeedInput {
  addressEn: string;
  addressHi?: string;
  phone: string;
  email: string;
}

export interface ParsedCollegeContact {
  addressEn: string;
  addressHi: string;
  phone: string;
  email: string;
}

function findContactLine(lines: PageContactLine[], ...keywords: string[]) {
  const lower = keywords.map((k) => k.toLowerCase());
  return lines.find((line) =>
    lower.some((keyword) => line.label_en.toLowerCase().includes(keyword)),
  );
}

export function parseCollegeContactFromLines(lines: PageContactLine[]): ParsedCollegeContact {
  const addressLine = findContactLine(lines, "mailing", "address");
  const officeLine = findContactLine(lines, "office", "phone", "telephone");
  const emailLine = findContactLine(lines, "email", "e-mail");

  return {
    addressEn: addressLine?.value_en ?? "",
    addressHi: addressLine?.value_hi ?? "",
    phone: (officeLine?.value_en ?? "").replace(/^office\s*:\s*/i, "").trim(),
    email: (emailLine?.value_en ?? "").replace(/^e-?mail\s*(id)?\s*:\s*/i, "").trim(),
  };
}

export function buildCollegeContactLineRows(pageId: string, input: CollegeContactSeedInput) {
  return [
    {
      page_id: pageId,
      label_en: "Mailing Address",
      label_hi: "डाक पता",
      value_en: input.addressEn,
      value_hi: input.addressHi || input.addressEn,
      sort_order: 1,
      is_active: true,
    },
    {
      page_id: pageId,
      label_en: "Office",
      label_hi: "कार्यालय",
      value_en: input.phone.startsWith("Office") ? input.phone : `Office : ${input.phone}`,
      value_hi: input.phone.startsWith("Office") ? input.phone : `Office : ${input.phone}`,
      sort_order: 2,
      is_active: true,
    },
    {
      page_id: pageId,
      label_en: "Email Id",
      label_hi: "ई-मेल आईडी",
      value_en: input.email,
      value_hi: input.email,
      sort_order: 3,
      is_active: true,
    },
  ];
}

export async function syncCollegeContactLines(
  admin: SupabaseClient,
  pageId: string,
  input: CollegeContactSeedInput,
) {
  const { error: deleteError } = await admin
    .from(Tables.pageContactLines)
    .delete()
    .eq("page_id", pageId);

  if (deleteError) throw new Error(deleteError.message);

  const rows = buildCollegeContactLineRows(pageId, input);
  const { error } = await admin.from(Tables.pageContactLines).insert(rows);
  if (error) throw new Error(error.message);
}

export async function seedCollegeContactLines(
  admin: SupabaseClient,
  pageId: string,
  input: CollegeContactSeedInput,
) {
  await syncCollegeContactLines(admin, pageId, input);
}
