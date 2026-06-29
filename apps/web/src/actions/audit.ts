"use server";

import { requireAdminSession, requireAdminWithRoles } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { AuditAction, AuditLog } from "@/lib/database/types";
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
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
  await requireAdminWithRoles([...AUDIT_ROLES]);
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from(Tables.auditLogs)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  const { data: logs } = await query;
  if (!logs?.length) return [];

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

  return (logs as AuditLog[]).map((log) => {
    const profile = log.user_id ? profileMap.get(log.user_id) : null;
    return {
      ...log,
      details: (log.details ?? {}) as Record<string, unknown>,
      user_email: profile?.email ?? null,
      user_name: profile?.display_name ?? null,
    };
  });
}

export async function canViewAuditLogs(): Promise<boolean> {
  const session = await requireAdminSession();
  return session.roles.some((r) => r.role === "super_admin");
}
