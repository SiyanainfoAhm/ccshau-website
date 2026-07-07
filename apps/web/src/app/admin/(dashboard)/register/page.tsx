import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import {
  getCollegesForRegisterForm,
  requireCollegeRegisterAdmin,
} from "@/actions/college-register";
import { CollegeRegisterList } from "@/components/admin/college-register-list";
import { isSuperAdminSession } from "@/lib/auth/college-scope";

export default async function CollegeRegisterHubPage() {
  const session = await requireCollegeRegisterAdmin();
  const colleges = await getCollegesForRegisterForm();
  const canRegisterMicrosite = isSuperAdminSession(session);

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
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Register college
            </Link>
            <Link
              href="/admin/directorates/new"
              className="inline-flex items-center gap-2 rounded-lg border border-[#0b3d2e] bg-white px-4 py-2.5 text-sm font-semibold text-[#0b3d2e] hover:bg-emerald-50"
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
