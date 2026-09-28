"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { canEditPages, sessionCanAccessCollegeRoot } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import { assertCollegeRegisterAccess } from "@/lib/pages/college-register-helpers";
import { parseMicrositeFooter, type MicrositeFooterLink, type MicrositeFooterSection } from "@/lib/pages/microsite-footer";
import { getCollegePublicHomePath } from "@/lib/pages/routes";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { createAdminClient } from "@/lib/supabase/admin";

function linksFromForm(formData: FormData, sectionIndex: number): MicrositeFooterLink[] {
  const labels = formData.getAll(`linkLabelEn${sectionIndex}`).map(String);
  const labelsHi = formData.getAll(`linkLabelHi${sectionIndex}`).map(String);
  const hrefs = formData.getAll(`linkHref${sectionIndex}`).map(String);
  return labels.flatMap((labelEn, index) => {
    const href = hrefs[index]?.trim() ?? "";
    const label = labelEn.trim();
    if (!label || !href) return [];
    return [{ labelEn: label, labelHi: labelsHi[index]?.trim() ?? "", href }];
  }).slice(0, 30);
}

function sectionsFromForm(formData: FormData): MicrositeFooterSection[] {
  return [0, 1, 2, 3].map((index) => ({
    titleEn: String(formData.get(`sectionTitleEn${index}`) ?? "").trim(),
    titleHi: String(formData.get(`sectionTitleHi${index}`) ?? "").trim(),
    links: linksFromForm(formData, index),
  }));
}

export async function updateMicrositeFooterAction(
  collegePageId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession();
    if (!canEditPages(session) || !sessionCanAccessCollegeRoot(session, collegePageId)) {
      return fail("You do not have access to this microsite footer.");
    }
    const college = await assertCollegeRegisterAccess(session, collegePageId);
    const footer = parseMicrositeFooter({
      custom: formData.get("custom") === "on",
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi"),
      descriptionEn: formData.get("descriptionEn"),
      descriptionHi: formData.get("descriptionHi"),
      addressEn: formData.get("addressEn"),
      addressHi: formData.get("addressHi"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      sections: sectionsFromForm(formData),
      links: [],
    });
    if (footer.custom && !footer.nameEn) {
      return fail("English name is required for a custom footer.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin
      .from(Tables.pages)
      .update({ microsite_footer: footer, updated_by: session.userId })
      .eq("id", collegePageId);
    if (error) {
      if (/microsite_footer/i.test(error.message)) {
        return fail(
          "The microsite footer column is not in the database yet. Run supabase/migrations/20260928100000_microsite_footer.sql in the Supabase SQL editor, then save again.",
        );
      }
      return fail(error.message);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "microsite_footer",
      entityId: collegePageId,
      details: { custom: footer.custom, slug: college.slug },
    });

    revalidatePath(`/admin/register/${collegePageId}/footer`);
    revalidatePath(getCollegePublicHomePath(college.slug));
    revalidatePath(`/college/${college.slug}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save the microsite footer.");
  }
}
