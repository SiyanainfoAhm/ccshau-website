"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePgSeminarRegistrationAction } from "@/actions/pg-seminar-registrations";
import { StatusBadge } from "@/components/admin/status-badge";
import type { PgSeminarRegistration } from "@/lib/database/types";

function formatBool(value: boolean | null | undefined) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatPaperStatus(values: string[]) {
  if (!values.length) return "—";
  return values
    .map((v) => {
      if (v === "oral") return "Oral Presentation";
      if (v === "poster") return "Poster Presentation";
      if (v === "participation") return "Only Participation";
      return v;
    })
    .join(", ");
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}

export function PgSeminarRegistrationDetailPanel({
  registration,
}: {
  registration: PgSeminarRegistration;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updatePgSeminarRegistrationAction(registration.id, formData);
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
          <Link
            href="/admin/pg-seminar-registrations"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Back to registrations
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
            {registration.student_name}
          </h1>
          <p className="text-sm text-slate-500">
            {registration.registration_number} · Admission {registration.admission_number} ·{" "}
            {new Date(registration.created_at).toLocaleString("en-IN")}
          </p>
        </div>
        <StatusBadge status={registration.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Student details</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Name" value={registration.student_name} />
              <DetailRow label="Admission number" value={registration.admission_number} />
              <DetailRow label="Department" value={registration.department ?? "—"} />
              <DetailRow label="Degree / fellowship" value={registration.student_degree ?? "—"} />
              <DetailRow label="Gender" value={registration.gender ?? "—"} />
              <DetailRow label="Category" value={registration.category ?? "—"} />
              <DetailRow label="Foreign student" value={formatBool(registration.is_foreigner)} />
              <DetailRow label="Country" value={registration.country_name ?? "—"} />
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Seminar / workshop</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow
                label="Title"
                value={
                  <span className="block sm:col-span-2">{registration.seminar_title ?? "—"}</span>
                }
              />
              <DetailRow label="Duration from" value={formatDate(registration.duration_from)} />
              <DetailRow label="Duration to" value={formatDate(registration.duration_to)} />
              <DetailRow
                label="Source of advertisement"
                value={registration.source_of_advertisement ?? "—"}
              />
              <DetailRow
                label="Last date of submission"
                value={formatDate(registration.last_submission_date)}
              />
              <DetailRow
                label="Paper status"
                value={formatPaperStatus(registration.paper_status)}
              />
              <DetailRow
                label="Relevant to subject"
                value={formatBool(registration.is_relevant_to_subject)}
              />
              <DetailRow
                label="Seminars attended (last 2 years)"
                value={registration.seminars_attended_last_two_years ?? "—"}
              />
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700">Organizing institute & address</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {registration.organizing_institute_address ?? "—"}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Funding & other</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow
                label="Funds from outside agency"
                value={formatBool(registration.funds_from_outside_agency)}
              />
              <DetailRow label="Funding agency" value={registration.funding_agency_name ?? "—"} />
              <DetailRow
                label="Registration fee"
                value={registration.registration_fee ?? "—"}
              />
              <DetailRow label="Travel grant" value={registration.travel_grant ?? "—"} />
              <DetailRow label="Total liability" value={registration.total_liability ?? "—"} />
              <DetailRow
                label="100% outside funding"
                value={registration.outside_funding_full_payment ?? "—"}
              />
              <DetailRow
                label="Partial outside funding"
                value={registration.outside_funding_partial_payment ?? "—"}
              />
              <DetailRow
                label="Combined with other purpose"
                value={formatBool(registration.combined_with_other_purpose)}
              />
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700">Other relevant information</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {registration.other_relevant_info ?? "—"}
              </p>
            </div>
          </section>
        </div>

        <form
          action={handleSubmit}
          className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"
        >
          <h2 className="font-semibold text-slate-900">Admin review</h2>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Registration updated.
            </p>
          )}

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={registration.status}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Admin remarks</span>
              <textarea
                name="adminRemarks"
                rows={5}
                defaultValue={registration.admin_remarks ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Internal notes or decision summary"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-5 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
