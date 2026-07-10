"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { CONTENT_EDIT_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Feedback, FeedbackStatus } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { feedbackUpdateSchema } from "@/lib/validations/feedback";
import { emptyPaginatedResult, mergeAdminListOptions, runPaginatedQuery, type AdminListOptions } from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

export { listDepartments };

const FEEDBACK_LIST_SORTS = [
  "ticket_number",
  "subject",
  "submitter_name",
  "category",
  "status",
  "created_at",
] as const;

export interface FeedbackListFilters {
  status?: FeedbackStatus;
  q?: string;
  from?: string;
  to?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function escapeIlikeTerm(value: string): string {
  return value.replace(/[%_\\]/g, "");
}

export async function listFeedbackForAdmin(
  filters: FeedbackListFilters = {},
  options: AdminListOptions = {},
): Promise<PaginatedResult<Feedback>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "created_at",
    sortOrder: "desc",
    allowedSorts: FEEDBACK_LIST_SORTS,
  });

  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  let query = admin.from(Tables.feedback).select("*", { count: "exact" });
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const nameQuery = filters.q?.trim();
  if (nameQuery) {
    const term = escapeIlikeTerm(nameQuery);
    if (term) {
      query = query.ilike("submitter_name", `%${term}%`);
    }
  }

  if (filters.from && ISO_DATE.test(filters.from)) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to && ISO_DATE.test(filters.to)) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  return runPaginatedQuery<Feedback>(query, opts);
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
    const session = await requireAdminWithRoles([...CONTENT_EDIT_ROLES]);
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
