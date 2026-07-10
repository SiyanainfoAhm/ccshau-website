import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getMediaAlbumById,
  listDepartments,
  listMediaItemsForAlbum,
} from "@/actions/media";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { DeleteMediaAlbumButton } from "@/components/admin/delete-media-album-button";
import { MediaAlbumForm } from "@/components/admin/media-album-form";
import { MediaItemsPanel } from "@/components/admin/media-items-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  canEditContent,
  canPublishContent,
  CMS_READ_ROLES,
} from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function AdminEditMediaAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminWithRolesOrRedirect([...CMS_READ_ROLES]);
  const { id } = await params;
  const [album, departments, items] = await Promise.all([
    getMediaAlbumById(id),
    listDepartments(),
    listMediaItemsForAlbum(id),
  ]);
  if (!album) notFound();

  const canEdit = canEditContent(session);
  const showReview = album.status === "pending_review" && canPublishContent(session);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/media" className="text-sm text-emerald-700 hover:underline">
            ← All albums
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
            {canEdit ? "Edit album" : "Review album"}
          </h1>
          <p className="text-sm text-slate-500">/{album.slug}</p>
        </div>
        {canEdit ? <DeleteMediaAlbumButton albumId={album.id} /> : null}
      </div>

      {showReview ? (
        <ContentReviewPanel entityType="media_album" entityId={id} title={album.title_en} />
      ) : null}

      {canEdit ? (
        <>
          <MediaAlbumForm
            departments={departments}
            album={album}
            canPublish={canPublishContent(session)}
          />
          <MediaItemsPanel albumId={album.id} items={items} />
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-slate-900">{album.title_en}</p>
            <StatusBadge status={album.status} />
          </div>
          <p className="mt-2">{items.length} media item(s)</p>
        </div>
      )}
    </div>
  );
}
