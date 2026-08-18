import { notFound, redirect } from "next/navigation";

import { getFacultyForEdit, requireCollegeRegisterAdminOrRedirect } from "@/actions/college-register";

export default async function EditFacultyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCollegeRegisterAdminOrRedirect();
  const { id } = await params;
  const facultyData = await getFacultyForEdit(id);
  if (!facultyData?.personId) notFound();
  redirect(`/admin/register/faculty/person/${facultyData.personId}`);
}
