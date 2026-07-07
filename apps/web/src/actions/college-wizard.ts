"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { CollegeScopeRole, ContentStatus } from "@/lib/database/types";
import { seedCollegeContactLines } from "@/lib/pages/college-contact-seed";
import {
  COLLEGE_HOME_LAYOUT_CONFIG,
  DIRECTORATE_HOME_LAYOUT_CONFIG,
} from "@/lib/pages/college-wizard-defaults";
import { syncPublishedCollegeToMenu } from "@/lib/pages/college-menu";
import { seedMicrositeStructure } from "@/lib/pages/microsite-seed";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { collegeWizardSchema } from "@/lib/validations/college-wizard";
import { createAdminClient } from "@/lib/supabase/admin";

function parseWizardForm(formData: FormData) {
  return collegeWizardSchema.safeParse({
    micrositeBlueprint: formData.get("micrositeBlueprint") || "academic_college",
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
    const isDirectorate = input.micrositeBlueprint === "directorate";
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

    let parentId: string | null = null;
    if (!isDirectorate) {
      const { data: collegesParent } = await admin
        .from(Tables.pages)
        .select("id")
        .eq("slug", "colleges")
        .maybeSingle();

      if (!collegesParent) {
        return fail("Colleges container page not found. Run database seeds first.");
      }
      parentId = collegesParent.id;
    }

    const publishedAt = input.status === "published" ? new Date().toISOString() : null;
    const layoutConfig = isDirectorate ? DIRECTORATE_HOME_LAYOUT_CONFIG : COLLEGE_HOME_LAYOUT_CONFIG;

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
        parent_id: parentId,
        page_type: "college",
        layout_template: "college_home",
        layout_config: layoutConfig,
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
        office_cta_enabled: !isDirectorate,
        created_by: session.userId,
        updated_by: session.userId,
        content_owner_id: session.userId,
      })
      .select("id")
      .single();

    if (collegeError || !collegePage) {
      return fail(collegeError?.message ?? "Failed to create microsite page.");
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
          : "Failed to save contact information.",
      );
    }

    let departmentCount = 0;
    try {
      const seeded = await seedMicrositeStructure(admin, {
        rootPageId: collegePage.id,
        shortPrefix: input.shortPrefix,
        titleEn: input.titleEn,
        status: input.status as ContentStatus,
        publishedAt,
        userId: session.userId,
        seedDefaultSections: input.seedDefaultSections,
        departmentNames: input.departmentNames,
      });
      departmentCount = seeded.departmentCount;
    } catch (seedError) {
      return fail(seedError instanceof Error ? seedError.message : "Failed to seed microsite structure.");
    }

    if (input.status === "published" && !isDirectorate) {
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
      entityType: isDirectorate ? "directorate_wizard" : "college_wizard",
      entityId: collegePage.id,
      details: {
        slug: input.slug,
        shortPrefix: input.shortPrefix,
        micrositeBlueprint: input.micrositeBlueprint,
        sectionsSeeded: input.seedDefaultSections,
        departmentCount,
      },
    });

    revalidatePath("/admin/register");
    revalidatePath(`/admin/register/${collegePage.id}`);
    revalidatePath(`/college/${input.slug}`);
    revalidatePath(`/college/contact-us/${input.slug}`);
    revalidatePath("/");

    return ok({ collegePageId: collegePage.id, slug: input.slug });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to register microsite.");
  }
}
