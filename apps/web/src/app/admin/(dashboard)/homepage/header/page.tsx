import Link from "next/link";

import { HeaderBrandingForm } from "@/components/admin/header-branding-form";
import { requireSiteStructureOrRedirect } from "@/lib/auth/site-structure-access";
import { getSiteSettings } from "@/lib/settings/site-settings";

export default async function AdminHomepageHeaderPage() {
  await requireSiteStructureOrRedirect();
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Public header</h1>
        <p className="text-sm text-slate-500">
          Motto, university name, accreditation, logo, and portrait on the public site
        </p>
      </div>
      <HeaderBrandingForm settings={settings} />
      <Link href="/admin/homepage" className="text-sm text-emerald-700 hover:underline">
        ← Back to homepage
      </Link>
    </div>
  );
}
