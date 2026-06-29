"use server";

import { revalidatePath } from "next/cache";

import { listDepartments } from "@/actions/pages";
import { writeAuditLog } from "@/lib/auth/audit";
import { hasRole } from "@/lib/auth/rbac";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { AttachmentPath, Tender, TenderCorrigendum, TenderStatus } from "@/lib/database/types";
import {
  removeStorageObjects,
  uploadCorrigendumDocument,
  uploadTenderDocuments,
} from "@/lib/storage/upload";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { corrigendumFormSchema, tenderFormSchema } from "@/lib/validations/tenders";
import { createAdminClient } from "@/lib/supabase/admin";

const TENDER_ROLES = ["super_admin", "dept_admin", "editor"] as const;
const PUBLISH_ROLES = ["super_admin", "dept_admin"] as const;

export { listDepartments };

function parseTenderForm(formData: FormData) {
  return tenderFormSchema.safeParse({
    tenderNumber: formData.get("tenderNumber") || undefined,
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    slug: formData.get("slug"),
    descriptionEn: formData.get("descriptionEn") || undefined,
    descriptionHi: formData.get("descriptionHi") || undefined,
    category: formData.get("category") || undefined,
    departmentId: formData.get("departmentId") || "",
    status: formData.get("status"),
    closingDate: formData.get("closingDate") || undefined,
    removedDocuments: formData.get("removedDocuments") || undefined,
  });
}

function getFilesFromForm(formData: FormData): File[] {
  return formData
    .getAll("documents")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function parseRemovedPaths(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function isPublicTenderStatus(status: TenderStatus): boolean {
  return status === "open" || status === "closed" || status === "archived";
}

function toTenderRow(
  input: ReturnType<typeof tenderFormSchema.parse>,
  userId: string,
  existing?: { published_at?: string | null; archived_at?: string | null },
) {
  const now = new Date().toISOString();
  const publishedAt =
    input.status === "open"
      ? existing?.published_at ?? now
      : input.status === "draft"
        ? null
        : existing?.published_at ?? null;
  const archivedAt =
    input.status === "archived" ? existing?.archived_at ?? now : null;

  return {
    tender_number: input.tenderNumber || null,
    slug: input.slug,
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    description_en: input.descriptionEn || null,
    description_hi: input.descriptionHi || null,
    category: input.category || null,
    department_id: input.departmentId || null,
    status: input.status as TenderStatus,
    published_at: publishedAt,
    closing_date: input.closingDate ? new Date(input.closingDate).toISOString() : null,
    archived_at: archivedAt,
    content_owner_id: userId,
    updated_by: userId,
  };
}

async function mergeDocuments(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  tenderId: string,
  formData: FormData,
  parsed: ReturnType<typeof tenderFormSchema.parse>,
  existing: AttachmentPath[] = [],
): Promise<ActionResult<AttachmentPath[]>> {
  const removed = parseRemovedPaths(parsed.removedDocuments);
  const kept = existing.filter((a) => !removed.includes(a.path));

  if (removed.length > 0) {
    await removeStorageObjects(admin, removed);
  }

  const files = getFilesFromForm(formData);
  if (files.length === 0) return ok(kept);

  const upload = await uploadTenderDocuments(
    admin,
    tenderId,
    files,
    isPublicTenderStatus(parsed.status as TenderStatus),
  );
  if (!upload.success) return upload;

  return ok([...kept, ...upload.data]);
}

export async function createTenderAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...TENDER_ROLES]);
    const parsed = parseTenderForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.status === "open" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can open tenders for bidding.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const row = {
      ...toTenderRow(parsed.data, session.userId),
      document_paths: [] as AttachmentPath[],
      created_by: session.userId,
    };

    const { data, error } = await admin.from(Tables.tenders).insert(row).select("id").single();
    if (error) return fail(error.message);

    const documents = await mergeDocuments(admin, data.id, formData, parsed.data);
    if (!documents.success) return fail(documents.error);

    await admin
      .from(Tables.tenders)
      .update({ document_paths: documents.data })
      .eq("id", data.id);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "open" ? "publish" : "create",
      entityType: "tenders",
      entityId: data.id,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/tenders");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create tender");
  }
}

export async function updateTenderAction(
  tenderId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...TENDER_ROLES]);
    const parsed = parseTenderForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.status === "open" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can open tenders for bidding.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.tenders)
      .select("document_paths, published_at, archived_at, status")
      .eq("id", tenderId)
      .maybeSingle();

    const currentDocs = (existing?.document_paths ?? []) as AttachmentPath[];
    const documents = await mergeDocuments(admin, tenderId, formData, parsed.data, currentDocs);
    if (!documents.success) return fail(documents.error);

    const row = {
      ...toTenderRow(parsed.data, session.userId, {
        published_at: existing?.published_at,
        archived_at: existing?.archived_at,
      }),
      document_paths: documents.data,
    };

    const { error } = await admin.from(Tables.tenders).update(row).eq("id", tenderId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "open" ? "publish" : "update",
      entityType: "tenders",
      entityId: tenderId,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/tenders");
    revalidatePath(`/admin/tenders/${tenderId}`);
    return ok({ id: tenderId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update tender");
  }
}

export async function deleteTenderAction(tenderId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles(["super_admin", "dept_admin"]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: tender } = await admin
      .from(Tables.tenders)
      .select("document_paths")
      .eq("id", tenderId)
      .maybeSingle();

    const docPaths = ((tender?.document_paths ?? []) as AttachmentPath[]).map((a) => a.path);

    const { data: corrigenda } = await admin
      .from(Tables.tenderCorrigenda)
      .select("file_path")
      .eq("tender_id", tenderId);

    const corrPaths = (corrigenda ?? [])
      .map((c) => c.file_path)
      .filter((p): p is string => Boolean(p));

    if (docPaths.length > 0 || corrPaths.length > 0) {
      await removeStorageObjects(admin, [...docPaths, ...corrPaths]);
    }

    const { error } = await admin.from(Tables.tenders).delete().eq("id", tenderId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "tenders",
      entityId: tenderId,
    });

    revalidatePath("/admin/tenders");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete tender");
  }
}

export async function addCorrigendumAction(
  tenderId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...TENDER_ROLES]);
    const parsed = corrigendumFormSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
    });
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: tender } = await admin
      .from(Tables.tenders)
      .select("status")
      .eq("id", tenderId)
      .maybeSingle();

    if (!tender) return fail("Tender not found.");

    const { data: corrigendum, error: insertError } = await admin
      .from(Tables.tenderCorrigenda)
      .insert({
        tender_id: tenderId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        created_by: session.userId,
      })
      .select("id")
      .single();

    if (insertError) return fail(insertError.message);

    const file = formData.get("corrigendumFile");
    let filePath: string | null = null;
    let fileName: string | null = null;

    if (file instanceof File && file.size > 0) {
      const upload = await uploadCorrigendumDocument(
        admin,
        tenderId,
        corrigendum.id,
        file,
        isPublicTenderStatus(tender.status as TenderStatus),
      );
      if (!upload.success) return fail(upload.error);
      filePath = upload.data.path;
      fileName = upload.data.name;

      await admin
        .from(Tables.tenderCorrigenda)
        .update({ file_path: filePath, file_name: fileName })
        .eq("id", corrigendum.id);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "tender_corrigenda",
      entityId: corrigendum.id,
      details: { tenderId, title: parsed.data.title },
    });

    revalidatePath(`/admin/tenders/${tenderId}`);
    return ok({ id: corrigendum.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to add corrigendum");
  }
}

export async function deleteCorrigendumAction(
  corrigendumId: string,
  tenderId: string,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles(["super_admin", "dept_admin"]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: item } = await admin
      .from(Tables.tenderCorrigenda)
      .select("file_path")
      .eq("id", corrigendumId)
      .maybeSingle();

    if (item?.file_path) {
      await removeStorageObjects(admin, [item.file_path]);
    }

    const { error } = await admin.from(Tables.tenderCorrigenda).delete().eq("id", corrigendumId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "tender_corrigenda",
      entityId: corrigendumId,
    });

    revalidatePath(`/admin/tenders/${tenderId}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete corrigendum");
  }
}

export async function listTendersForAdmin(): Promise<Tender[]> {
  const session = await requireAdminSession();
  if (!hasRole(session.roles, ["super_admin", "dept_admin", "editor", "viewer"])) {
    return [];
  }

  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin.from(Tables.tenders).select("*").order("updated_at", { ascending: false });

  const isSuperAdmin = session.roles.some((r) => r.role === "super_admin");
  if (!isSuperAdmin && session.departmentId) {
    query = query.eq("department_id", session.departmentId);
  }

  const { data } = await query;
  return (data ?? []) as Tender[];
}

export async function getTenderById(tenderId: string): Promise<Tender | null> {
  const session = await requireAdminSession();
  if (!hasRole(session.roles, ["super_admin", "dept_admin", "editor", "viewer"])) {
    return null;
  }

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.tenders).select("*").eq("id", tenderId).maybeSingle();
  return (data as Tender) ?? null;
}

export async function listCorrigendaForTender(tenderId: string): Promise<TenderCorrigendum[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.tenderCorrigenda)
    .select("*")
    .eq("tender_id", tenderId)
    .order("published_at", { ascending: false });

  return (data ?? []) as TenderCorrigendum[];
}
