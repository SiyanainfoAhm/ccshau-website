import Link from "next/link";

import { listFeedbackForAdmin } from "@/actions/feedback";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";
import type { FeedbackStatus } from "@/lib/database/types";

const STATUS_TABS: { label: string; value?: FeedbackStatus }[] = [
  { label: "All" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const status = params.status as FeedbackStatus | undefined;
  const items = await listFeedbackForAdmin(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Feedback inbox</h1>
        <p className="text-sm text-slate-500">Review and respond to public contact submissions</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const href = tab.value ? `/admin/feedback?status=${tab.value}` : "/admin/feedback";
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
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Ticket</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Subject</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">From</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Received</th>
            </tr>
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
      </div>
    </div>
  );
}
