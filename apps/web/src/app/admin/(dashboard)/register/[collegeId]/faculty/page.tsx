import { notFound } from "next/navigation";

import {
  getCollegeForRegisterHub,
  getDepartmentsForRegisterForm,
  getFacultyListForRegister,
  requireCollegeRegisterAdmin,
} from "@/actions/college-register";
import { FacultyRegisterPage } from "@/components/admin/faculty-register-page";

export default async function CollegeFacultyRegisterPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  await requireCollegeRegisterAdmin();
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
