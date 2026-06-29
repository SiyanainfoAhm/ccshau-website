import Link from "next/link";

import { BannerForm } from "@/components/admin/banner-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewBannerPage() {
  await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/banners" className="text-sm text-emerald-700 hover:underline">
          ← All banners
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New banner</h1>
      </div>
      <BannerForm />
    </div>
  );
}
