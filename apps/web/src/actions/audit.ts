"use server";

import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { AuditAction, AuditLog } from "@/lib/database/types";
import {
  buildPaginatedResult,
  paginationRange,
  type PaginatedResult,
} from "@/lib/data/pagination";
import {
  emptyPaginatedResult,
  mergeAdminListOptions,
  type SortOrder,
} from "@/lib/data/admin-list";
import { createAdminClient } from "@/lib/supabase/admin";

const AUDIT_ROLES = ["super_admin"] as const;

export interface AuditLogRow extends AuditLog {
  user_email: string | null;
  user_name: string | null;
}

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

const AUDIT_LIST_SORTS = ["created_at", "action", "entity_type", "user_id"] as const;

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<PaginatedResult<AuditLogRow>> {
  await requireAdminWithRoles([...AUDIT_ROLES]);
  const admin = createAdminClient();
  const opts = mergeAdminListOptions(
    {
      page: filters.page,
      pageSize: filters.limit ?? filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
    { sortBy: "created_at", sortOrder: "desc", allowedSorts: AUDIT_LIST_SORTS },
  );

  if (!admin) return emptyPaginatedResult(opts);

  let query = admin.from(Tables.auditLogs).select("*", { count: "exact" });

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  const { from, to } = paginationRange(opts.page, opts.pageSize);
  const { data: logs, count, error } = await query
    .order(opts.sortBy, { ascending: opts.sortOrder === "asc" })
    .range(from, to);

  if (error || !logs?.length) {
    return buildPaginatedResult([], count ?? 0, opts.page, opts.pageSize);
  }

  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, { email: string; display_name: string }>();

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from(Tables.profiles)
      .select("id, email, display_name")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        email: profile.email,
        display_name: profile.display_name,
      });
    }
  }

  const items = (logs as AuditLog[]).map((log) => {
    const profile = log.user_id ? profileMap.get(log.user_id) : null;
    return {
      ...log,
      details: (log.details ?? {}) as Record<string, unknown>,
      user_email: profile?.email ?? null,
      user_name: profile?.display_name ?? null,
    };
  });

  return buildPaginatedResult(items, count ?? 0, opts.page, opts.pageSize);
}

export async function canViewAuditLogs(): Promise<boolean> {
  const session = await requireAdminSession();
  return session.roles.some((r) => r.role === "super_admin");
}
