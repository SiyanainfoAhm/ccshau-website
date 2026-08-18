import { redirect } from "next/navigation";

import { isDepartmentHodOnlyUser } from "@/lib/auth/department-hod-scope";
import { requireAdminSession } from "@/lib/auth/session";

export default async function LegacyFacultyRegisterPage() {
  const session = await requireAdminSession();
  if (isDepartmentHodOnlyUser(session)) {
    redirect(session.facultyPerson ? "/admin/register/faculty/me" : "/admin");
  }
  const collegeId =
    session.departmentPageAssignment?.collegePageId ?? session.collegeAssignment?.collegePageId;
  if (collegeId) {
    redirect(`/admin/register/${collegeId}/faculty`);
  }
  redirect("/admin/register");
}
