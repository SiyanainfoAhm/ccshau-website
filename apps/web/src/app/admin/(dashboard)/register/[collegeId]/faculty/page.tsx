import { notFound, redirect } from "next/navigation";

import {
  getCollegeForRegisterHub,
  getDepartmentsForRegisterForm,
  getFacultyListForRegister,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { FacultyRegisterPage } from "@/components/admin/faculty-register-page";
import { canDeletePages, canEditPages } from "@/lib/auth/college-scope";
import { isDepartmentHodOnlyUser } from "@/lib/auth/department-hod-scope";

export default async function CollegeFacultyRegisterPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  const session = await requireCollegeRegisterAdminOrRedirect();
  if (isDepartmentHodOnlyUser(session)) {
    redirect(session.facultyPerson ? "/admin/register/faculty/me" : "/admin");
  }
  const canEdit = canEditPages(session);
  const canDelete = canDeletePages(session);
  const { collegeId } = await params;
  const [college, departments, faculty] = await Promise.all([
    getCollegeForRegisterHub(collegeId),
    getDepartmentsForRegisterForm(collegeId),
    getFacultyListForRegister(collegeId),
  ]);

  if (!college) notFound();

  return (
    <FacultyRegisterPage
      college={college}
      departments={departments}
      faculty={faculty}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
