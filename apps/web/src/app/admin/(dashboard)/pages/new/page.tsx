import { listDepartments, listPagesForAdmin } from "@/actions/pages";
import { PageForm } from "@/components/admin/page-form";
import { requireAdminSession } from "@/lib/auth/session";
import { buildAdminParentPageOptions } from "@/lib/pages/resolve-public-path";

export default async function NewPagePage() {
  await requireAdminSession();
  const [departments, allPages] = await Promise.all([listDepartments(), listPagesForAdmin()]);
  const parentPages = buildAdminParentPageOptions(allPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">New page</h1>
        <p className="text-sm text-slate-500">Create a bilingual CMS page or college landing</p>
      </div>
      <PageForm departments={departments} parentPages={parentPages} />
    </div>
  );
}
