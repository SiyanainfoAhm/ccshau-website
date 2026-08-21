import type { HomepageDignitary } from "@/lib/database/types";

/** Live DB may still use title_en/title_hi; canonical schema uses role_en/role_hi. */
type RawHomepageDignitary = {
  id: string;
  name_en: string;
  name_hi: string | null;
  image_path: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  role_en?: string | null;
  role_hi?: string | null;
  title_en?: string | null;
  title_hi?: string | null;
};

export function normalizeHomepageDignitary(row: RawHomepageDignitary): HomepageDignitary {
  return {
    id: row.id,
    name_en: row.name_en,
    name_hi: row.name_hi,
    role_en: String(row.role_en ?? row.title_en ?? ""),
    role_hi: row.role_hi ?? row.title_hi ?? null,
    image_path: row.image_path,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export function isMissingRoleColumnError(message: string | undefined): boolean {
  return Boolean(message && /role_en|role_hi/i.test(message) && /does not exist/i.test(message));
}

export function dignitaryRoleColumns(roleEn: string, roleHi?: string | null) {
  return {
    role: {
      role_en: roleEn,
      role_hi: roleHi || null,
    },
    title: {
      title_en: roleEn,
      title_hi: roleHi || null,
    },
  };
}
