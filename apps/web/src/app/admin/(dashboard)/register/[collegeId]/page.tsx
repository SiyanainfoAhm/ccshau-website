import Link from "next/link";
import { notFound } from "next/navigation";

import { getCollegeForRegisterHub, requireCollegeRegisterAdmin } from "@/actions/college-register";
import { CollegeRegisterHub } from "@/components/admin/college-register-hub";
import { MICROSITE_KIND_LABELS } from "@/lib/pages/microsite-kind";

export default async function CollegeRegisterDetailPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  await requireCollegeRegisterAdmin();
  const { collegeId } = await params;
  const college = await getCollegeForRegisterHub(collegeId);
  if (!college) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/register" className="text-sm text-emerald-700 hover:underline">
          ← Microsite setup
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">{college.title_en}</h1>
        <p className="text-sm text-slate-500">
          {MICROSITE_KIND_LABELS[college.kind].en} — manage departments and faculty for this microsite.
        </p>
      </div>
      <CollegeRegisterHub college={college} />
    </div>
  );
}
