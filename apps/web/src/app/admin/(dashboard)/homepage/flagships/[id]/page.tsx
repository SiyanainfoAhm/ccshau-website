import { notFound } from "next/navigation";

import { getHomepageInitiativeById } from "@/actions/homepage";
import { DeleteHomepageInitiativeButton, HomepageInitiativeForm } from "@/components/admin/homepage-forms";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditHomepageFlagshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const initiative = await getHomepageInitiativeById(id);
  if (!initiative) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Edit flagship</h1>
        <DeleteHomepageInitiativeButton id={initiative.id} />
      </div>
      <HomepageInitiativeForm initiative={initiative} />
    </div>
  );
}
