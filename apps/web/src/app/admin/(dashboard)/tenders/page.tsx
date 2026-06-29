import Link from "next/link";
import { Plus } from "lucide-react";

import { listTendersForAdmin } from "@/actions/tenders";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminTendersListPage() {
  await requireAdminSession();
  const tenders = await listTendersForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Tenders</h1>
          <p className="text-sm text-slate-500">Manage tenders, documents, and corrigenda</p>
        </div>
        <Link
          href="/admin/tenders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New tender
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Closing</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No tenders yet.{" "}
                  <Link href="/admin/tenders/new" className="text-emerald-700 hover:underline">
                    Create your first tender
                  </Link>
                </td>
              </tr>
            ) : (
              tenders.map((tender) => (
                <tr key={tender.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenders/${tender.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {tender.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {tender.tender_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{tender.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tender.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {tender.closing_date
                      ? new Date(tender.closing_date).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{tender.document_paths?.length ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
