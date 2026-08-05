import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Download,
  FileText,
  Image,
  Megaphone,
  MessageSquare,
  Newspaper,
  Plus,
  ScrollText,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminDashboardData } from "@/lib/data/admin-dashboard";
import type { AdminSession } from "@/lib/auth/session";

function MetricCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800 transition group-hover:bg-emerald-100">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-600" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ccshau-chrome-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Link>
  );
}

export function AdminDashboardView({
  session,
  data,
}: {
  session: AdminSession;
  data: AdminDashboardData;
}) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-ccshau-chrome-900 via-ccshau-chrome-700 to-ccshau-chrome-800 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100/90">{today}</p>
            <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">
              Welcome back, {session.displayName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100/85">
              {session.collegeAssignment
                ? `Managing ${session.collegeAssignment.collegeName} microsite content.`
                : "Overview of university website content, enquiries, and publishing workflow."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {data.roleLabel}
              </span>
              {session.departmentId ? (
                <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-100">
                  Department scoped
                </span>
              ) : null}
            </div>
          </div>
          {data.canCreateContent && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/news/new"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New news
              </Link>
              <Link
                href="/admin/tenders/new"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New tender
              </Link>
            </div>
          )}
        </div>
      </section>

      {data.noAccess && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No CMS access is assigned to your account. Ask a super admin to assign a university role or
          college scope in Users & roles.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={data.collegeOnly ? "College pages" : "Pages"}
          value={data.stats.pages.total}
          hint={`${data.stats.pages.published} published · ${data.stats.pages.draft} draft`}
          href="/admin/pages"
          icon={FileText}
        />
        {!data.collegeOnly && data.stats.news && (
          <MetricCard
            label="News & notices"
            value={data.stats.news.total}
            hint={`${data.stats.news.published} live · ${data.stats.news.draft} draft`}
            href="/admin/news"
            icon={Newspaper}
          />
        )}
        {!data.collegeOnly && data.stats.tenders && (
          <MetricCard
            label="Tenders"
            value={data.stats.tenders.total}
            hint={`${data.stats.tenders.open} open · ${data.stats.tenders.draft} draft`}
            href="/admin/tenders"
            icon={ShoppingBag}
          />
        )}
        {!data.collegeOnly && data.stats.feedback && (
          <MetricCard
            label="Feedback inbox"
            value={data.stats.feedback.total}
            hint={`${data.stats.feedback.new} new · ${data.stats.feedback.inProgress} in progress`}
            href="/admin/feedback"
            icon={MessageSquare}
          />
        )}
      </div>

      {!data.collegeOnly && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Circulars"
            value={data.stats.circulars ?? 0}
            href="/admin/circulars"
            icon={ScrollText}
          />
          <MetricCard
            label="Downloads"
            value={data.stats.downloads ?? 0}
            href="/admin/downloads"
            icon={Download}
          />
          <MetricCard
            label="Media albums"
            value={data.stats.mediaAlbums ?? 0}
            href="/admin/media"
            icon={Image}
          />
          <MetricCard
            label="Homepage banners"
            value={data.stats.banners ?? 0}
            href="/admin/banners"
            icon={Megaphone}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {data.attention.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden />
                <h2 className="font-semibold text-slate-900">Needs attention</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.attention.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`flex flex-col gap-1 border-l-4 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between ${
                        item.tone === "sky"
                          ? "border-l-sky-500 bg-sky-50/50"
                          : item.tone === "emerald"
                            ? "border-l-emerald-500 bg-emerald-50/50"
                            : "border-l-amber-500 bg-amber-50/50"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm opacity-80">{item.detail}</p>
                      </div>
                      <span className="text-sm font-semibold underline-offset-2 hover:underline">
                        Open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recent activity</h2>
              <Link href="/admin/pages" className="text-sm text-emerald-700 hover:underline">
                All content
              </Link>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                No recent edits yet. Create your first page or news item to see activity here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.meta}</p>
                      </div>
                      {item.status ? <StatusBadge status={item.status} /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.isSuperAdmin && data.recentAudit.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Audit trail</h2>
                <Link href="/admin/audit" className="text-sm text-emerald-700 hover:underline">
                  Full log
                </Link>
              </div>
              <ul className="divide-y divide-slate-100 text-sm">
                {data.recentAudit.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <p className="font-medium capitalize text-slate-800">
                        {log.action.replace(/_/g, " ")}
                        {log.entity_type ? ` · ${log.entity_type}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {log.user_name ?? log.user_email ?? "System"} ·{" "}
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Sparkles className="h-5 w-5 text-emerald-700" aria-hidden />
              <h2 className="font-semibold text-slate-900">Quick actions</h2>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1">
              {data.quickActions.map((action) => (
                <Link
                  key={action.href + action.label}
                  href={action.href}
                  className={`rounded-xl border px-4 py-3 transition ${
                    action.tone === "primary"
                      ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/80"
                      : "border-slate-200 bg-slate-50/50 hover:border-emerald-200 hover:bg-white"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{action.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
                </Link>
              ))}
            </div>
          </section>

          {data.pipeline.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Publishing pipeline</h2>
                <p className="mt-1 text-xs text-slate-500">Draft and review items across modules</p>
              </div>
              <ul className="divide-y divide-slate-100 p-2">
                {data.pipeline.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition hover:bg-slate-50"
                    >
                      <span className="text-slate-700">{item.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-ccshau-chrome-900">
                          {item.count}
                        </span>
                        <StatusBadge status={item.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-sm text-emerald-950">
            <p className="font-semibold">Content tips</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-900/85">
              <li>Publish news with bilingual titles for Hindi visitors.</li>
              <li>Add alt text on banners and media for accessibility.</li>
              <li>Close tenders promptly when deadlines pass.</li>
              {!data.collegeOnly && <li>Respond to feedback within 2 working days.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
