"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CollegeScopeRole, ContentStatus } from "@/lib/database/types";
import {
  buildDefaultSectionSeeds,
  COLLEGE_HOME_LAYOUT_CONFIG,
  DEPARTMENT_SUBSECTION_LAYOUT_CONFIG,
  parseDepartmentNames,
} from "@/lib/pages/college-wizard-defaults";
import { seedCollegeContactLines } from "@/lib/pages/college-contact-seed";
import { syncPublishedCollegeToMenu } from "@/lib/pages/college-menu";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { collegeWizardSchema } from "@/lib/validations/college-wizard";
import { createAdminClient } from "@/lib/supabase/admin";

function parseWizardForm(formData: FormData) {
  return collegeWizardSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    slug: formData.get("slug"),
    shortPrefix: formData.get("shortPrefix"),
    excerptEn: formData.get("excerptEn") || undefined,
    excerptHi: formData.get("excerptHi") || undefined,
    contentEn: formData.get("contentEn") || undefined,
    contentHi: formData.get("contentHi") || undefined,
    featuredImagePath: formData.get("featuredImagePath") || undefined,
    logoImagePath: formData.get("logoImagePath") || undefined,
    headNameEn: formData.get("headNameEn") || undefined,
    headNameHi: formData.get("headNameHi") || undefined,
    headRoleEn: formData.get("headRoleEn") || undefined,
    headRoleHi: formData.get("headRoleHi") || undefined,
    headImagePath: formData.get("headImagePath") || undefined,
    addressEn: formData.get("addressEn") || undefined,
    addressHi: formData.get("addressHi") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    mapLat: formData.get("mapLat") || undefined,
    mapLng: formData.get("mapLng") || undefined,
    status: formData.get("status") || "draft",
    seedDefaultSections: formData.get("seedDefaultSections") ?? undefined,
    departmentNames: formData.get("departmentNames") || undefined,
    assignUserId: formData.get("assignUserId") || undefined,
    collegeRole: formData.get("collegeRole") || undefined,
  });
}

export async function registerCollegeAction(
  formData: FormData,
): Promise<ActionResult<{ collegePageId: string; slug: string }>> {
  try {
    const session = await requireAdminWithRoles(["super_admin"]);
    const parsed = parseWizardForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const input = parsed.data;
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existingSlug } = await admin
      .from(Tables.pages)
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle();

    if (existingSlug) {
      return fail("A page with this slug already exists.");
    }

    const { data: collegesParent } = await admin
      .from(Tables.pages)
      .select("id")
      .eq("slug", "colleges")
      .maybeSingle();

    if (!collegesParent) {
      return fail("Colleges container page not found. Run database seeds first.");
    }

    const publishedAt = input.status === "published" ? new Date().toISOString() : null;

    const { data: collegePage, error: collegeError } = await admin
      .from(Tables.pages)
      .insert({
        slug: input.slug,
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        excerpt_en: input.excerptEn || null,
        excerpt_hi: input.excerptHi || null,
        content_en: input.contentEn || null,
        content_hi: input.contentHi || null,
        parent_id: collegesParent.id,
        page_type: "college",
        layout_template: "college_home",
        layout_config: COLLEGE_HOME_LAYOUT_CONFIG,
        featured_image_path: input.featuredImagePath || null,
        logo_image_path: input.logoImagePath || null,
        head_name_en: input.headNameEn || null,
        head_name_hi: input.headNameHi || null,
        head_role_en: input.headRoleEn || null,
        head_role_hi: input.headRoleHi || null,
        head_image_path: input.headImagePath || null,
        map_lat: input.mapLat ?? null,
        map_lng: input.mapLng ?? null,
        status: input.status as ContentStatus,
        published_at: publishedAt,
        office_cta_enabled: true,
        created_by: session.userId,
        updated_by: session.userId,
        content_owner_id: session.userId,
      })
      .select("id")
      .single();

    if (collegeError || !collegePage) {
      return fail(collegeError?.message ?? "Failed to create college page.");
    }

    try {
      await seedCollegeContactLines(admin, collegePage.id, {
        addressEn: input.addressEn,
        addressHi: input.addressHi,
        phone: input.phone,
        email: input.email,
      });
    } catch (contactError) {
      return fail(
        contactError instanceof Error
          ? contactError.message
          : "Failed to save college contact information.",
      );
    }

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
            parent_id: collegePage.id,
            page_type: "standard",
            layout_template: section.layoutTemplate,
            layout_config: section.layoutConfig,
            status: input.status,
            published_at: publishedAt,
            sort_order: section.sortOrder,
            office_cta_enabled: true,
            created_by: session.userId,
            updated_by: session.userId,
            content_owner_id: session.userId,
          })
          .select("id")
          .single();

        if (sectionError || !sectionPage) {
          return fail(sectionError?.message ?? `Failed to create section ${section.slug}.`);
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
            published_at: publishedAt,
            sort_order: index + 1,
            office_cta_enabled: true,
            created_by: session.userId,
            updated_by: session.userId,
            content_owner_id: session.userId,
          })
          .select("id")
          .single();

        if (deptError || !deptPage) {
          return fail(deptError?.message ?? `Failed to create department ${dept.titleEn}.`);
        }

        await admin.from(Tables.pageSidebarItems).insert([
          {
            page_id: deptPage.id,
            side: "left",
            label_en: "About",
            label_hi: "परिचय",
            content_en: `<p>${dept.titleEn} department at ${input.titleEn}.</p>`,
            sort_order: 1,
            is_active: true,
          },
          {
            page_id: deptPage.id,
            side: "left",
            label_en: "Faculty",
            label_hi: "संकाय",
            sort_order: 2,
            is_active: true,
          },
        ]);
      }
    }

    if (input.status === "published") {
      await syncPublishedCollegeToMenu(admin, collegePage.id);
    }

    if (input.assignUserId && input.collegeRole) {
      const { error: assignError } = await admin.from(Tables.userColleges).upsert(
        {
          user_id: input.assignUserId,
          college_page_id: collegePage.id,
          role: input.collegeRole as CollegeScopeRole,
        },
        { onConflict: "user_id" },
      );

      if (assignError) {
        return fail(assignError.message);
      }
    }

    await writeAuditLog({
      userId: session.userId,
      action: input.status === "published" ? "publish" : "create",
      entityType: "college_wizard",
      entityId: collegePage.id,
      details: {
        slug: input.slug,
        shortPrefix: input.shortPrefix,
        sectionsSeeded: input.seedDefaultSections,
        departmentCount: departments.length,
      },
    });

    revalidatePath("/admin/register");
    revalidatePath(`/admin/register/${collegePage.id}`);
    revalidatePath(`/college/${input.slug}`);
    revalidatePath(`/college/contact-us/${input.slug}`);
    revalidatePath("/");

    return ok({ collegePageId: collegePage.id, slug: input.slug });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to register college.");
  }
}
