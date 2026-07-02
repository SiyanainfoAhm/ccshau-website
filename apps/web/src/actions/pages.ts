"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { hasRole } from "@/lib/auth/rbac";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, Page } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { slugify } from "@/lib/utils/slug";
import { pageFormSchema } from "@/lib/validations/pages";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_ROLES = ["super_admin", "dept_admin", "editor"] as const;
const PUBLISH_ROLES = ["super_admin", "dept_admin"] as const;

function parsePageForm(formData: FormData) {
  return pageFormSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    slug: formData.get("slug"),
    contentEn: formData.get("contentEn") || undefined,
    contentHi: formData.get("contentHi") || undefined,
    excerptEn: formData.get("excerptEn") || undefined,
    excerptHi: formData.get("excerptHi") || undefined,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    departmentId: formData.get("departmentId") || "",
    parentId: formData.get("parentId") || "",
    pageType: formData.get("pageType") || "standard",
    layoutTemplate:
      (formData.get("layoutTemplate") as string | null) ||
      (formData.get("pageType") === "college" ? "college_home" : "standard"),
    featuredImagePath: formData.get("featuredImagePath") || undefined,
    logoImagePath: formData.get("logoImagePath") || undefined,
    headNameEn: formData.get("headNameEn") || undefined,
    headNameHi: formData.get("headNameHi") || undefined,
    headRoleEn: formData.get("headRoleEn") || undefined,
    headRoleHi: formData.get("headRoleHi") || undefined,
    headImagePath: formData.get("headImagePath") || undefined,
    officeCtaEnabled: formData.get("officeCtaEnabled") !== "off",
    status: formData.get("status"),
  });
}

function toPageRow(input: ReturnType<typeof pageFormSchema.parse>, userId: string) {
  const publishedAt = input.status === "published" ? new Date().toISOString() : null;
  const pageType =
    input.pageType === "college" || input.layoutTemplate === "office_portal"
      ? "college"
      : input.pageType;
  const layoutTemplate =
    pageType === "college"
      ? input.layoutTemplate === "office_portal"
        ? "office_portal"
        : "college_home"
      : "standard";

  return {
    slug: input.slug,
    title_en: input.titleEn,
    title_hi: input.titleHi || null,
    content_en: input.contentEn || null,
    content_hi: input.contentHi || null,
    excerpt_en: input.excerptEn || null,
    excerpt_hi: input.excerptHi || null,
    meta_title: input.metaTitle || null,
    meta_description: input.metaDescription || null,
    department_id: input.departmentId || null,
    parent_id: input.parentId || null,
    page_type: pageType,
    layout_template: layoutTemplate,
    featured_image_path: input.featuredImagePath || null,
    logo_image_path: input.logoImagePath || null,
    head_name_en: input.headNameEn || null,
    head_name_hi: input.headNameHi || null,
    head_role_en: input.headRoleEn || null,
    head_role_hi: input.headRoleHi || null,
    head_image_path: input.headImagePath || null,
    office_cta_enabled: input.officeCtaEnabled ?? true,
    status: input.status as ContentStatus,
    published_at: publishedAt,
    content_owner_id: userId,
    updated_by: userId,
  };
}

export async function createPageAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...PAGE_ROLES]);
    const parsed = parsePageForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish pages.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const row = {
      ...toPageRow(parsed.data, session.userId),
      created_by: session.userId,
    };

    const { data, error } = await admin.from(Tables.pages).insert(row).select("id").single();
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "create",
      entityType: "pages",
      entityId: data.id,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/college/${parsed.data.slug}`);
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create page");
  }
}

export async function updatePageAction(
  pageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...PAGE_ROLES]);
    const parsed = parsePageForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.status === "published" &&
      !session.roles.some((r) => PUBLISH_ROLES.includes(r.role as (typeof PUBLISH_ROLES)[number]))
    ) {
      return fail("Only department admins can publish pages.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const row = toPageRow(parsed.data, session.userId);

    const { error } = await admin.from(Tables.pages).update(row).eq("id", pageId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "update",
      entityType: "pages",
      entityId: pageId,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${pageId}`);
    revalidatePath(`/pages/${parsed.data.slug}`);
    revalidatePath(`/college/${parsed.data.slug}`);
    return ok({ id: pageId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update page");
  }
}

export async function deletePageAction(pageId: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles(["super_admin", "dept_admin"]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: page } = await admin
      .from(Tables.pages)
      .select("slug, parent_id")
      .eq("id", pageId)
      .maybeSingle();

    const { error } = await admin.from(Tables.pages).delete().eq("id", pageId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "pages",
      entityId: pageId,
    });

    revalidatePath("/admin/pages");
    if (page?.slug) {
      revalidatePath(`/pages/${page.slug}`);
      revalidatePath(`/college/${page.slug}`);
    }
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete page");
  }
}

export async function suggestSlugAction(title: string): Promise<string> {
  return slugify(title);
}

export async function listPagesForAdmin(): Promise<Page[]> {
  const session = await requireAdminSession();
  if (!hasRole(session.roles, ["super_admin", "dept_admin", "editor", "viewer"])) {
    return [];
  }

  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.pages)
    .select("*")
    .order("updated_at", { ascending: false });

  const isSuperAdmin = session.roles.some((r) => r.role === "super_admin");
  if (!isSuperAdmin && session.departmentId) {
    query = query.eq("department_id", session.departmentId);
  }

  const { data } = await query;
  return (data ?? []) as Page[];
}

export async function getPageById(pageId: string): Promise<Page | null> {
  const session = await requireAdminSession();
  if (!hasRole(session.roles, ["super_admin", "dept_admin", "editor", "viewer"])) {
    return null;
  }

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from(Tables.pages).select("*").eq("id", pageId).maybeSingle();
  return (data as Page) ?? null;
}

export async function listDepartments() {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from(Tables.departments)
    .select("id, slug, name_en, name_hi")
    .eq("is_active", true)
    .order("sort_order");

  return data ?? [];
}
