import { notFound } from "next/navigation";

import { getHomepageDignitaryById } from "@/actions/homepage";
import { DeleteHomepageDignitaryButton, HomepageDignitaryForm } from "@/components/admin/homepage-forms";
import { requireSiteStructureOrRedirect } from "@/lib/auth/site-structure-access";

export default async function AdminEditHomepageDignitaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSiteStructureOrRedirect();
  const { id } = await params;
  const dignitary = await getHomepageDignitaryById(id);
  if (!dignitary) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Edit dignitary</h1>
        <DeleteHomepageDignitaryButton id={dignitary.id} />
      </div>
      <HomepageDignitaryForm dignitary={dignitary} />
    </div>
  );
}
