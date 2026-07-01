"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type {
  HomepageCta,
  HomepageDignitary,
  HomepageInitiative,
  HomepageQuote,
} from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  homepageCtaSchema,
  homepageDignitarySchema,
  homepageInitiativeSchema,
  homepageQuoteSchema,
} from "@/lib/validations/homepage";
import {
  removeStorageObjects,
  uploadHomepageDignitaryImage,
  uploadHomepageInitiativeImage,
} from "@/lib/storage/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const HOMEPAGE_ROLES = ["super_admin", "dept_admin", "editor"] as const;

function revalidateHomepage() {
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}

function getImageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

function isStoredImagePath(path: string): boolean {
  return path !== "pending" && !path.startsWith("http://") && !path.startsWith("https://");
}

async function resolveHomepageImagePath(
  admin: SupabaseClient,
  entityId: string,
  formData: FormData,
  input: { imagePath?: string; removeImage?: boolean },
  existingPath: string | undefined,
  upload: (
    client: SupabaseClient,
    id: string,
    file: File,
  ) => Promise<ActionResult<string>>,
): Promise<ActionResult<string>> {
  const imageFile = getImageFile(formData);

  if (imageFile) {
    if (existingPath && isStoredImagePath(existingPath)) {
      await removeStorageObjects(admin, [existingPath]);
    }
    return upload(admin, entityId, imageFile);
  }

  if (input.removeImage) {
    return fail("Upload a replacement image or provide an external URL.");
  }

  const url = input.imagePath?.trim();
  if (url) {
    if (existingPath && isStoredImagePath(existingPath) && url !== existingPath) {
      await removeStorageObjects(admin, [existingPath]);
    }
    return ok(url);
  }

  if (existingPath && existingPath !== "pending") {
    return ok(existingPath);
  }

  return fail("Photo is required. Upload an image or enter an image URL.");
}

function parseDignitaryForm(formData: FormData) {
  return homepageDignitarySchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameHi: formData.get("nameHi") || undefined,
    roleEn: formData.get("roleEn"),
    roleHi: formData.get("roleHi") || undefined,
    imagePath: formData.get("imagePath") || undefined,
    removeImage: formData.get("removeImage") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") !== "off",
  });
}

function parseInitiativeForm(formData: FormData) {
  return homepageInitiativeSchema.safeParse({
    titleEn: formData.get("titleEn"),
    titleHi: formData.get("titleHi") || undefined,
    descriptionEn: formData.get("descriptionEn"),
    descriptionHi: formData.get("descriptionHi") || undefined,
    imagePath: formData.get("imagePath") || undefined,
    removeImage: formData.get("removeImage") === "on",
    linkSlug: formData.get("linkSlug") || undefined,
    linkHref: formData.get("linkHref") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") !== "off",
  });
}

// --- Quotes ---

export async function listHomepageQuotesForAdmin(): Promise<HomepageQuote[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.homepageQuotes)
    .select("*")
    .order("sort_order")
    .order("author_en");
  return (data ?? []) as HomepageQuote[];
}

export async function getHomepageQuoteById(id: string): Promise<HomepageQuote | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.homepageQuotes).select("*").eq("id", id).maybeSingle();
  return (data as HomepageQuote) ?? null;
}

export async function createHomepageQuoteAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = homepageQuoteSchema.safeParse({
      authorEn: formData.get("authorEn"),
      authorHi: formData.get("authorHi") || undefined,
      quoteEn: formData.get("quoteEn"),
      quoteHi: formData.get("quoteHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    const { data, error } = await admin
      .from(Tables.homepageQuotes)
      .insert({
        author_en: input.authorEn,
        author_hi: input.authorHi || null,
        quote_en: input.quoteEn,
        quote_hi: input.quoteHi || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "homepage_quote",
      entityId: data.id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/quotes");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create quote.");
  }
}

export async function updateHomepageQuoteAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = homepageQuoteSchema.safeParse({
      authorEn: formData.get("authorEn"),
      authorHi: formData.get("authorHi") || undefined,
      quoteEn: formData.get("quoteEn"),
      quoteHi: formData.get("quoteHi") || undefined,
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    const { error } = await admin
      .from(Tables.homepageQuotes)
      .update({
        author_en: input.authorEn,
        author_hi: input.authorHi || null,
        quote_en: input.quoteEn,
        quote_hi: input.quoteHi || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .eq("id", id);

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "homepage_quote",
      entityId: id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/quotes");
    revalidatePath(`/admin/homepage/quotes/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update quote.");
  }
}

export async function deleteHomepageQuoteAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const { error } = await admin.from(Tables.homepageQuotes).delete().eq("id", id);
    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "homepage_quote",
      entityId: id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/quotes");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete quote.");
  }
}

// --- Dignitaries ---

export async function listHomepageDignitariesForAdmin(): Promise<HomepageDignitary[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.homepageDignitaries)
    .select("*")
    .order("sort_order")
    .order("name_en");
  return (data ?? []) as HomepageDignitary[];
}

export async function getHomepageDignitaryById(id: string): Promise<HomepageDignitary | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.homepageDignitaries).select("*").eq("id", id).maybeSingle();
  return (data as HomepageDignitary) ?? null;
}

export async function createHomepageDignitaryAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = parseDignitaryForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;
    const imageFile = getImageFile(formData);
    const imageUrl = input.imagePath?.trim();

    if (!imageFile && !imageUrl) {
      return fail("Photo is required. Upload an image or enter an image URL.");
    }

    const { data, error } = await admin
      .from(Tables.homepageDignitaries)
      .insert({
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        role_en: input.roleEn,
        role_hi: input.roleHi || null,
        image_path: imageFile ? "pending" : imageUrl!,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    if (imageFile) {
      const upload = await uploadHomepageDignitaryImage(admin, data.id, imageFile);
      if (!upload.success) {
        await admin.from(Tables.homepageDignitaries).delete().eq("id", data.id);
        return upload;
      }
      const { error: updateError } = await admin
        .from(Tables.homepageDignitaries)
        .update({ image_path: upload.data })
        .eq("id", data.id);
      if (updateError) return fail(updateError.message);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "homepage_dignitary",
      entityId: data.id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/dignitaries");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create dignitary.");
  }
}

export async function updateHomepageDignitaryAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = parseDignitaryForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    const { data: existing, error: fetchError } = await admin
      .from(Tables.homepageDignitaries)
      .select("image_path")
      .eq("id", id)
      .single();
    if (fetchError) return fail(fetchError.message);

    const imagePathResult = await resolveHomepageImagePath(
      admin,
      id,
      formData,
      input,
      existing.image_path,
      uploadHomepageDignitaryImage,
    );
    if (!imagePathResult.success) return imagePathResult;

    const { error } = await admin
      .from(Tables.homepageDignitaries)
      .update({
        name_en: input.nameEn,
        name_hi: input.nameHi || null,
        role_en: input.roleEn,
        role_hi: input.roleHi || null,
        image_path: imagePathResult.data,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .eq("id", id);

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "homepage_dignitary",
      entityId: id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/dignitaries");
    revalidatePath(`/admin/homepage/dignitaries/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update dignitary.");
  }
}

export async function deleteHomepageDignitaryAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.homepageDignitaries)
      .select("image_path")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin.from(Tables.homepageDignitaries).delete().eq("id", id);
    if (error) return fail(error.message);

    if (existing?.image_path && isStoredImagePath(existing.image_path)) {
      await removeStorageObjects(admin, [existing.image_path]);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "homepage_dignitary",
      entityId: id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/dignitaries");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete dignitary.");
  }
}

// --- Initiatives (Flagships) ---

export async function listHomepageInitiativesForAdmin(): Promise<HomepageInitiative[]> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from(Tables.homepageInitiatives)
    .select("*")
    .order("sort_order")
    .order("title_en");
  return (data ?? []) as HomepageInitiative[];
}

export async function getHomepageInitiativeById(id: string): Promise<HomepageInitiative | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.homepageInitiatives).select("*").eq("id", id).maybeSingle();
  return (data as HomepageInitiative) ?? null;
}

export async function createHomepageInitiativeAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = parseInitiativeForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;
    const imageFile = getImageFile(formData);
    const imageUrl = input.imagePath?.trim();

    if (!imageFile && !imageUrl) {
      return fail("Banner image is required. Upload an image or enter an image URL.");
    }

    const { data, error } = await admin
      .from(Tables.homepageInitiatives)
      .insert({
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        description_en: input.descriptionEn,
        description_hi: input.descriptionHi || null,
        image_path: imageFile ? "pending" : imageUrl!,
        link_slug: input.linkSlug || null,
        link_href: input.linkHref || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    if (imageFile) {
      const upload = await uploadHomepageInitiativeImage(admin, data.id, imageFile);
      if (!upload.success) {
        await admin.from(Tables.homepageInitiatives).delete().eq("id", data.id);
        return upload;
      }
      const { error: updateError } = await admin
        .from(Tables.homepageInitiatives)
        .update({ image_path: upload.data })
        .eq("id", data.id);
      if (updateError) return fail(updateError.message);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "homepage_initiative",
      entityId: data.id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/flagships");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create initiative.");
  }
}

export async function updateHomepageInitiativeAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = parseInitiativeForm(formData);
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    const { data: existing, error: fetchError } = await admin
      .from(Tables.homepageInitiatives)
      .select("image_path")
      .eq("id", id)
      .single();
    if (fetchError) return fail(fetchError.message);

    const imagePathResult = await resolveHomepageImagePath(
      admin,
      id,
      formData,
      input,
      existing.image_path,
      uploadHomepageInitiativeImage,
    );
    if (!imagePathResult.success) return imagePathResult;

    const { error } = await admin
      .from(Tables.homepageInitiatives)
      .update({
        title_en: input.titleEn,
        title_hi: input.titleHi || null,
        description_en: input.descriptionEn,
        description_hi: input.descriptionHi || null,
        image_path: imagePathResult.data,
        link_slug: input.linkSlug || null,
        link_href: input.linkHref || null,
        sort_order: input.sortOrder,
        is_active: input.isActive ?? true,
      })
      .eq("id", id);

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "homepage_initiative",
      entityId: id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/flagships");
    revalidatePath(`/admin/homepage/flagships/${id}`);
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update initiative.");
  }
}

export async function deleteHomepageInitiativeAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing } = await admin
      .from(Tables.homepageInitiatives)
      .select("image_path")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin.from(Tables.homepageInitiatives).delete().eq("id", id);
    if (error) return fail(error.message);

    if (existing?.image_path && isStoredImagePath(existing.image_path)) {
      await removeStorageObjects(admin, [existing.image_path]);
    }

    await writeAuditLog({
      userId: session.userId,
      action: "delete",
      entityType: "homepage_initiative",
      entityId: id,
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/flagships");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete initiative.");
  }
}

// --- Farmers portal CTA ---

export async function getHomepageCtaForAdmin(): Promise<HomepageCta | null> {
  await requireAdminSession();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from(Tables.homepageCta).select("*").eq("id", 1).maybeSingle();
  return (data as HomepageCta) ?? null;
}

export async function updateHomepageCtaAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireAdminWithRoles([...HOMEPAGE_ROLES]);
    const parsed = homepageCtaSchema.safeParse({
      titleEn: formData.get("titleEn"),
      titleHi: formData.get("titleHi") || undefined,
      subtitleEn: formData.get("subtitleEn") || undefined,
      subtitleHi: formData.get("subtitleHi") || undefined,
      buttonEn: formData.get("buttonEn"),
      buttonHi: formData.get("buttonHi") || undefined,
      linkHref: formData.get("linkHref"),
      isActive: formData.get("isActive") !== "off",
    });
    if (!parsed.success) return fail("Validation failed", parsed.error.flatten().fieldErrors);

    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");
    const input = parsed.data;

    const { error } = await admin.from(Tables.homepageCta).upsert({
      id: 1,
      title_en: input.titleEn,
      title_hi: input.titleHi || null,
      subtitle_en: input.subtitleEn || null,
      subtitle_hi: input.subtitleHi || null,
      button_en: input.buttonEn,
      button_hi: input.buttonHi || null,
      link_href: input.linkHref,
      is_active: input.isActive ?? true,
    });

    if (error) return fail(error.message);
    await writeAuditLog({
      userId: session.userId,
      action: "update",
      entityType: "homepage_cta",
      entityId: "1",
    });
    revalidateHomepage();
    revalidatePath("/admin/homepage/cta");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update CTA.");
  }
}
