import Link from "next/link";
import { Plus } from "lucide-react";

import { listNewsForAdmin } from "@/actions/news";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewsListPage() {
  await requireAdminSession();
  const items = await listNewsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">News & Notices</h1>
          <p className="text-sm text-slate-500">Manage news, notices, corrigenda, and cancellations</p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New item
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Files</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No news yet.{" "}
                  <Link href="/admin/news/new" className="text-emerald-700 hover:underline">
                    Create your first item
                  </Link>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/news/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.title_en}
                    </Link>
                    {item.is_pinned && (
                      <span className="ml-2 text-xs font-semibold text-amber-600">PINNED</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{item.notice_type}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.attachment_paths?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(item.updated_at).toLocaleDateString("en-IN")}
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
