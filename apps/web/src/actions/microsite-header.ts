"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { canEditPages, sessionCanAccessCollegeRoot } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import { loadMicrositeHeaderForAdmin } from "@/lib/data/microsite-header";
import { assertCollegeRegisterAccess } from "@/lib/pages/college-register-helpers";
import { parseMicrositeHeader } from "@/lib/pages/microsite-header";
import { getCollegePublicHomePath } from "@/lib/pages/routes";
import { uploadPageLogoImage } from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";

function imageFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

export async function updateMicrositeHeaderAction(
  collegePageId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession();
    if (!canEditPages(session) || !sessionCanAccessCollegeRoot(session, collegePageId)) {
      return fail("You do not have access to this microsite header.");
    }
    const college = await assertCollegeRegisterAccess(session, collegePageId);
    const current = await loadMicrositeHeaderForAdmin(collegePageId);
    if (!current) return fail("Microsite not found.");
    if (!current.columnReady) {
      return fail(
        "The microsite header column is not in the database yet. Run supabase/migrations/20260929140000_microsite_header.sql in the Supabase SQL editor, then save again.",
      );
    }

    let logoPath = formData.get("removeLogo") === "on" ? "" : current.header.logoPath;
    const logo = imageFile(formData, "logo");
    if (logo) {
      const admin = createAdminClient();
      if (!admin) return fail("Database not configured.");
      const uploaded = await uploadPageLogoImage(admin, collegePageId, logo);
      if (!uploaded.success) return fail(uploaded.error ?? "Logo upload failed.");
      logoPath = uploaded.data;
    }

    const header = parseMicrositeHeader({
      custom: formData.get("custom") === "on",
      nameEn: formData.get("nameEn"),
      nameHi: formData.get("nameHi"),
      taglineEn: formData.get("taglineEn"),
      taglineHi: formData.get("taglineHi"),
      logoPath,
      showUniversityMenu: formData.get("showUniversityMenu") === "on",
    });
    if (header.custom && !header.nameEn) {
      return fail("English name is required for a custom header.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin
      .from(Tables.pages)
      .update({ microsite_header: header, updated_by: session.userId })
      .eq("id", collegePageId);
    if (error) {
      if (/microsite_header/i.test(error.message)) {
        return fail(
          "The microsite header column is not in the database yet. Run supabase/migrations/20260929140000_microsite_header.sql in the Supabase SQL editor, then save again.",
        );
      }
      return fail(error.message);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "microsite_header",
      entityId: collegePageId,
      details: { custom: header.custom, slug: college.slug },
    });

    revalidatePath(`/admin/register/${collegePageId}/header`);
    revalidatePath(getCollegePublicHomePath(college.slug));
    revalidatePath(`/college/${college.slug}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save the microsite header.");
  }
}
