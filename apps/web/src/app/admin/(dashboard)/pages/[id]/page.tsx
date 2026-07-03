import Link from "next/link";
import { notFound } from "next/navigation";

import {
  listPageContactLinesForAdmin,
  listPageSidebarItemsForAdmin,
  listPageStaffForAdmin,
} from "@/actions/office-portal";
import { getPageById, listDepartments, listPagesForAdmin } from "@/actions/pages";
import { PageForm } from "@/components/admin/page-form";
import { requireAdminSession } from "@/lib/auth/session";
import { buildAdminParentPageOptions, resolvePagePublicPath } from "@/lib/pages/resolve-public-path";
import { isCollegeLayoutPage } from "@/lib/pages/layout-config";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [page, departments, allPages] = await Promise.all([
    getPageById(id),
    listDepartments(),
    listPagesForAdmin(),
  ]);

  if (!page) notFound();

  const parentPages = buildAdminParentPageOptions(allPages);
  const pageById = new Map(allPages.map((p) => [p.id, p]));
  const publicPath = resolvePagePublicPath(page, pageById);
  const [contactLines, staff, sidebarItems] = await Promise.all([
    listPageContactLinesForAdmin(page.id),
    listPageStaffForAdmin(page.id),
    listPageSidebarItemsForAdmin(page.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Edit page</h1>
          <p className="text-sm text-slate-500">/{page.slug}</p>
        </div>
        {page.status === "published" && (page.page_type === "college" || isCollegeLayoutPage(page)) && (
          <Link
            href={publicPath}
            target="_blank"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            View public page →
          </Link>
        )}
      </div>
      <PageForm
        departments={departments}
        parentPages={parentPages}
        page={page}
        officePortalData={{ contactLines, staff, sidebarItems }}
      />
    </div>
  );
}
