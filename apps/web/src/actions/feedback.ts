"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { CONTENT_EDIT_ROLES, isUniversityWideCmsSession } from "@/lib/auth/cms-roles";
import { hasCmsModuleAccess, requireAdminSessionForCmsModule } from "@/lib/auth/cms-module-access-server";
import { requireAdminSession } from "@/lib/auth/session";
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

function assertFeedbackDepartmentAccess(
  session: Awaited<ReturnType<typeof requireAdminSession>>,
  feedback: Pick<Feedback, "department_id">,
) {
  if (isUniversityWideCmsSession(session)) return;
  if (session.departmentId && feedback.department_id !== session.departmentId) {
    throw new Error("You do not have permission to access this feedback ticket.");
  }
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

  const session = await requireAdminSession();
  if (!(await hasCmsModuleAccess(session, "feedback"))) {
    return emptyPaginatedResult(opts);
  }
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  let query = admin.from(Tables.feedback).select("*", { count: "exact" });
  if (!isUniversityWideCmsSession(session) && session.departmentId) {
    query = query.eq("department_id", session.departmentId);
  }
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
  const session = await requireAdminSession();
  if (!(await hasCmsModuleAccess(session, "feedback"))) {
    return null;
  }
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.feedback).select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  try {
    assertFeedbackDepartmentAccess(session, data as Feedback);
  } catch {
    return null;
  }

  return data as Feedback;
}

export async function updateFeedbackAction(
  feedbackId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminSessionForCmsModule("feedback", [...CONTENT_EDIT_ROLES]);
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

    const { data: existing } = await admin
      .from(Tables.feedback)
      .select("department_id")
      .eq("id", feedbackId)
      .maybeSingle();

    if (!existing) return fail("Feedback ticket not found.");
    assertFeedbackDepartmentAccess(session, existing as Feedback);

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
