import Link from "next/link";
import { FileText, Megaphone, MessageSquare, Newspaper, Plus } from "lucide-react";

import { AdminCard, StatCard } from "@/components/admin/admin-ui";
import { requireAdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import { createAdminClient } from "@/lib/supabase/admin";

async function getDashboardStats() {
  const admin = createAdminClient();
  if (!admin) {
    return { pages: 0, news: 0, tenders: 0, feedback: 0 };
  }

  const [pages, news, tenders, feedback] = await Promise.all([
    admin.from(Tables.pages).select("*", { count: "exact", head: true }),
    admin.from(Tables.news).select("*", { count: "exact", head: true }),
    admin.from(Tables.tenders).select("*", { count: "exact", head: true }),
    admin
      .from(Tables.feedback)
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  return {
    pages: pages.count ?? 0,
    news: news.count ?? 0,
    tenders: tenders.count ?? 0,
    feedback: feedback.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const stats = await getDashboardStats();
  const noRoles = session.roles.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {session.displayName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/tenders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New tender
          </Link>
          <Link
            href="/admin/news/new"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New news
          </Link>
        </div>
      </div>

      {noRoles && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No CMS roles are assigned to your account. Ask a super admin to assign roles in{" "}
          <Link href="/admin/users" className="font-medium text-amber-950 underline">
            Users & roles
          </Link>
          .
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pages" value={stats.pages} />
        <StatCard label="News items" value={stats.news} />
        <StatCard label="Tenders" value={stats.tenders} />
        <StatCard label="New feedback" value={stats.feedback} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard
          title="Quick actions"
          action={
            <Link href="/admin/pages" className="text-sm text-emerald-700 hover:underline">
              All pages
            </Link>
          }
        >
          <ul className="space-y-3 text-sm">
            <li>
              <Link
                href="/admin/pages/new"
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-800"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Create a new page
              </Link>
            </li>
            <li>
              <Link
                href="/admin/news"
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-800"
              >
                <Newspaper className="h-4 w-4" aria-hidden />
                Manage news & notices
              </Link>
            </li>
            <li>
              <Link
                href="/admin/feedback"
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-800"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                Review feedback inbox
              </Link>
            </li>
            <li>
              <Link
                href="/admin/menus"
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-800"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Manage navigation menus
              </Link>
            </li>
            <li>
              <Link
                href="/admin/banners/new"
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-800"
              >
                <Megaphone className="h-4 w-4" aria-hidden />
                Add homepage banner
              </Link>
            </li>
          </ul>
        </AdminCard>

        <AdminCard title="Phase 3 progress">
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex justify-between">
              <span>Auth & middleware</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Pages CMS</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>News module</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>File upload (Storage)</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Tenders module</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Feedback inbox</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Menu manager</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Banners CMS</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Audit log viewer</span>
              <span className="font-medium text-emerald-700">Done</span>
            </li>
            <li className="flex justify-between">
              <span>Phase 4 — Public site</span>
              <span className="text-slate-400">Next</span>
            </li>
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}
