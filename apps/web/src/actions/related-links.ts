"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { RelatedLink } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { relatedLinkFormSchema } from "@/lib/validations/related-links";
import { emptyPaginatedResult, mergeAdminListOptions, runPaginatedQuery, type AdminListOptions } from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

const LINK_ROLES = ["super_admin", "dept_admin", "editor"] as const;

function parseRelatedLinkForm(formData: FormData) {
  return relatedLinkFormSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    url: formData.get("url"),
    category: formData.get("category") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
    isExternal: formData.get("isExternal") !== "off",
    isActive: formData.get("isActive") !== "off",
  });
}

const RELATED_LINKS_LIST_SORTS = ["title_en", "category", "sort_order", "is_active", "created_at"] as const;

export async function listRelatedLinksForAdmin(
  options: AdminListOptions = {},
): Promise<PaginatedResult<RelatedLink>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "sort_order",
    sortOrder: "asc",
    allowedSorts: RELATED_LINKS_LIST_SORTS,
  });

  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  const query = admin.from(Tables.relatedLinks).select("*", { count: "exact" });
  return runPaginatedQuery<RelatedLink>(query, opts);
}

export async function getRelatedLinkById(id: string): Promise<RelatedLink | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.relatedLinks).select("*").eq("id", id).maybeSingle();
  return (data as RelatedLink) ?? null;
}

export async function createRelatedLinkAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...LINK_ROLES]);
    const parsed = parseRelatedLinkForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const { data, error } = await admin
      .from(Tables.relatedLinks)
      .insert({
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        url: input.url,
        category: input.category || null,
        sort_order: input.sortOrder,
        is_external: input.isExternal ?? true,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "related_link",
      entityId: data.id,
    });

    revalidatePath("/admin/related-links");
    revalidatePath("/");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create link.");
  }
}

export async function updateRelatedLinkAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...LINK_ROLES]);
    const parsed = parseRelatedLinkForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const { error } = await admin
      .from(Tables.relatedLinks)
      .update({
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        url: input.url,
        category: input.category || null,
        sort_order: input.sortOrder,
        is_external: input.isExternal ?? true,
        is_active: input.isActive ?? true,
      })
      .eq("id", id);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "related_link",
      entityId: id,
    });

    revalidatePath("/admin/related-links");
    revalidatePath(`/admin/related-links/${id}`);
    revalidatePath("/");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update link.");
  }
}

export async function deleteRelatedLinkAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...LINK_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin.from(Tables.relatedLinks).delete().eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "related_link",
      entityId: id,
    });

    revalidatePath("/admin/related-links");
    revalidatePath("/");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete link.");
  }
}
