import { listDepartments } from "@/actions/tenders";
import { TenderForm } from "@/components/admin/tender-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function NewTenderPage() {
  await requireAdminSession();
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
