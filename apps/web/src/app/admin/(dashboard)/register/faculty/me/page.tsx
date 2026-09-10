import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";

import { getOwnFacultyPersonForEdit } from "@/actions/college-register";
import { FacultyPersonEditor } from "@/components/admin/faculty-person-editor";
import { isOwnFacultyProfileOnlyUser } from "@/lib/auth/faculty-scope";
import { requireAdminSession } from "@/lib/auth/session";

export default async function MyFacultyProfilePage() {
  const session = await requireAdminSession();
  if (!session.facultyPerson) {
    redirect("/admin");
  }

  const data = await getOwnFacultyPersonForEdit();
  if (!data) notFound();

  const ownProfileOnly = isOwnFacultyProfileOnlyUser(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">My profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.person.name_en}
          {data.person.email ? ` · ${data.person.email}` : ""}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          You can update only your own profile: name, photo, mobile, specialization, and Other
          Activities. Designation and department placement are managed by college or university
          admin. To update your login password, open{" "}
          <Link
            href="/admin/register/faculty/change-password"
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            Change password
          </Link>
          .
        </p>
      </div>
      <FacultyPersonEditor
        person={data.person}
        ownProfileOnly={ownProfileOnly}
        successMessage={
          ownProfileOnly ? "Your profile was saved. Changes are live on the public faculty page." : undefined
        }
      />
    </div>
  );
}
