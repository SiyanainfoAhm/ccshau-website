import { listDepartments } from "@/actions/tenders";
import { TenderForm } from "@/components/admin/tender-form";
import { CONTENT_EDIT_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function NewTenderPage() {
  await requireAdminWithRolesOrRedirect([...CONTENT_EDIT_ROLES]);
  const departments = await listDepartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">New tender</h1>
        <p className="text-sm text-slate-500">Create a tender with documents and closing date</p>
      </div>
      <TenderForm departments={departments} />
    </div>
  );
}
