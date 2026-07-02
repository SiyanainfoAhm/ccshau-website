import Link from "next/link";
import { notFound } from "next/navigation";

import {
  listPageContactLinesForAdmin,
  listPageSidebarItemsForAdmin,
  listPageStaffForAdmin,
} from "@/actions/office-portal";
import { getPageById, listDepartments, listPagesForAdmin } from "@/actions/pages";
import { OfficePortalAdminPanel } from "@/components/admin/office-portal-admin-panel";
import { PageForm } from "@/components/admin/page-form";
import { requireAdminSession } from "@/lib/auth/session";
import { buildAdminParentPageOptions } from "@/lib/pages/resolve-public-path";

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
  const isOfficePortal =
    page.page_type === "college" && page.layout_template === "office_portal";

  const [contactLines, staff, sidebarItems] = isOfficePortal
    ? await Promise.all([
        listPageContactLinesForAdmin(page.id),
        listPageStaffForAdmin(page.id),
        listPageSidebarItemsForAdmin(page.id),
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Edit page</h1>
          <p className="text-sm text-slate-500">/{page.slug}</p>
        </div>
        {page.status === "published" && page.page_type === "college" && (
          <Link
            href={`/college/${page.slug}`}
            target="_blank"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            View public page →
          </Link>
        )}
      </div>
      <PageForm departments={departments} parentPages={parentPages} page={page} />
      {isOfficePortal && (
        <OfficePortalAdminPanel
          pageId={page.id}
          contactLines={contactLines}
          staff={staff}
          sidebarItems={sidebarItems}
        />
      )}
    </div>
  );
}
