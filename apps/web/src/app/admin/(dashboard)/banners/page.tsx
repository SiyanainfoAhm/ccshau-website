import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

import { listBannersForAdmin } from "@/actions/banners";
import { requireAdminSession } from "@/lib/auth/session";
import { getStoredFileUrl } from "@/lib/storage/upload";

export default async function AdminBannersPage() {
  await requireAdminSession();
  const banners = await listBannersForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Banners</h1>
          <p className="text-sm text-slate-500">Manage homepage carousel and campaign banners</p>
        </div>
        <Link
          href="/admin/banners/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New banner
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {banners.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No banners yet.{" "}
            <Link href="/admin/banners/new" className="text-emerald-700 hover:underline">
              Create your first banner
            </Link>
          </div>
        ) : (
          banners.map((banner) => {
            const imageUrl =
              banner.image_path !== "pending" ? getStoredFileUrl(banner.image_path) : null;
            return (
              <Link
                key={banner.id}
                href={`/admin/banners/${banner.id}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300"
              >
                <div className="relative h-36 bg-slate-100">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={banner.alt_text ?? banner.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-slate-900">{banner.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Priority {banner.priority} ·{" "}
                    {banner.is_active ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
