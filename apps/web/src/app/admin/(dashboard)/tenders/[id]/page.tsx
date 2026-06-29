import { notFound } from "next/navigation";

import { getTenderById, listCorrigendaForTender, listDepartments } from "@/actions/tenders";
import { CorrigendumPanel } from "@/components/admin/corrigendum-panel";
import { DeleteTenderButton } from "@/components/admin/delete-tender-button";
import { TenderForm } from "@/components/admin/tender-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function EditTenderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [tender, departments, corrigenda] = await Promise.all([
    getTenderById(id),
    listDepartments(),
    listCorrigendaForTender(id),
  ]);

  if (!tender) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Edit tender</h1>
          <p className="text-sm text-slate-500">
            {tender.tender_number ? `${tender.tender_number} · ` : ""}/{tender.slug}
          </p>
        </div>
        <DeleteTenderButton tenderId={tender.id} />
      </div>
      <TenderForm departments={departments} tender={tender} />
      <CorrigendumPanel tenderId={tender.id} corrigenda={corrigenda} />
    </div>
  );
}
