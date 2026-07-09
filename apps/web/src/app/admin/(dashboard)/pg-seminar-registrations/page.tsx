import { Suspense } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { listPgSeminarRegistrationsForAdmin } from "@/actions/pg-seminar-registrations";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";
import type { PgSeminarRegistrationStatus } from "@/lib/database/types";

const STATUS_TABS: { label: string; value?: PgSeminarRegistrationStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "submitted" },
  { label: "Under review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const PG_SEMINAR_SORTS = [
  "registration_number",
  "student_name",
  "admission_number",
  "status",
  "created_at",
] as const;

export default async function AdminPgSeminarRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const status = params.status as PgSeminarRegistrationStatus | undefined;
  const listParams = parseAdminListParams(params, {
    sortBy: "created_at",
    sortOrder: "desc",
    allowedSorts: PG_SEMINAR_SORTS,
  });
  const data = await listPgSeminarRegistrationsForAdmin(status, listParams);
  const items = data.items;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">PG Seminar registrations</h1>
        <p className="text-sm text-slate-500">
          Review seminar/workshop registration submissions from PG Studies
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const tabParams = new URLSearchParams();
          if (tab.value) tabParams.set("status", tab.value);
          const qs = tabParams.toString();
          const href = qs
            ? `/admin/pg-seminar-registrations?${qs}`
            : "/admin/pg-seminar-registrations";
          const active = status === tab.value || (!status && !tab.value);
          return (
            <Link
              key={tab.label}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-[#0b3d2e] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <Suspense fallback={<tr><th className="px-4 py-3">Registration #</th></tr>}>
              <tr>
                <AdminSortableTh label="Registration #" column="registration_number" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Student" column="student_name" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Admission #" column="admission_number" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Seminar</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Duration</th>
                <AdminSortableTh label="Status" column="status" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Submitted" column="created_at" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No registrations{status ? ` with status "${status.replace(/_/g, " ")}"` : ""}.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {item.registration_number}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pg-seminar-registrations/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.student_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.admission_number}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                    {item.seminar_title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(item.duration_from).toLocaleDateString("en-IN")}
                    {" – "}
                    {new Date(item.duration_to).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(item.created_at).toLocaleDateString("en-IN")}
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
