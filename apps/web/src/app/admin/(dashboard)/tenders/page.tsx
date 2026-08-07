import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listTendersForAdmin } from "@/actions/tenders";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import { canManageUniversityContent } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";

const TENDERS_SORTS = [
  "title_en",
  "tender_number",
  "category",
  "status",
  "closing_date",
] as const;

export default async function AdminTendersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "updated_at",
    sortOrder: "desc",
    allowedSorts: TENDERS_SORTS,
  });
  const data = await listTendersForAdmin(listParams);
  const items = data.items;
  const canCreate = canManageUniversityContent(session);
  const hasSearch = Boolean(listParams.search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Tenders</h1>
          <p className="text-sm text-slate-500">Manage tenders, documents, and corrigenda</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/tenders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New tender
          </Link>
        )}
      </div>

      <Suspense fallback={null}>
        <AdminListSearch
          search={listParams.search}
          placeholder="Search by title, number, or category…"
          ariaLabel="Search tenders by title, number, or category"
          totalLabel={`${data.total} tender${data.total === 1 ? "" : "s"}`}
        />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense
              fallback={
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Closing</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Docs</th>
                </tr>
              }
            >
              <tr>
                <AdminSortableTh label="Title" column="title_en" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Number" column="tender_number" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Category" column="category" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Status" column="status" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Closing" column="closing_date" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Docs</th>
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {hasSearch ? (
                    <>No tenders match &quot;{listParams.search}&quot;.</>
                  ) : (
                    <>
                      No tenders yet.
                      {canCreate && (
                        <>
                          {" "}
                          <Link href="/admin/tenders/new" className="text-emerald-700 hover:underline">
                            Create your first tender
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              items.map((tender) => (
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
        <AdminListFooter data={data} />
      </div>
    </div>
  );
}
