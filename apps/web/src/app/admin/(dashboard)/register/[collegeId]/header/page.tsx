import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MicrositeHeaderForm } from "@/components/admin/microsite-header-form";
import { canEditPages, sessionCanAccessCollegeRoot } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { loadMicrositeHeaderForAdmin } from "@/lib/data/microsite-header";
import { assertCollegeRegisterAccess } from "@/lib/pages/college-register-helpers";
import { getStoredFileUrl } from "@/lib/storage/urls";

export default async function MicrositeHeaderPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  const session = await requireAdminSession();
  const { collegeId } = await params;
  if (!canEditPages(session) || !sessionCanAccessCollegeRoot(session, collegeId)) {
    redirect(`/admin/register/${collegeId}`);
  }

  let college;
  try {
    college = await assertCollegeRegisterAccess(session, collegeId);
  } catch {
    notFound();
  }

  const loaded = await loadMicrositeHeaderForAdmin(collegeId);
  if (!loaded) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/register/${collegeId}`} className="text-sm text-emerald-700 hover:underline">
          ← {college.title_en}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Microsite header</h1>
        <p className="text-sm text-slate-500">
          Shown on {college.title_en} and every page inside it when the custom header is on. When it is off, those pages keep the current header.
        </p>
      </div>
      <MicrositeHeaderForm
        collegePageId={collegeId}
        header={loaded.header}
        columnReady={loaded.columnReady}
        logoPreviewUrl={loaded.header.logoPath ? getStoredFileUrl(loaded.header.logoPath) : null}
      />
    </div>
  );
}
