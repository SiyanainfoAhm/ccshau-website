import { Suspense } from "react";

import Link from "next/link";
import { Plus } from "lucide-react";

import { listPagesForAdmin } from "@/actions/pages";
import { AdminListFooter } from "@/components/admin/admin-list-footer";
import { PagesList } from "@/components/admin/pages-list";
import { canDeletePages, canEditPages } from "@/lib/auth/college-scope";
import { isDepartmentHodOnlyUser } from "@/lib/auth/department-hod-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminListParams } from "@/lib/data/admin-list";

const PAGES_SORTS = ["title_en", "slug", "status", "updated_at"] as const;

export default async function AdminPagesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const listParams = parseAdminListParams(params, {
    sortBy: "updated_at",
    sortOrder: "desc",
    allowedSorts: PAGES_SORTS,
  });
  const data = await listPagesForAdmin(listParams);
  const hodOnly = isDepartmentHodOnlyUser(session);
  const canCreate = canEditPages(session) && !hodOnly;
  const canDelete = canDeletePages(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {hodOnly
              ? "My department"
              : session.collegeAssignment
                ? "College pages"
                : "Pages"}
          </h1>
          <p className="text-sm text-slate-500">
            {hodOnly
              ? session.departmentPageAssignment?.departmentTitle
                ? `Editing ${session.departmentPageAssignment.departmentTitle}`
                : "Your assigned department page"
              : session.collegeAssignment
                ? `Managing ${session.collegeAssignment.collegeName}`
                : "CMS-managed static and dynamic pages"}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/pages/new"
            className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New page
          </Link>
        )}
      </div>

      <Suspense fallback={null}>
        <PagesList
          data={data}
          listParams={listParams}
          canDelete={canDelete}
          canCreate={canCreate}
        />
      </Suspense>
    </div>
  );
}
