import type { AuditAction } from "@/lib/database/types";
import { Functions } from "@/lib/database/names";
import { createAdminClient } from "@/lib/supabase/admin";

export async function writeAuditLog(params: {
  userId: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.rpc(Functions.writeAuditLog, {
    p_user_id: params.userId,
    p_action: params.action,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
    p_details: params.details ?? {},
    p_ip_address: params.ipAddress ?? null,
  });
}
