import { notFound } from "next/navigation";

import {
  getCollegeForRegisterHub,
  getCollegesForRegisterForm,
  getDepartmentsForRegisterForm,
  requireCollegeRegisterAdmin,
} from "@/actions/college-register";
import { DepartmentRegisterPage } from "@/components/admin/department-register-page";

export default async function CollegeDepartmentRegisterPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  await requireCollegeRegisterAdmin();
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
    />
  );
}
