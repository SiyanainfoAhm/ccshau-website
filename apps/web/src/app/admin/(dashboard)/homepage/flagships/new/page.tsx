import { HomepageInitiativeForm } from "@/components/admin/homepage-forms";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewHomepageFlagshipPage() {
  await requireAdminSession();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900">New flagship</h1>
      <HomepageInitiativeForm />
    </div>
  );
}
