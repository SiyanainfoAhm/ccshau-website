import { Tables } from "@/lib/database/names";
import type { ContentStatus } from "@/lib/database/types";
import {
  buildDefaultSectionSeeds,
  DEPARTMENT_SUBSECTION_LAYOUT_CONFIG,
  parseDepartmentNames,
} from "@/lib/pages/college-wizard-defaults";
import { seedDepartmentSidebar } from "@/lib/pages/college-register-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SeedMicrositeStructureInput {
  rootPageId: string;
  shortPrefix: string;
  titleEn: string;
  status: ContentStatus;
  publishedAt: string | null;
  userId: string;
  seedDefaultSections: boolean;
  departmentNames?: string;
}

export async function seedMicrositeStructure(
  admin: SupabaseClient,
  input: SeedMicrositeStructureInput,
): Promise<{ departmentSectionId: string | null; departmentCount: number }> {
  let departmentSectionId: string | null = null;

  if (input.seedDefaultSections) {
    const sections = buildDefaultSectionSeeds(input.shortPrefix, input.titleEn);

    for (const section of sections) {
      const { data: sectionPage, error: sectionError } = await admin
        .from(Tables.pages)
        .insert({
          slug: section.slug,
          title_en: section.titleEn,
          title_hi: section.titleHi,
          excerpt_en: section.excerptEn,
          excerpt_hi: section.excerptHi,
          content_en: section.contentEn || null,
          content_hi: section.contentHi || null,
          parent_id: input.rootPageId,
          page_type: "standard",
          layout_template: section.layoutTemplate,
          layout_config: section.layoutConfig,
          status: input.status,
          published_at: input.publishedAt,
          sort_order: section.sortOrder,
          office_cta_enabled: true,
          created_by: input.userId,
          updated_by: input.userId,
          content_owner_id: input.userId,
        })
        .select("id, slug")
        .single();

      if (sectionError || !sectionPage) {
        throw new Error(sectionError?.message ?? `Failed to create section ${section.slug}.`);
      }

      if (section.slug.endsWith("-department")) {
        departmentSectionId = sectionPage.id;
      }
    }
  }

  const departments = parseDepartmentNames(input.departmentNames);
  if (departments.length > 0 && departmentSectionId) {
    for (const [index, dept] of departments.entries()) {
      const deptSlug = `${input.shortPrefix}-${dept.slug}`;
      const { data: deptPage, error: deptError } = await admin
        .from(Tables.pages)
        .insert({
          slug: deptSlug,
          title_en: dept.titleEn,
          title_hi: null,
          excerpt_en: `${dept.titleEn} at ${input.titleEn}.`,
          excerpt_hi: null,
          content_en: `<p>About ${dept.titleEn}. Add faculty and detailed content from the admin panel.</p>`,
          content_hi: null,
          parent_id: departmentSectionId,
          page_type: "standard",
          layout_template: "office_portal",
          layout_config: DEPARTMENT_SUBSECTION_LAYOUT_CONFIG,
          status: input.status,
          published_at: input.publishedAt,
          sort_order: index + 1,
          office_cta_enabled: true,
          created_by: input.userId,
          updated_by: input.userId,
          content_owner_id: input.userId,
        })
        .select("id")
        .single();

      if (deptError || !deptPage) {
        throw new Error(deptError?.message ?? `Failed to create department ${dept.titleEn}.`);
      }

      await seedDepartmentSidebar(deptPage.id);
    }
  }

  return { departmentSectionId, departmentCount: departments.length };
}
