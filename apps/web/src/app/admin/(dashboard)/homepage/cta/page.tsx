import Link from "next/link";

import { getHomepageCtaForAdmin } from "@/actions/homepage";
import { HomepageCtaForm } from "@/components/admin/homepage-forms";
import { requireSiteStructureOrRedirect } from "@/lib/auth/site-structure-access";

export default async function AdminHomepageCtaPage() {
  await requireSiteStructureOrRedirect();
  const cta = await getHomepageCtaForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Farmers&apos; portal CTA</h1>
        <p className="text-sm text-slate-500">Call-to-action band on the homepage</p>
      </div>
      <HomepageCtaForm cta={cta} />
      <Link href="/admin/homepage" className="text-sm text-emerald-700 hover:underline">
        ← Back to homepage
      </Link>
    </div>
  );
}
