import Link from "next/link";
import { redirect } from "next/navigation";

import { listPgSeminarRegistrationsForAdmin } from "@/actions/pg-seminar-registrations";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";
import type { PgSeminarRegistrationStatus } from "@/lib/database/types";

const STATUS_TABS: { label: string; value?: PgSeminarRegistrationStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "submitted" },
  { label: "Under review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default async function AdminPgSeminarRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const status = params.status as PgSeminarRegistrationStatus | undefined;
  const items = await listPgSeminarRegistrationsForAdmin(status);

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
          const href = tab.value
            ? `/admin/pg-seminar-registrations?status=${tab.value}`
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
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Registration #</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Admission #</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Seminar</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Duration</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Submitted</th>
            </tr>
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
      </div>
    </div>
  );
}
