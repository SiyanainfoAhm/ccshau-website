import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPageById,
  getParentPageOptionForAdmin,
  listDepartments,
  resolveAdminPagePublicPath,
} from "@/actions/pages";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { PageForm } from "@/components/admin/page-form";
import { PageReviewPreview } from "@/components/admin/page-review-preview";
import { canPublishContent } from "@/lib/auth/cms-roles";
import { canCreateCollegeRoot, canEditPages, canPublishPages } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;
  const { saved } = await searchParams;
  const canEdit = canEditPages(session);

  const [page, departments] = await Promise.all([getPageById(id), listDepartments()]);

  if (!page) notFound();

  const [publicPath, initialParentOption] = await Promise.all([
    resolveAdminPagePublicPath(page),
    page.parent_id ? getParentPageOptionForAdmin(page.parent_id) : Promise.resolve(null),
  ]);

  const canPublish = canPublishPages(session) || canPublishContent(session);
  const showReview = page.status === "pending_review" && canPublish;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {canEdit ? "Edit page" : "View page"}
          </h1>
          <p className="text-sm text-slate-500">/{page.slug}</p>
        </div>
        {page.status === "published" && (
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
          initialParentOption={initialParentOption}
          page={page}
          allowCollegeRoot={canCreateCollegeRoot(session)}
          canEdit={canEdit}
          canPublish={canPublish}
          initialSuccess={saved === "1" ? "Page created successfully." : null}
          lockPageStructure={
            session.departmentPageAssignment?.departmentPageId === page.id
          }
        />
      ) : (
        <PageReviewPreview page={page} publicPath={publicPath} />
      )}
    </div>
  );
}
