"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { PgSeminarRegistration, PgSeminarRegistrationStatus } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { pgSeminarRegistrationUpdateSchema } from "@/lib/validations/pg-seminar-registration-admin";
import { emptyPaginatedResult, mergeAdminListOptions, runPaginatedQuery, type AdminListOptions } from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdminSession() {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }
  return session;
}

const PG_SEMINAR_LIST_SORTS = [
  "registration_number",
  "student_name",
  "admission_number",
  "seminar_title",
  "status",
  "created_at",
] as const;

export async function listPgSeminarRegistrationsForAdmin(
  status?: PgSeminarRegistrationStatus,
  options: AdminListOptions = {},
): Promise<PaginatedResult<PgSeminarRegistration>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "created_at",
    sortOrder: "desc",
    allowedSorts: PG_SEMINAR_LIST_SORTS,
  });

  await requireSuperAdminSession();
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  let query = admin.from(Tables.pgSeminarRegistrations).select("*", { count: "exact" });
  if (status) {
    query = query.eq("status", status);
  }

  return runPaginatedQuery<PgSeminarRegistration>(query, opts);
}

export async function getPgSeminarRegistrationById(
  id: string,
): Promise<PgSeminarRegistration | null> {
  await requireSuperAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from(Tables.pgSeminarRegistrations)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as PgSeminarRegistration) ?? null;
}

export async function updatePgSeminarRegistrationAction(
  registrationId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdminSession();
    const parsed = pgSeminarRegistrationUpdateSchema.safeParse({
      status: formData.get("status"),
      adminRemarks: formData.get("adminRemarks") || undefined,
    });

    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin
      .from(Tables.pgSeminarRegistrations)
      .update({
        status: parsed.data.status,
        admin_remarks: parsed.data.adminRemarks || null,
      })
      .eq("id", registrationId);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "pg_seminar_registration",
      entityId: registrationId,
      details: { status: parsed.data.status },
    });

    revalidatePath("/admin/pg-seminar-registrations");
    revalidatePath(`/admin/pg-seminar-registrations/${registrationId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}
