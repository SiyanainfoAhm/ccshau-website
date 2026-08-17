"use client";

import { useEffect, useState, useTransition } from "react";

import { getFacultyDuplicateReportAction } from "@/actions/college-register";

export function FacultyDuplicateFinder({ collegePageId }: { collegePageId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<{
    withinPage: Array<{ page: string; reason: string; names: string[] }>;
    unlinkedCount: number;
    unlinked: Array<{ name: string; department: string }>;
  } | null>(null);

  useEffect(() => {
    if (!open || report) return;
    startTransition(async () => {
      const data = await getFacultyDuplicateReportAction(collegePageId);
      setReport(data);
    });
  }, [open, report, collegePageId]);

  const issueCount = (report?.withinPage.length ?? 0) + (report?.unlinkedCount ?? 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">Duplicate finder</h2>
          <p className="text-xs text-slate-500">Same-page slug/email/name checks on active faculty only, plus active rows not linked to a shared person.</p>
        </div>
        <span className="text-sm text-emerald-700">{open ? "Hide" : "Run check"}</span>
      </button>
      {open ? (
        <div className="mt-4 text-sm">
          {isPending && !report ? <p className="text-slate-500">Checking…</p> : null}
          {report && issueCount === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">No same-page duplicates. All listed rows are linked to a shared person.</p>
          ) : null}
          {report && report.withinPage.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium text-slate-800">Same-page matches</p>
              <ul className="space-y-1 text-slate-600">
                {report.withinPage.map((item, index) => (
                  <li key={`${item.page}-${item.reason}-${index}`}>
                    {item.page}: {item.reason} — {item.names.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report && report.unlinkedCount > 0 ? (
            <div className="mt-3 space-y-1">
              <p className="font-medium text-slate-800">{report.unlinkedCount} unlinked staff row{report.unlinkedCount === 1 ? "" : "s"}</p>
              {report.unlinked.map((row) => (
                <p key={`${row.department}-${row.name}`} className="text-slate-600">
                  {row.name} — {row.department}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
