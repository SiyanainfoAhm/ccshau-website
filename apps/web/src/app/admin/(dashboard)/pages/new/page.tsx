import { listAllPagesForAdmin, listDepartments } from "@/actions/pages";
import { PageForm } from "@/components/admin/page-form";
import { canPublishContent } from "@/lib/auth/cms-roles";
import { canCreateCollegeRoot, canEditPages } from "@/lib/auth/college-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { buildAdminParentPageOptions } from "@/lib/pages/resolve-public-path";

export default async function NewPagePage() {
  const session = await requireAdminSession();
  if (!canEditPages(session)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Your account has view-only access to college pages.
      </div>
    );
  }

  const [departments, allPages] = await Promise.all([listDepartments(), listAllPagesForAdmin()]);
  const parentPages = buildAdminParentPageOptions(allPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">New page</h1>
        <p className="text-sm text-slate-500">Create a bilingual CMS page or college landing</p>
      </div>
      <PageForm
        departments={departments}
        parentPages={parentPages}
        allowCollegeRoot={canCreateCollegeRoot(session)}
        canPublish={canPublishContent(session)}
      />
    </div>
  );
}
