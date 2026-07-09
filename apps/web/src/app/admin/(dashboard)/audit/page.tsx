import { Suspense } from "react";
import { redirect } from "next/navigation";

import { listAuditLogs } from "@/actions/audit";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";
import type { AuditAction } from "@/lib/database/types";

const AUDIT_SORTS = ["created_at", "action", "entity_type"] as const;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "created_at",
    sortOrder: "desc",
    allowedSorts: AUDIT_SORTS,
  });
  const data = await listAuditLogs({
    action: params.action as AuditAction | undefined,
    entityType: params.entityType || undefined,
    page: listParams.page,
    pageSize: listParams.pageSize,
    sortBy: listParams.sortBy,
    sortOrder: listParams.sortOrder,
  });
  const logs = data.items;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">
          Security and CMS activity trail (super admin only)
        </p>
      </div>

      <Suspense fallback={null}>
        <AuditLogFilters />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense fallback={<tr><th className="px-4 py-3">Time</th></tr>}>
              <tr>
                <AdminSortableTh label="Time" column="created_at" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                <AdminSortableTh label="Action" column="action" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Entity" column="entity_type" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No audit entries match your filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.user_name ?? log.user_email ?? "System"}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.entity_type ?? "—"}
                    {log.entity_id && (
                      <span className="mt-0.5 block font-mono text-xs text-slate-400">
                        {log.entity_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                    {Object.keys(log.details).length > 0
                      ? JSON.stringify(log.details)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminListFooter data={data} />
      </div>
    </div>
  );
}
