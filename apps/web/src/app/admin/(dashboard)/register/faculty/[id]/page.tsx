import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getDepartmentsForRegisterForm,
  getFacultyForEdit,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { RegisterFacultyForm } from "@/components/admin/register-faculty-form";

export default async function EditFacultyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCollegeRegisterAdminOrRedirect();
  const { id } = await params;
  const [facultyData, departments] = await Promise.all([
    getFacultyForEdit(id),
    getDepartmentsForRegisterForm(),
  ]);

  if (!facultyData) notFound();

  const returnHref = `/admin/register/${facultyData.department.college_root_id}/faculty`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={returnHref} className="text-sm text-emerald-700 hover:underline">
          ← Faculty
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit faculty</h1>
        <p className="text-sm text-slate-500">
          {facultyData.staff.name_en} — {facultyData.department.college_title} / {facultyData.department.title_en}
        </p>
      </div>
      <RegisterFacultyForm
        departments={departments}
        faculty={facultyData.staff}
        returnHref={returnHref}
      />
    </div>
  );
}
