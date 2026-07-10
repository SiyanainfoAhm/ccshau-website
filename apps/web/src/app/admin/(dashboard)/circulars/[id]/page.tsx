import Link from "next/link";
import { notFound } from "next/navigation";

import { getCircularById, listDepartments } from "@/actions/circulars";
import { CircularForm } from "@/components/admin/circular-form";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { DeleteCircularButton } from "@/components/admin/delete-circular-button";
import { canPublishContent } from "@/lib/auth/cms-roles";
import { canManageUniversityContent } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditCircularPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const canEdit = canManageUniversityContent(session);
  const { id } = await params;
  const [circular, departments] = await Promise.all([
    getCircularById(id),
    listDepartments(),
  ]);
  if (!circular) notFound();
  const showReview = circular.status === "pending_review" && canPublishContent(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/circulars" className="text-sm text-emerald-700 hover:underline">
            ← All circulars
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
            {canEdit ? "Edit circular" : "View circular"}
          </h1>
        </div>
        {canEdit && <DeleteCircularButton circularId={circular.id} />}
      </div>
      {showReview ? (
        <ContentReviewPanel entityType="circular" entityId={id} title={circular.title_en} />
      ) : null}
      <CircularForm departments={departments} circular={circular} canEdit={canEdit} />
    </div>
  );
}
