import Link from "next/link";
import { notFound } from "next/navigation";

import { getBannerById } from "@/actions/banners";
import { BannerForm } from "@/components/admin/banner-form";
import { DeleteBannerButton } from "@/components/admin/delete-banner-button";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const banner = await getBannerById(id);
  if (!banner) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/banners" className="text-sm text-emerald-700 hover:underline">
            ← All banners
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit banner</h1>
          <p className="text-sm text-slate-500">{banner.title}</p>
        </div>
        <DeleteBannerButton bannerId={banner.id} />
      </div>
      <BannerForm banner={banner} />
    </div>
  );
}
