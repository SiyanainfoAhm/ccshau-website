import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MicrositeMenuForm } from "@/components/admin/microsite-menu-form";
import { canEditPages, sessionCanAccessCollegeRoot } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { loadMicrositeMenuEditor } from "@/lib/data/microsite-menu";
import { assertCollegeRegisterAccess } from "@/lib/pages/college-register-helpers";

export default async function MicrositeMenuPage({
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

  const editor = await loadMicrositeMenuEditor(collegeId);
  if (!editor) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/register/${collegeId}`} className="text-sm text-emerald-700 hover:underline">
          ← {college.title_en}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Microsite menu</h1>
        <p className="text-sm text-slate-500">
          Add a menu item, change the order, or hide and show items on {college.title_en}.
          Hidden items stay off the menu. Home and Contact can be hidden, not removed.
        </p>
      </div>
      <MicrositeMenuForm
        collegePageId={collegeId}
        usingSavedMenu={editor.usingSavedMenu}
        initialItems={editor.items}
        availablePages={editor.availablePages}
      />
    </div>
  );
}
