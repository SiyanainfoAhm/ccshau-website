"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Feedback, FeedbackStatus } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { feedbackUpdateSchema } from "@/lib/validations/feedback";
import { createAdminClient } from "@/lib/supabase/admin";

const FEEDBACK_UPDATE_ROLES = ["super_admin", "dept_admin", "editor"] as const;

export { listDepartments };

export async function listFeedbackForAdmin(status?: FeedbackStatus): Promise<Feedback[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.feedback)
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data ?? []) as Feedback[];
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.feedback).select("*").eq("id", id).maybeSingle();
  return (data as Feedback) ?? null;
}

export async function updateFeedbackAction(
  feedbackId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...FEEDBACK_UPDATE_ROLES]);
    const parsed = feedbackUpdateSchema.safeParse({
      status: formData.get("status"),
      category: formData.get("category") || undefined,
      departmentId: formData.get("departmentId") || "",
      adminRemarks: formData.get("adminRemarks") || undefined,
    });

    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin
      .from(Tables.feedback)
      .update({
        status: parsed.data.status,
        category: parsed.data.category || null,
        department_id: parsed.data.departmentId || null,
        admin_remarks: parsed.data.adminRemarks || null,
      })
      .eq("id", feedbackId);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "feedback",
      entityId: feedbackId,
      details: { status: parsed.data.status },
    });

    revalidatePath("/admin/feedback");
    revalidatePath(`/admin/feedback/${feedbackId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}
