import Link from "next/link";
import { ArrowRight, BarChart3, Clock, MessageSquare, ShoppingBag } from "lucide-react";

import type { AdminReportsData } from "@/lib/data/admin-reports";

export function AdminReportsView({ data }: { data: AdminReportsData }) {
  const generated = new Date(data.generatedAt).toLocaleString("en-IN");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              Read-only reports
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 md:text-3xl">
              Content & activity summary
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              University-wide content counts and workflow status. Generated {generated}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {data.roleLabel}
              </span>
              {data.departmentScoped ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                  Department scoped
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.modules.map((module) => (
          <Link
            key={module.label}
            href={module.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-900">{module.label}</p>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-600" />
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-ccshau-chrome-900">{module.total}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 px-2 py-2">
                <dt className="text-slate-500">Draft</dt>
                <dd className="mt-1 font-semibold text-slate-800">{module.draft}</dd>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-2">
                <dt className="text-amber-700">Pending</dt>
                <dd className="mt-1 font-semibold text-amber-900">{module.pendingReview}</dd>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2 py-2">
                <dt className="text-emerald-700">Live</dt>
                <dd className="mt-1 font-semibold text-emerald-900">{module.live}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-600" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900">Feedback inbox</h2>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">New</dt>
              <dd className="text-2xl font-bold text-slate-900">{data.feedback.new}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">In progress</dt>
              <dd className="text-2xl font-bold text-slate-900">{data.feedback.inProgress}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Resolved</dt>
              <dd className="text-2xl font-bold text-slate-900">{data.feedback.resolved}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Total</dt>
              <dd className="text-2xl font-bold text-slate-900">{data.feedback.total}</dd>
            </div>
          </dl>
          <Link
            href="/admin/feedback"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
          >
            Open feedback inbox
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900">Tenders snapshot</h2>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-slate-500">Open</dt>
              <dd className="text-2xl font-bold text-slate-900">{data.tenders.open}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Pending review</dt>
              <dd className="text-2xl font-bold text-amber-800">{data.tenders.pendingReview}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Closing in 14 days</dt>
              <dd className="text-2xl font-bold text-slate-900">{data.tenders.closingSoon}</dd>
            </div>
          </dl>
          <Link
            href="/admin/tenders"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
          >
            View tenders
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-900">Items awaiting review</h2>
        </div>
        {data.pendingItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No content is currently pending review.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {data.pendingItems.map((item) => (
              <li key={`${item.module}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition hover:text-emerald-800"
                >
                  <span>
                    <span className="font-medium text-slate-900">{item.title}</span>
                    <span className="ml-2 text-slate-500">{item.module}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.updatedAt).toLocaleString("en-IN")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
