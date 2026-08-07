import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listDownloadsForAdmin } from "@/actions/downloads";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import { canManageUniversityContent } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";

const DOWNLOADS_SORTS = ["title_en", "category", "version", "status"] as const;

export default async function AdminDownloadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "title_en",
    sortOrder: "asc",
    allowedSorts: DOWNLOADS_SORTS,
  });
  const data = await listDownloadsForAdmin(listParams);
  const items = data.items;
  const canCreate = canManageUniversityContent(session);
  const hasSearch = Boolean(listParams.search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Downloads</h1>
          <p className="text-sm text-slate-500">Forms, prospectus, reports, and document repository</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/downloads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New download
          </Link>
        )}
      </div>

      <Suspense fallback={null}>
        <AdminListSearch
          search={listParams.search}
          placeholder="Search by title, category, or version…"
          ariaLabel="Search downloads by title, category, or version"
          totalLabel={`${data.total} download${data.total === 1 ? "" : "s"}`}
        />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense fallback={<tr><th className="px-4 py-3">Title</th></tr>}>
              <tr>
                <AdminSortableTh label="Title" column="title_en" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Category" column="category" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Version" column="version" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Visibility</th>
                <AdminSortableTh label="Status" column="status" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {hasSearch ? (
                    <>No downloads match &quot;{listParams.search}&quot;.</>
                  ) : (
                    <>
                      No downloads yet.
                      {canCreate && (
                        <>
                          {" "}
                          <Link href="/admin/downloads/new" className="text-emerald-700 hover:underline">
                            Add your first document
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/downloads/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{item.category ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.version ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.is_public ? "Public" : "Private"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
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
