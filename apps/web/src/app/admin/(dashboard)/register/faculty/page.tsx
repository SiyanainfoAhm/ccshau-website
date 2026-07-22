import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";

export default async function LegacyFacultyRegisterPage() {
  const session = await requireAdminSession();
  const collegeId =
    session.departmentPageAssignment?.collegePageId ?? session.collegeAssignment?.collegePageId;
  if (collegeId) {
    redirect(`/admin/register/${collegeId}/faculty`);
  }
  redirect("/admin/register");
}
