import { HomepageQuoteForm } from "@/components/admin/homepage-forms";
import { requireSiteStructureOrRedirect } from "@/lib/auth/site-structure-access";

export default async function AdminNewHomepageQuotePage() {
  await requireSiteStructureOrRedirect();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">New homepage quote</h1>
      <HomepageQuoteForm />
    </div>
  );
}
