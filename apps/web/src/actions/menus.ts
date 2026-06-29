"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { Menu, MenuItem, MenuLocation, PageType } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { menuItemFormSchema } from "@/lib/validations/menus";
import { createAdminClient } from "@/lib/supabase/admin";

const MENU_ROLES = ["super_admin", "dept_admin", "editor"] as const;

export interface MenuWithCount extends Menu {
  item_count: number;
}

export interface MenuEditorData {
  menu: Menu;
  items: MenuItem[];
  pages: { id: string; slug: string; title_en: string; page_type?: PageType }[];
}

function parseMenuItemForm(formData: FormData) {
  return menuItemFormSchema.safeParse({
    labelEn: formData.get("labelEn"),
    labelHi: formData.get("labelHi") || undefined,
    href: formData.get("href") || undefined,
    pageId: formData.get("pageId") || "",
    parentId: formData.get("parentId") || "",
    sortOrder: formData.get("sortOrder") ?? 0,
    openInNewTab: formData.get("openInNewTab") === "on",
    isActive: formData.get("isActive") !== "off",
  });
}

function toMenuItemRow(input: ReturnType<typeof menuItemFormSchema.parse>, menuId: string) {
  return {
    menu_id: menuId,
    label_en: input.labelEn,
    label_hi: input.labelHi || null,
    href: input.pageId ? null : input.href || null,
    page_id: input.pageId || null,
    parent_id: input.parentId || null,
    sort_order: input.sortOrder,
    open_in_new_tab: input.openInNewTab ?? false,
    is_active: input.isActive ?? true,
  };
}

export async function listMenusForAdmin(): Promise<MenuWithCount[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: menus } = await admin.from(Tables.menus).select("*").order("location");
  if (!menus?.length) return [];

  const { data: counts } = await admin.from(Tables.menuItems).select("menu_id");
  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.menu_id, (countMap.get(row.menu_id) ?? 0) + 1);
  }

  return (menus as Menu[]).map((menu) => ({
    ...menu,
    item_count: countMap.get(menu.id) ?? 0,
  }));
}

export async function getMenuEditorData(location: MenuLocation): Promise<MenuEditorData | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: menu } = await admin
    .from(Tables.menus)
    .select("*")
    .eq("location", location)
    .maybeSingle();

  if (!menu) return null;

  const [{ data: items }, { data: pages }] = await Promise.all([
    admin
      .from(Tables.menuItems)
      .select("*")
      .eq("menu_id", menu.id)
      .order("sort_order")
      .order("label_en"),
    admin
      .from(Tables.pages)
      .select("id, slug, title_en, page_type")
      .eq("status", "published")
      .order("title_en"),
  ]);

  return {
    menu: menu as Menu,
    items: (items ?? []) as MenuItem[],
    pages: pages ?? [],
  };
}

export async function createMenuItemAction(
  menuId: string,
  location: MenuLocation,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...MENU_ROLES]);
    const parsed = parseMenuItemForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (!parsed.data.href && !parsed.data.pageId) {
      return fail("Provide a URL or link to a published page.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data, error } = await admin
      .from(Tables.menuItems)
      .insert(toMenuItemRow(parsed.data, menuId))
      .select("id")
      .single();

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "menu_item",
      entityId: data.id,
      details: { location, label: parsed.data.labelEn },
    });

    revalidatePath(`/admin/menus/${location}`);
    revalidatePath("/admin/menus");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Create failed.");
  }
}

export async function updateMenuItemAction(
  itemId: string,
  menuId: string,
  location: MenuLocation,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...MENU_ROLES]);
    const parsed = parseMenuItemForm(formData);
    if (!parsed.success) {
      return fail("Validation failed", parsed.error.flatten().fieldErrors);
    }

    if (!parsed.data.href && !parsed.data.pageId) {
      return fail("Provide a URL or link to a published page.");
    }

    if (parsed.data.parentId === itemId) {
      return fail("A menu item cannot be its own parent.");
    }

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin
      .from(Tables.menuItems)
      .update(toMenuItemRow(parsed.data, menuId))
      .eq("id", itemId);

    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "menu_item",
      entityId: itemId,
      details: { location, label: parsed.data.labelEn },
    });

    revalidatePath(`/admin/menus/${location}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed.");
  }
}

export async function deleteMenuItemAction(
  itemId: string,
  location: MenuLocation,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...MENU_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { error } = await admin.from(Tables.menuItems).delete().eq("id", itemId);
    if (error) return fail(error.message);

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "menu_item",
      entityId: itemId,
      details: { location },
    });

    revalidatePath(`/admin/menus/${location}`);
    revalidatePath("/admin/menus");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Delete failed.");
  }
}
