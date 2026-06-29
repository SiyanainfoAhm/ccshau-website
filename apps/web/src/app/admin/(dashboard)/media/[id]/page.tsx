import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getMediaAlbumById,
  listDepartments,
  listMediaItemsForAlbum,
} from "@/actions/media";
import { DeleteMediaAlbumButton } from "@/components/admin/delete-media-album-button";
import { MediaAlbumForm } from "@/components/admin/media-album-form";
import { MediaItemsPanel } from "@/components/admin/media-items-panel";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditMediaAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const [album, departments, items] = await Promise.all([
    getMediaAlbumById(id),
    listDepartments(),
    listMediaItemsForAlbum(id),
  ]);
  if (!album) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/media" className="text-sm text-emerald-700 hover:underline">
            ← All albums
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit album</h1>
          <p className="text-sm text-slate-500">/{album.slug}</p>
        </div>
        <DeleteMediaAlbumButton albumId={album.id} />
      </div>
      <MediaAlbumForm departments={departments} album={album} />
      <MediaItemsPanel albumId={album.id} items={items} />
    </div>
  );
}
