import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getDepartmentsForRegisterForm,
  getFacultyPersonForEdit,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { FacultyAssignmentsPanel } from "@/components/admin/faculty-assignments-panel";
import { FacultyPersonEditor } from "@/components/admin/faculty-person-editor";
import { canEditPages } from "@/lib/auth/college-scope";

export default async function EditFacultyPersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const session = await requireCollegeRegisterAdminOrRedirect();
  const canEdit = canEditPages(session);
  const { personId } = await params;
  const [data, departments] = await Promise.all([
    getFacultyPersonForEdit(personId),
    getDepartmentsForRegisterForm(),
  ]);

  if (!data) notFound();

  const returnCollegeId = data.assignments.find((row) => row.collegeRootId)?.collegeRootId;
  const returnHref = returnCollegeId ? `/admin/register/${returnCollegeId}/faculty` : "/admin/register";

  return (
    <div className="space-y-6">
      <div>
        <Link href={returnHref} className="text-sm text-emerald-700 hover:underline">
          ← Faculty
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
          {canEdit ? "Edit faculty person" : "View faculty person"}
        </h1>
        <p className="text-sm text-slate-500">
          {data.person.name_en}
          {data.person.email ? ` · ${data.person.email}` : ""}
        </p>
        {!canEdit && (
          <p className="mt-2 text-sm text-slate-500">Read-only — you do not have permission to update this profile.</p>
        )}
      </div>
      <FacultyPersonEditor person={data.person} readOnly={!canEdit} />
      <FacultyAssignmentsPanel
        personId={data.person.id}
        personName={data.person.name_en}
        assignments={data.assignments}
        departments={departments}
        canEdit={canEdit}
      />
    </div>
  );
}
