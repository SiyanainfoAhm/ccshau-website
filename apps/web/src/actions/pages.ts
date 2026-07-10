"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import {
  canCreateCollegeRoot,
  canDeletePages,
  canPublishPages,
  hasUniversityCmsRole,
  isCollegeOnlyUser,
  isSuperAdminSession,
  isUniversityAdminSession,
  universityCmsPageListOrFilter,
} from "@/lib/auth/college-scope";
import { assertPageAccess, getPageCollegeRootId } from "@/lib/auth/college-scope-server";
import { CMS_READ_ROLES, isUniversityWideCmsSession } from "@/lib/auth/cms-roles";
import { hasRole } from "@/lib/auth/rbac";
import {
  requireAdminSession,
  requirePageEditSession,
} from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, Page, PageType } from "@/lib/database/types";
import { syncPublishedCollegeToMenu, removeCollegeFromMenu } from "@/lib/pages/college-menu";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { slugify } from "@/lib/utils/slug";
import {
  layoutConfigFromForm,
  resolveLayoutTemplateFromForm,
} from "@/lib/pages/layout-config";
import { resolvePagePublicPath, getPagePathAncestors, resolveCollegeRootPageType, isCollegesContainerSlug } from "@/lib/pages/resolve-public-path";
import { syncCollegeContactLines } from "@/lib/pages/college-contact-seed";
import { pageFormSchema } from "@/lib/validations/pages";
import { emptyPaginatedResult, mergeAdminListOptions, runPaginatedQuery } from "@/lib/data/admin-list";
import type { PaginatedResult } from "@/lib/data/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

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
    layoutTemplate: resolveLayoutTemplateFromForm(formData),
    featuredImagePath: formData.get("featuredImagePath") || undefined,
    logoImagePath: formData.get("logoImagePath") || undefined,
    headNameEn: formData.get("headNameEn") || undefined,
    headNameHi: formData.get("headNameHi") || undefined,
    headRoleEn: formData.get("headRoleEn") || undefined,
    headRoleHi: formData.get("headRoleHi") || undefined,
    headImagePath: formData.get("headImagePath") || undefined,
    addressEn: formData.get("addressEn") || undefined,
    addressHi: formData.get("addressHi") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    mapLat: formData.get("mapLat") || undefined,
    mapLng: formData.get("mapLng") || undefined,
    contactLocationEnabled: formData.get("contactLocationEnabled") ?? undefined,
    officeCtaEnabled: formData.get("officeCtaEnabled") !== "off",
    status: formData.get("status"),
  });
}

async function resolveParentSlug(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  parentId: string | null | undefined,
) {
  if (!parentId) return null;

  const { data: parent } = await admin
    .from(Tables.pages)
    .select("slug")
    .eq("id", parentId)
    .maybeSingle();

  return parent?.slug ?? null;
}

async function persistCollegeContact(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  pageId: string,
  input: ReturnType<typeof pageFormSchema.parse>,
) {
  if (input.pageType !== "college" || !input.contactLocationEnabled) {
    return;
  }

  if (!input.addressEn || !input.phone || !input.email) {
    return;
  }

  await syncCollegeContactLines(admin, pageId, {
    addressEn: input.addressEn,
    addressHi: input.addressHi,
    phone: input.phone,
    email: input.email,
  });
}

function toPageRow(
  input: ReturnType<typeof pageFormSchema.parse>,
  userId: string,
  formData: FormData,
  parentSlug: string | null | undefined,
) {
  const publishedAt = input.status === "published" ? new Date().toISOString() : null;
  const pageType = resolveCollegeRootPageType(input.pageType, input.parentId || null, parentSlug);
  const layoutTemplate = resolveLayoutTemplateFromForm(formData);
  const layoutConfig = layoutConfigFromForm(formData, layoutTemplate);

  const base = {
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
    layout_config: layoutConfig,
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

  if (pageType !== "college") return base;

  return {
    ...base,
    map_lat: input.contactLocationEnabled ? (input.mapLat ?? null) : null,
    map_lng: input.contactLocationEnabled ? (input.mapLng ?? null) : null,
  };
}

async function assertParentInCollegeScope(
  session: Awaited<ReturnType<typeof requirePageEditSession>>,
  parentId: string | null | undefined,
  pageType: PageType,
): Promise<void> {
  if (!parentId) {
    if (pageType === "college" && !canCreateCollegeRoot(session)) {
      throw new Error("Only super admins can create new college microsites.");
    }
    return;
  }

  const admin = createAdminClient();
  if (!admin) throw new Error("Database not configured.");

  const { data: parent } = await admin
    .from(Tables.pages)
    .select("id, college_root_id, page_type")
    .eq("id", parentId)
    .maybeSingle();

  if (!parent) throw new Error("Parent page not found.");

  if (isCollegeOnlyUser(session)) {
    const collegeRootId =
      parent.page_type === "college"
        ? parent.id
        : parent.college_root_id ??
          (await getPageCollegeRootId({ id: parent.id, college_root_id: parent.college_root_id }));
    if (!collegeRootId || collegeRootId !== session.collegeAssignment?.collegePageId) {
      throw new Error("You can only create pages within your assigned college.");
    }
  }
}

export async function createPageAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePageEditSession();
    const parsed = parsePageForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (parsed.data.status === "published" && !canPublishPages(session)) {
      return fail("You do not have permission to publish pages.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const parentSlug = await resolveParentSlug(admin, parsed.data.parentId || null);
    const pageType = resolveCollegeRootPageType(
      parsed.data.pageType,
      parsed.data.parentId || null,
      parentSlug,
    );

    if (pageType === "college" && !canCreateCollegeRoot(session)) {
      return fail("Only super admins can create new college microsites.");
    }

    await assertParentInCollegeScope(session, parsed.data.parentId || null, pageType);

    const row = {
      ...toPageRow(parsed.data, session.userId, formData, parentSlug),
      created_by: session.userId,
    };

    const { data, error } = await admin.from(Tables.pages).insert(row).select("id").single();
    if (error) return fail(error.message);

    if (row.page_type === "college") {
      try {
        await persistCollegeContact(admin, data.id, parsed.data);
      } catch (contactError) {
        return fail(
          contactError instanceof Error
            ? contactError.message
            : "Failed to save college contact information.",
        );
      }
    }

    if (row.status === "published" && row.page_type === "college") {
      await syncPublishedCollegeToMenu(admin, data.id);
    }

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "create",
      entityType: "pages",
      entityId: data.id,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/college/${parsed.data.slug}`);
    revalidatePath(`/college/contact-us/${parsed.data.slug}`);
    revalidatePath("/");
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
    const session = await requirePageEditSession();

    const parsed = parsePageForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (parsed.data.status === "published" && !canPublishPages(session)) {
      return fail("You do not have permission to publish pages.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const existing = await assertPageAccess(session, pageId);
    const parentSlug = await resolveParentSlug(admin, parsed.data.parentId || null);
    const row = toPageRow(parsed.data, session.userId, formData, parentSlug);

    if (
      isCollegesContainerSlug(parentSlug) &&
      (existing.page_type === "college" || existing.layout_template === "college_home") &&
      row.page_type !== "college"
    ) {
      row.page_type = "college";
    }

    if (
      existing.page_type === "college" &&
      row.page_type !== "college" &&
      isCollegesContainerSlug(parentSlug)
    ) {
      row.page_type = "college";
    }

    if (
      existing.page_type === "college" &&
      row.page_type !== "college" &&
      !isSuperAdminSession(session) &&
      !isUniversityAdminSession(session)
    ) {
      return fail("Cannot change a college microsite to a standard page.");
    }

    const { error } = await admin.from(Tables.pages).update(row).eq("id", pageId);
    if (error) return fail(error.message);

    if (row.page_type === "college") {
      try {
        await persistCollegeContact(admin, pageId, parsed.data);
      } catch (contactError) {
        return fail(
          contactError instanceof Error
            ? contactError.message
            : "Failed to save college contact information.",
        );
      }
    }

    if (row.page_type === "college") {
      if (row.status === "published") {
        await syncPublishedCollegeToMenu(admin, pageId);
      }
    }

    const { data: allPages } = await admin
      .from(Tables.pages)
      .select("id, slug, page_type, parent_id");
    const pageById = new Map(((allPages as Page[]) ?? []).map((p) => [p.id, p]));
    const updatedPage = {
      id: pageId,
      slug: parsed.data.slug,
      page_type: row.page_type as PageType,
      parent_id: row.parent_id,
    };
    const publicPath = resolvePagePublicPath(updatedPage, pageById);
    const ancestors = getPagePathAncestors(updatedPage, pageById);

    await writeAuditLog({
      userId: session.userId,
      action: parsed.data.status === "published" ? "publish" : "update",
      entityType: "pages",
      entityId: pageId,
      details: { slug: parsed.data.slug },
    });

    revalidatePath("/admin/pages");
    revalidatePath("/admin/register");
    revalidatePath(`/admin/pages/${pageId}`);
    revalidatePath(`/pages/${parsed.data.slug}`);
    revalidatePath(`/college/${parsed.data.slug}`);
    revalidatePath(`/college/contact-us/${parsed.data.slug}`);
    revalidatePath(publicPath);
    revalidatePath("/");
    if (ancestors.grandparentSlug) {
      revalidatePath(`/college/${ancestors.grandparentSlug}`);
    } else if (ancestors.parentPageType === "college" && ancestors.parentSlug) {
      revalidatePath(`/college/${ancestors.parentSlug}`);
    }
    return ok({ id: pageId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update page");
  }
}

export async function deletePageAction(pageId: string): Promise<ActionResult> {
  try {
    const session = await requirePageEditSession();
    if (!canDeletePages(session)) {
      return fail("You do not have permission to delete pages.");
    }

    await assertPageAccess(session, pageId);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: page } = await admin
      .from(Tables.pages)
      .select("slug, parent_id, page_type")
      .eq("id", pageId)
      .maybeSingle();

    const { error } = await admin.from(Tables.pages).delete().eq("id", pageId);
    if (error) return fail(error.message);

    if (page?.page_type === "college") {
      await removeCollegeFromMenu(admin, pageId);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "pages",
      entityId: pageId,
    });

    revalidatePath("/admin/pages");
    revalidatePath("/");
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

const PAGES_LIST_SORTS = ["title_en", "slug", "status", "page_type", "updated_at", "created_at"] as const;

export async function listPagesForAdmin(
  options: import("@/lib/data/admin-list").AdminListOptions = {},
): Promise<PaginatedResult<Page>> {
  const opts = mergeAdminListOptions(options, {
    sortBy: "updated_at",
    sortOrder: "desc",
    allowedSorts: PAGES_LIST_SORTS,
  });

  const session = await requireAdminSession();
  const canList =
    hasRole(session.roles, [...CMS_READ_ROLES]) ||
    Boolean(session.collegeAssignment);

  if (!canList) return emptyPaginatedResult(opts);

  const admin = createAdminClient();
  if (!admin) return emptyPaginatedResult(opts);

  let query = admin.from(Tables.pages).select("*", { count: "exact" });

  if (isCollegeOnlyUser(session) && session.collegeAssignment) {
    query = query.eq("college_root_id", session.collegeAssignment.collegePageId);
  } else if (
    !isUniversityWideCmsSession(session) &&
    hasUniversityCmsRole(session) &&
    !isCollegeOnlyUser(session) &&
    session.departmentId
  ) {
    query = query.or(universityCmsPageListOrFilter(session.departmentId));
  }

  if (opts.search) {
    const term = `%${opts.search}%`;
    query = query.or(`title_en.ilike.${term},title_hi.ilike.${term},slug.ilike.${term}`);
  }

  return runPaginatedQuery<Page>(query, opts);
}

export async function listAllPagesForAdmin(): Promise<Page[]> {
  const result = await listPagesForAdmin({ page: 1, pageSize: 5000 });
  return result.items;
}

export async function getPageById(pageId: string): Promise<Page | null> {
  const session = await requireAdminSession();
  const canView =
    hasRole(session.roles, [...CMS_READ_ROLES]) ||
    Boolean(session.collegeAssignment);

  if (!canView) return null;

  try {
    return await assertPageAccess(session, pageId);
  } catch {
    return null;
  }
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
