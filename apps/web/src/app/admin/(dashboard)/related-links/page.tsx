import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listRelatedLinksForAdmin } from "@/actions/related-links";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { requireSiteStructureOrRedirect } from "@/lib/auth/site-structure-access";
import { parseAdminListParams } from "@/lib/data/admin-list";

const RELATED_LINKS_SORTS = ["title_en", "category", "sort_order", "is_active"] as const;

export default async function AdminRelatedLinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSiteStructureOrRedirect();
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "sort_order",
    sortOrder: "asc",
    allowedSorts: RELATED_LINKS_SORTS,
  });
  const data = await listRelatedLinksForAdmin(listParams);
  const items = data.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Related links</h1>
          <p className="text-sm text-slate-500">Government and institutional partner links on the homepage</p>
        </div>
        <Link
          href="/admin/related-links/new"
          className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New link
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense fallback={<tr><th className="px-4 py-3">Title</th></tr>}>
              <tr>
                <AdminSortableTh label="Title" column="title_en" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">URL</th>
                <AdminSortableTh label="Category" column="category" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Active" column="is_active" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No related links yet.{" "}
                  <Link href="/admin/related-links/new" className="text-emerald-700 hover:underline">
                    Add your first link
                  </Link>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/related-links/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.title_en}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{item.url}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{item.category ?? "—"}</td>
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
