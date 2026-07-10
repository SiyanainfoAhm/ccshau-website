import Link from "next/link";
import { notFound } from "next/navigation";

import {
  listPageContactLinesForAdmin,
  listPageGalleryItemsForAdmin,
  listPageNewsTickerItemsForAdmin,
  listPageStudentCornerItemsForAdmin,
  listPageSidebarItemsForAdmin,
  listPageStaffForAdmin,
} from "@/actions/office-portal";
import { getPageById, listAllPagesForAdmin, listDepartments } from "@/actions/pages";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { PageForm } from "@/components/admin/page-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { canPublishContent } from "@/lib/auth/cms-roles";
import { canCreateCollegeRoot, canEditPages } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { buildAdminParentPageOptions, resolvePagePublicPath } from "@/lib/pages/resolve-public-path";
import { isCollegeLayoutPage } from "@/lib/pages/layout-config";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  const { id } = await params;
  const [page, departments, allPages] = await Promise.all([
    getPageById(id),
    listDepartments(),
    listAllPagesForAdmin(),
  ]);

  if (!page) notFound();

  const canEdit = canEditPages(session);
  const showReview = page.status === "pending_review" && canPublishContent(session);
  const parentPages = buildAdminParentPageOptions(allPages);
  const pageById = new Map(allPages.map((p) => [p.id, p]));
  const publicPath = resolvePagePublicPath(page, pageById);
  const [contactLines, staff, galleryItems, newsTickerItems, studentCornerItems, sidebarItems] =
    await Promise.all([
    listPageContactLinesForAdmin(page.id),
    listPageStaffForAdmin(page.id),
    listPageGalleryItemsForAdmin(page.id),
    listPageNewsTickerItemsForAdmin(page.id),
    listPageStudentCornerItemsForAdmin(page.id),
    listPageSidebarItemsForAdmin(page.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {canEdit ? "Edit page" : "View page"}
          </h1>
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

      {showReview ? (
        <ContentReviewPanel entityType="page" entityId={id} title={page.title_en} />
      ) : null}

      {canEdit ? (
        <PageForm
          departments={departments}
          parentPages={parentPages}
          page={page}
          officePortalData={{ contactLines, staff, galleryItems, newsTickerItems, studentCornerItems, sidebarItems }}
          allowCollegeRoot={canCreateCollegeRoot(session)}
          canEdit={canEdit}
          canPublish={canPublishContent(session)}
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{page.title_en}</h2>
            <StatusBadge status={page.status} />
          </div>
          {page.excerpt_en ? <p className="text-sm text-slate-600">{page.excerpt_en}</p> : null}
        </div>
      )}
    </div>
  );
}
