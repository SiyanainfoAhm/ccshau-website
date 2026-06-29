import Link from "next/link";
import { Plus } from "lucide-react";

import { listRedirectsForAdmin } from "@/actions/redirects";
import { requireAdminWithRoles } from "@/lib/auth/session";

export default async function AdminRedirectsPage() {
  await requireAdminWithRoles(["super_admin", "dept_admin"]);
  const items = await listRedirectsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">URL redirects</h1>
          <p className="text-sm text-slate-500">Legacy paths from hau.ac.in mapped to new routes (301/302)</p>
        </div>
        <Link
          href="/admin/redirects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New redirect
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Legacy path</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">New path</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No redirects configured.{" "}
                  <Link href="/admin/redirects/new" className="text-emerald-700 hover:underline">
                    Add your first redirect
                  </Link>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/redirects/${item.id}`}
                      className="font-mono text-sm font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.legacy_path}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">{item.new_path}</td>
                  <td className="px-4 py-3 text-slate-600">{item.redirect_type}</td>
                  <td className="px-4 py-3">{item.is_active ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
