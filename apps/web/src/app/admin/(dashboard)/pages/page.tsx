import Link from "next/link";
import { Plus } from "lucide-react";

import { listPagesForAdmin } from "@/actions/pages";
import { PagesList } from "@/components/admin/pages-list";
import { canDeletePages, canEditPages } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminPagesListPage() {
  const session = await requireAdminSession();
  const pages = await listPagesForAdmin();
  const canCreate = canEditPages(session);
  const canDelete = canDeletePages(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {session.collegeAssignment ? "College pages" : "Pages"}
          </h1>
          <p className="text-sm text-slate-500">
            {session.collegeAssignment
              ? `Managing ${session.collegeAssignment.collegeName}`
              : "CMS-managed static and dynamic pages"}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/pages/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New page
          </Link>
        )}
      </div>

      <PagesList pages={pages} canDelete={canDelete} canCreate={canCreate} />
    </div>
  );
}
