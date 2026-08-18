import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import {
  getCollegesForRegisterForm,
  requireCollegeRegisterAdminOrRedirect,
} from "@/actions/college-register";
import { CollegeRegisterList } from "@/components/admin/college-register-list";
import { isSuperAdminSession } from "@/lib/auth/college-scope";
import { isDepartmentHodOnlyUser } from "@/lib/auth/department-hod-scope";

export default async function CollegeRegisterHubPage() {
  const session = await requireCollegeRegisterAdminOrRedirect();
  const colleges = await getCollegesForRegisterForm();
  const canRegisterMicrosite = isSuperAdminSession(session);

  if (isDepartmentHodOnlyUser(session)) {
    redirect(session.facultyPerson ? "/admin/register/faculty/me" : "/admin");
  }

  if (!canRegisterMicrosite && colleges.length === 1) {
    redirect(`/admin/register/${colleges[0].id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Microsite setup</h1>
          <p className="text-sm text-slate-500">
            Manage departments and faculty for academic colleges and directorates (Type A &amp; B).
          </p>
        </div>
        {canRegisterMicrosite && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/colleges/new"
              className="inline-flex items-center gap-2 rounded-lg bg-ccshau-chrome-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Register college
            </Link>
            <Link
              href="/admin/directorates/new"
              className="inline-flex items-center gap-2 rounded-lg border border-ccshau-chrome-900 bg-white px-4 py-2.5 text-sm font-semibold text-ccshau-chrome-900 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Register directorate
            </Link>
          </div>
        )}
      </div>

      <CollegeRegisterList colleges={colleges} />
    </div>
  );
}
