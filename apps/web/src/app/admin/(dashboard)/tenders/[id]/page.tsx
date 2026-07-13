import { notFound } from "next/navigation";

import { getTenderById, listCorrigendaForTender, listDepartments } from "@/actions/tenders";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { CorrigendumPanel } from "@/components/admin/corrigendum-panel";
import { DeleteTenderButton } from "@/components/admin/delete-tender-button";
import { TenderForm } from "@/components/admin/tender-form";
import {
  canEditContent,
  canPublishContent,
  CMS_READ_ROLES,
} from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function EditTenderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminWithRolesOrRedirect([...CMS_READ_ROLES]);
  const canEdit = canEditContent(session);
  const canPublish = canPublishContent(session);
  const { id } = await params;
  const [tender, departments, corrigenda] = await Promise.all([
    getTenderById(id),
    listDepartments(),
    listCorrigendaForTender(id),
  ]);

  if (!tender) notFound();

  const showReview = tender.status === "pending_review" && canPublish;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {canEdit ? "Edit tender" : "View tender"}
          </h1>
          <p className="text-sm text-slate-500">
            {tender.tender_number ? `${tender.tender_number} · ` : ""}/{tender.slug}
          </p>
        </div>
        {canEdit ? <DeleteTenderButton tenderId={tender.id} /> : null}
      </div>

      {showReview ? (
        <ContentReviewPanel
          entityType="tender"
          entityId={tender.id}
          title={tender.title_en}
          approveLabel="Approve & open"
          approveMessage="Tender opened for bidding."
        />
      ) : null}

      {canEdit ? (
        <>
          <TenderForm departments={departments} tender={tender} canPublish={canPublish} />
          <CorrigendumPanel tenderId={tender.id} corrigenda={corrigenda} />
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-900">{tender.title_en}</p>
          <p className="mt-2">Status: {tender.status}</p>
        </div>
      )}
    </div>
  );
}
