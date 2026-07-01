import Link from "next/link";
import { Plus } from "lucide-react";

import { listHomepageDignitariesForAdmin } from "@/actions/homepage";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminHomepageDignitariesPage() {
  await requireAdminSession();
  const items = await listHomepageDignitariesForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Homepage dignitaries</h1>
          <p className="text-sm text-slate-500">Dignitaries carousel on the homepage</p>
        </div>
        <Link
          href="/admin/homepage/dignitaries/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New dignitary
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/homepage/dignitaries/${item.id}`} className="font-medium text-slate-900 hover:text-emerald-800">
                    {item.name_en}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.role_en}</td>
                <td className="px-4 py-3">{item.sort_order}</td>
                <td className="px-4 py-3">{item.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/admin/homepage" className="text-sm text-emerald-700 hover:underline">
        ← Back to homepage
      </Link>
    </div>
  );
}
