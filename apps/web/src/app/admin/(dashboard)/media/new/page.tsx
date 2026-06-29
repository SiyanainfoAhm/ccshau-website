import Link from "next/link";

import { listDepartments } from "@/actions/media";
import { MediaAlbumForm } from "@/components/admin/media-album-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewMediaAlbumPage() {
  await requireAdminSession();
  const departments = await listDepartments();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/media" className="text-sm text-emerald-700 hover:underline">
          ← All albums
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New media album</h1>
      </div>
      <MediaAlbumForm departments={departments} />
    </div>
  );
}
