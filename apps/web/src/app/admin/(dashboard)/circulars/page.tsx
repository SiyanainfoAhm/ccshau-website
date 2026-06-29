import Link from "next/link";
import { Plus } from "lucide-react";

import { listCircularsForAdmin } from "@/actions/circulars";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";
import { getStoredFileUrl } from "@/lib/storage/upload";

export default async function AdminCircularsPage() {
  await requireAdminSession();
  const items = await listCircularsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Circulars</h1>
          <p className="text-sm text-slate-500">Official university circulars and orders</p>
        </div>
        <Link
          href="/admin/circulars/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New circular
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Published</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">File</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No circulars yet.{" "}
                  <Link href="/admin/circulars/new" className="text-emerald-700 hover:underline">
                    Create your first circular
                  </Link>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/circulars/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.circular_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.file_path ? (
                      <a
                        href={getStoredFileUrl(item.file_path) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline"
                      >
                        PDF
                      </a>
                    ) : (
                      "—"
                    )}
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
