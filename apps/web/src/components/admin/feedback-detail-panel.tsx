"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateFeedbackAction } from "@/actions/feedback";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Feedback } from "@/lib/database/types";
import { FEEDBACK_CATEGORIES } from "@/lib/validations/feedback";

interface Department {
  id: string;
  slug: string;
  name_en: string;
}

export function FeedbackDetailPanel({
  feedback,
  departments,
}: {
  feedback: Feedback;
  departments: Department[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateFeedbackAction(feedback.id, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/feedback" className="text-sm text-emerald-700 hover:underline">
            ← Back to inbox
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">{feedback.subject}</h1>
          <p className="text-sm text-slate-500">
            Ticket {feedback.ticket_number} ·{" "}
            {new Date(feedback.created_at).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={feedback.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Submission</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">From</dt>
              <dd className="font-medium text-slate-900">{feedback.submitter_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>
                <a href={`mailto:${feedback.email}`} className="text-emerald-800 hover:underline">
                  {feedback.email}
                </a>
              </dd>
            </div>
            {feedback.phone && (
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-900">{feedback.phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="capitalize text-slate-900">{feedback.category ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Message</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{feedback.message}</p>
          </div>
        </div>

        <form action={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Admin response</h2>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Feedback updated.
            </p>
          )}

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={feedback.status}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="new">New</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Category</span>
              <select
                name="category"
                defaultValue={feedback.category ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">Uncategorized</option>
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Department</span>
              <select
                name="departmentId"
                defaultValue={feedback.department_id ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="">Unassigned</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name_en}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Admin remarks</span>
              <textarea
                name="adminRemarks"
                rows={4}
                defaultValue={feedback.admin_remarks ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Internal notes or resolution summary"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-5 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
