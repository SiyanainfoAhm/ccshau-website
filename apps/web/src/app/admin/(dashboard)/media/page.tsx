import Link from "next/link";
import { Plus } from "lucide-react";

import { listMediaAlbumsForAdmin } from "@/actions/media";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminMediaPage() {
  await requireAdminSession();
  const albums = await listMediaAlbumsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Media centre</h1>
          <p className="text-sm text-slate-500">Photo galleries, videos, press releases, and events</p>
        </div>
        <Link
          href="/admin/media/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New album
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Items</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {albums.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No albums yet.{" "}
                  <Link href="/admin/media/new" className="text-emerald-700 hover:underline">
                    Create your first album
                  </Link>
                </td>
              </tr>
            ) : (
              albums.map((album) => (
                <tr key={album.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/media/${album.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-800"
                    >
                      {album.title_en}
                    </Link>
                    <p className="text-xs text-slate-500">/{album.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">
                    {album.album_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{album.item_count}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={album.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
