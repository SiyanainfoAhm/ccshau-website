import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listCircularsForAdmin } from "@/actions/circulars";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import { canManageUniversityContent } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";
import { getStoredFileUrl } from "@/lib/storage/upload";

const CIRCULARS_SORTS = ["title_en", "circular_number", "status", "published_at"] as const;

export default async function AdminCircularsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "published_at",
    sortOrder: "desc",
    allowedSorts: CIRCULARS_SORTS,
  });
  const data = await listCircularsForAdmin(listParams);
  const items = data.items;
  const canCreate = canManageUniversityContent(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Circulars</h1>
          <p className="text-sm text-slate-500">Official university circulars and orders</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/circulars/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New circular
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense fallback={<tr><th className="px-4 py-3">Title</th></tr>}>
              <tr>
                <AdminSortableTh label="Title" column="title_en" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Number" column="circular_number" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Status" column="status" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Published" column="published_at" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">File</th>
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No circulars yet.
                  {canCreate && (
                    <>
                      {" "}
                      <Link href="/admin/circulars/new" className="text-emerald-700 hover:underline">
                        Create your first circular
                      </Link>
                    </>
                  )}
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
        <AdminListFooter data={data} />
      </div>
    </div>
  );
}
