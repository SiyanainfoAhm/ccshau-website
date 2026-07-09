import { notFound } from "next/navigation";

import {
  getCollegeForRegisterHub,
  getCollegesForRegisterForm,
  getDepartmentsForRegisterForm,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { DepartmentRegisterPage } from "@/components/admin/department-register-page";
import { canDeletePages, canEditPages } from "@/lib/auth/college-scope";

export default async function CollegeDepartmentRegisterPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  const session = await requireCollegeRegisterAdminOrRedirect();
  const canEdit = canEditPages(session);
  const canDelete = canDeletePages(session);
  const { collegeId } = await params;
  const [college, colleges, departments] = await Promise.all([
    getCollegeForRegisterHub(collegeId),
    getCollegesForRegisterForm(),
    getDepartmentsForRegisterForm(collegeId),
  ]);

  if (!college) notFound();

  return (
    <DepartmentRegisterPage
      college={college}
      colleges={colleges}
      departments={departments}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
