import { notFound } from "next/navigation";

import {
  getCollegeForRegisterHub,
  getDepartmentsForRegisterForm,
  getFacultyListForRegister,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { FacultyRegisterPage } from "@/components/admin/faculty-register-page";

export default async function CollegeFacultyRegisterPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  await requireCollegeRegisterAdminOrRedirect();
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
    />
  );
}
