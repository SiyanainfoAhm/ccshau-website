import Link from "next/link";
import { notFound } from "next/navigation";

import { getRelatedLinkById } from "@/actions/related-links";
import { DeleteRelatedLinkButton } from "@/components/admin/delete-related-link-button";
import { RelatedLinkForm } from "@/components/admin/related-link-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditRelatedLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const link = await getRelatedLinkById(id);
  if (!link) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/related-links" className="text-sm text-emerald-700 hover:underline">
            ← All related links
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit related link</h1>
        </div>
        <DeleteRelatedLinkButton linkId={link.id} />
      </div>
      <RelatedLinkForm link={link} />
    </div>
  );
}
