import { HomepageInitiativeForm } from "@/components/admin/homepage-forms";
import { requireSiteStructureOrRedirect } from "@/lib/auth/site-structure-access";

export default async function AdminNewHomepageFlagshipPage() {
  await requireSiteStructureOrRedirect();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">New flagship</h1>
      <HomepageInitiativeForm />
    </div>
  );
}
