import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MicrositeFooterForm } from "@/components/admin/microsite-footer-form";
import { canEditPages, sessionCanAccessCollegeRoot } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { loadDepartmentFooterLinks, loadMicrositeFooterForAdmin } from "@/lib/data/microsite-footer";
import { assertCollegeRegisterAccess } from "@/lib/pages/college-register-helpers";
import { footerFromContacts, placeDepartmentLinks } from "@/lib/pages/microsite-footer";

export default async function MicrositeFooterPage({
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

  const loaded = await loadMicrositeFooterForAdmin(collegeId);
  if (!loaded) notFound();
  const departmentLinks = await loadDepartmentFooterLinks(collegeId, college.slug);
  const fallback = footerFromContacts(college.title_en, null, loaded.contacts);
  const footer = placeDepartmentLinks(
    {
      ...loaded.footer,
      nameEn: loaded.footer.nameEn || fallback.nameEn,
      addressEn: loaded.footer.addressEn || fallback.addressEn,
      addressHi: loaded.footer.addressHi || fallback.addressHi,
      phone: loaded.footer.phone || fallback.phone,
      email: loaded.footer.email || fallback.email,
    },
    loaded.footer.links.length > 0 ? [] : departmentLinks,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/register/${collegeId}`} className="text-sm text-emerald-700 hover:underline">
          ← {college.title_en}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Microsite footer</h1>
        <p className="text-sm text-slate-500">
          Shown on {college.title_en} and every page inside it when the custom footer is on. When it is off, those pages show the university footer instead.
        </p>
      </div>
      <MicrositeFooterForm collegePageId={collegeId} footer={footer} columnReady={loaded.columnReady} />
    </div>
  );
}
