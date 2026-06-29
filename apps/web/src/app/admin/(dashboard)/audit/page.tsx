import { Suspense } from "react";
import { redirect } from "next/navigation";

import { listAuditLogs } from "@/actions/audit";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { requireAdminSession } from "@/lib/auth/session";
import type { AuditAction } from "@/lib/database/types";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const logs = await listAuditLogs({
    action: params.action as AuditAction | undefined,
    entityType: params.entityType || undefined,
  });

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
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Entity</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
            </tr>
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
      </div>
    </div>
  );
}
