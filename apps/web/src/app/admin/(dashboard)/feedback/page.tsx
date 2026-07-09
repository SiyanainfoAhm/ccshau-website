import { Suspense } from "react";

import Link from "next/link";

import { listFeedbackForAdmin } from "@/actions/feedback";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { AdminSortableTh } from "@/components/admin/admin-sortable-th";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";
import type { FeedbackStatus } from "@/lib/database/types";

const STATUS_TABS: { label: string; value?: FeedbackStatus }[] = [
  { label: "All" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const FEEDBACK_SORTS = ["ticket_number", "subject", "submitter_name", "category", "status", "created_at"] as const;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const status = params.status as FeedbackStatus | undefined;
  const listParams = parseAdminListParams(params, {
    sortBy: "created_at",
    sortOrder: "desc",
    allowedSorts: FEEDBACK_SORTS,
  });
  const data = await listFeedbackForAdmin(status, listParams);
  const items = data.items;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Feedback inbox</h1>
        <p className="text-sm text-slate-500">Review and respond to public contact submissions</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const tabParams = new URLSearchParams();
          if (tab.value) tabParams.set("status", tab.value);
          if (listParams.sortBy !== "created_at") tabParams.set("sort", listParams.sortBy);
          if (listParams.sortOrder !== "desc") tabParams.set("order", listParams.sortOrder);
          const qs = tabParams.toString();
          const href = qs ? `/admin/feedback?${qs}` : "/admin/feedback";
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
            <Suspense fallback={<tr><th className="px-4 py-3">Ticket</th></tr>}>
              <tr>
                <AdminSortableTh label="Ticket" column="ticket_number" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Subject" column="subject" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="From" column="submitter_name" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Category" column="category" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Status" column="status" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
                <AdminSortableTh label="Received" column="created_at" currentSort={listParams.sortBy} currentOrder={listParams.sortOrder} />
              </tr>
            </Suspense>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No feedback submissions{status ? ` with status "${status.replace(/_/g, " ")}"` : ""}.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.ticket_number}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/feedback/${item.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {item.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.submitter_name}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{item.category ?? "—"}</td>
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
