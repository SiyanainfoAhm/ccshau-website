import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listRtiDownloadsForAdmin } from "@/actions/downloads";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import { canManageUniversityContent } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";
import { getStoredFileUrl } from "@/lib/storage/urls";

const RTI_SORTS = ["title_en", "version", "status"] as const;

export default async function AdminRtiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "version",
    sortOrder: "asc",
    allowedSorts: RTI_SORTS,
  });
  const data = await listRtiDownloadsForAdmin(listParams);
  const items = data.items;
  const canCreate = canManageUniversityContent(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Right To Information
          </h1>
          <p className="text-sm text-slate-500">
            RTI documents shown on the public{" "}
            <Link href="/rti" className="text-emerald-700 hover:underline" target="_blank">
              /rti
            </Link>{" "}
            page
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/rti"
            target="_blank"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            View public page →
          </Link>
          {canCreate && (
            <Link
              href="/admin/downloads/new"
              className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New RTI document
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense
              fallback={
                <tr>
                  <th className="px-4 py-3">Title</th>
                </tr>
              }
            >
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Sr.</th>
                <AdminSortableTh
                  label="Title"
                  column="title_en"
                  currentSort={listParams.sortBy}
                  currentOrder={listParams.sortOrder}
                />
                <AdminSortableTh
                  label="Status"
                  column="status"
                  currentSort={listParams.sortBy}
                  currentOrder={listParams.sortOrder}
                />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">File</th>
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No RTI documents yet.
                  {canCreate && (
                    <>
                      {" "}
                      <Link
                        href="/admin/downloads/new"
                        className="text-emerald-700 hover:underline"
                      >
                        Add the first document
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{item.version ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/downloads/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
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
