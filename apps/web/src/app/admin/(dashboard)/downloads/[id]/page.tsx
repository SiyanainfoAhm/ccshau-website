import Link from "next/link";
import { notFound } from "next/navigation";

import { getDownloadById, listDepartments, listDownloadVersions } from "@/actions/downloads";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { DeleteDownloadButton } from "@/components/admin/delete-download-button";
import { DownloadForm } from "@/components/admin/download-form";
import { DownloadVersionPanel } from "@/components/admin/download-version-panel";
import {
  canEditContent,
  canPublishContent,
  CMS_READ_ROLES,
} from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function AdminEditDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminWithRolesOrRedirect([...CMS_READ_ROLES]);
  const { id } = await params;
  const [download, departments, versions] = await Promise.all([
    getDownloadById(id),
    listDepartments(),
    listDownloadVersions(id),
  ]);
  if (!download) notFound();

  const canEdit = canEditContent(session);
  const showReview = download.status === "pending_review" && canPublishContent(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/downloads" className="text-sm text-emerald-700 hover:underline">
            ← All downloads
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
            {canEdit ? "Edit download" : "Review download"}
          </h1>
          <p className="text-sm text-slate-500">
            {download.download_count} public downloads
            {download.is_public ? " · Public" : " · Private (admin only)"}
          </p>
        </div>
        {canEdit ? <DeleteDownloadButton downloadId={download.id} /> : null}
      </div>
      {showReview ? (
        <ContentReviewPanel entityType="download" entityId={id} title={download.title_en} />
      ) : null}
      {canEdit ? (
        <>
          <DownloadForm
            departments={departments}
            download={download}
            canPublish={canPublishContent(session)}
          />
          <DownloadVersionPanel versions={versions} />
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-900">{download.title_en}</p>
          <p className="mt-2">Status: {download.status.replace(/_/g, " ")}</p>
        </div>
      )}
    </div>
  );
}
