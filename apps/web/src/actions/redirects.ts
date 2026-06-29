"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { UrlRedirect } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { redirectFormSchema } from "@/lib/validations/redirects";
import { createAdminClient } from "@/lib/supabase/admin";

const REDIRECT_ROLES = ["super_admin", "dept_admin"] as const;

function parseRedirectForm(formData: FormData) {
  return redirectFormSchema.safeParse({
    legacyPath: formData.get("legacyPath"),
    newPath: formData.get("newPath"),
    redirectType: formData.get("redirectType") ?? 301,
    isActive: formData.get("isActive") !== "off",
    notes: formData.get("notes") || undefined,
  });
}

export async function listRedirectsForAdmin(): Promise<UrlRedirect[]> {
  await requireAdminWithRoles([...REDIRECT_ROLES]);
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.urlRedirects)
    .select("*")
    .order("legacy_path");

  return (data ?? []) as UrlRedirect[];
}

export async function getRedirectById(id: string): Promise<UrlRedirect | null> {
  await requireAdminWithRoles([...REDIRECT_ROLES]);
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.urlRedirects).select("*").eq("id", id).maybeSingle();
  return (data as UrlRedirect) ?? null;
}

export async function createRedirectAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...REDIRECT_ROLES]);
    const parsed = parseRedirectForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const { data, error } = await admin
      .from(Tables.urlRedirects)
      .insert({
        legacy_path: input.legacyPath,
        new_path: input.newPath,
        redirect_type: input.redirectType,
        is_active: input.isActive ?? true,
        notes: input.notes || null,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "url_redirect",
      entityId: data.id,
    });

    revalidatePath("/admin/redirects");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create redirect.");
  }
}

export async function updateRedirectAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...REDIRECT_ROLES]);
    const parsed = parseRedirectForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const input = parsed.data;
    const { error } = await admin
      .from(Tables.urlRedirects)
      .update({
        legacy_path: input.legacyPath,
        new_path: input.newPath,
        redirect_type: input.redirectType,
        is_active: input.isActive ?? true,
        notes: input.notes || null,
      })
      .eq("id", id);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "url_redirect",
      entityId: id,
    });

    revalidatePath("/admin/redirects");
    revalidatePath(`/admin/redirects/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update redirect.");
  }
}

export async function deleteRedirectAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...REDIRECT_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin.from(Tables.urlRedirects).delete().eq("id", id);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "url_redirect",
      entityId: id,
    });

    revalidatePath("/admin/redirects");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete redirect.");
  }
}
