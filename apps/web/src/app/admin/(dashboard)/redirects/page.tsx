import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listRedirectsForAdmin } from "@/actions/redirects";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { SETTINGS_ACCESS_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";

const REDIRECTS_SORTS = ["legacy_path", "new_path", "redirect_type", "is_active"] as const;

export default async function AdminRedirectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminWithRolesOrRedirect([...SETTINGS_ACCESS_ROLES]);
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "legacy_path",
    sortOrder: "asc",
    allowedSorts: REDIRECTS_SORTS,
  });
  const data = await listRedirectsForAdmin(listParams);
  const items = data.items;

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
            <Suspense fallback={<tr><th className="px-4 py-3">Legacy path</th></tr>}>
              <tr>
                <AdminSortableTh label="Legacy path" column="legacy_path" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="New path" column="new_path" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Type" column="redirect_type" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Active" column="is_active" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
              </tr>
            </Suspense>
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
        <AdminListFooter data={data} />
      </div>
    </div>
  );
}
