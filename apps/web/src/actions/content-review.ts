"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/auth/audit";
import {
  canActOnDepartmentContent,
  canPublishContent,
} from "@/lib/auth/cms-roles";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, TenderStatus } from "@/lib/database/types";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewableEntityType =
  | "news"
  | "circular"
  | "download"
  | "media_album"
  | "page"
  | "tender";

type ReviewConfig = {
  table: string;
  adminListPath: string;
  entityType: string;
  titleColumn: string;
  kind: "content" | "tender";
};

const ENTITY_CONFIG: Record<ReviewableEntityType, ReviewConfig> = {
  news: {
    table: Tables.news,
    adminListPath: "/admin/news",
    entityType: "news",
    titleColumn: "title_en",
    kind: "content",
  },
  circular: {
    table: Tables.circulars,
    adminListPath: "/admin/circulars",
    entityType: "circular",
    titleColumn: "title_en",
    kind: "content",
  },
  download: {
    table: Tables.downloads,
    adminListPath: "/admin/downloads",
    entityType: "download",
    titleColumn: "title_en",
    kind: "content",
  },
  media_album: {
    table: Tables.mediaAlbums,
    adminListPath: "/admin/media",
    entityType: "media_album",
    titleColumn: "title_en",
    kind: "content",
  },
  page: {
    table: Tables.pages,
    adminListPath: "/admin/pages",
    entityType: "page",
    titleColumn: "title_en",
    kind: "content",
  },
  tender: {
    table: Tables.tenders,
    adminListPath: "/admin/tenders",
    entityType: "tender",
    titleColumn: "title_en",
    kind: "tender",
  },
};

export async function reviewContentAction(
  entityType: ReviewableEntityType,
  entityId: string,
  decision: "approve" | "reject",
): Promise<ActionResult> {
  try {
    const session = await requireAdminSession();
    if (!canPublishContent(session)) {
      return fail("You do not have permission to review content.");
    }

    const config = ENTITY_CONFIG[entityType];
    const admin = createAdminClient();
    if (!admin) return fail("Database not configured.");

    const { data: existing, error: fetchError } = await admin
      .from(config.table)
      .select("id, status, department_id, title_en")
      .eq("id", entityId)
      .maybeSingle();

    if (fetchError) return fail(fetchError.message);
    if (!existing || typeof existing !== "object" || !("id" in existing)) {
      return fail("Content not found.");
    }

    const row = existing as {
      id: string;
      status: ContentStatus | TenderStatus;
      department_id: string | null;
      title_en?: string;
    };

    if (row.status !== "pending_review") {
      return fail("Only items pending review can be approved or returned.");
    }

    if (!canActOnDepartmentContent(session, row.department_id)) {
      return fail("You do not have permission to review this department's content.");
    }

    const nextStatus =
      config.kind === "tender"
        ? ((decision === "approve" ? "open" : "draft") satisfies TenderStatus)
        : ((decision === "approve" ? "published" : "draft") satisfies ContentStatus);

    const { error: updateError } = await admin
      .from(config.table)
      .update({
        status: nextStatus,
        updated_by: session.userId,
        ...(decision === "approve"
          ? { published_at: new Date().toISOString() }
          : config.kind === "tender"
            ? { published_at: null }
            : {}),
      })
      .eq("id", entityId);

    if (updateError) return fail(updateError.message);

    await writeAuditLog({
      userId: session.userId,
      action: decision === "approve" ? "publish" : "update",
      entityType: config.entityType,
      entityId,
      details: {
        reviewDecision: decision,
        previousStatus: row.status,
        nextStatus,
        title: row.title_en ?? null,
      },
    });

    revalidatePath(config.adminListPath);
    revalidatePath(`${config.adminListPath}/${entityId}`);
    revalidatePath("/admin");
    revalidatePath("/admin/reports");

    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Review failed.");
  }
}
