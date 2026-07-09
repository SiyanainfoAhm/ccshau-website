import Link from "next/link";
import { notFound } from "next/navigation";

import { getCollegesForRegisterForm, getDepartmentForEdit, requireCollegeRegisterAdminOrRedirect } from "@/actions/college-register";
import { RegisterDepartmentForm } from "@/components/admin/register-forms";
import { canEditPages } from "@/lib/auth/college-scope";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCollegeRegisterAdminOrRedirect();
  const canEdit = canEditPages(session);
  const { id } = await params;
  const [department, colleges] = await Promise.all([
    getDepartmentForEdit(id),
    getCollegesForRegisterForm(),
  ]);

  if (!department) notFound();

  const returnHref = `/admin/register/${department.collegePageId}/department`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={returnHref} className="text-sm text-emerald-700 hover:underline">
          ← Departments
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
          {canEdit ? "Edit department" : "View department"}
        </h1>
        <p className="text-sm text-slate-500">{department.titleEn}</p>
        {!canEdit && (
          <p className="mt-2 text-sm text-slate-500">Read-only — you do not have permission to update this department.</p>
        )}
      </div>
      <RegisterDepartmentForm
        colleges={colleges}
        department={department}
        returnHref={returnHref}
        readOnly={!canEdit}
      />
    </div>
  );
}
