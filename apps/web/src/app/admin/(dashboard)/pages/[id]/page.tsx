import { notFound } from "next/navigation";

import { getPageById, listDepartments, listPagesForAdmin } from "@/actions/pages";
import { PageForm } from "@/components/admin/page-form";
import { requireAdminSession } from "@/lib/auth/session";
import { buildAdminParentPageOptions } from "@/lib/pages/resolve-public-path";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [page, departments, allPages] = await Promise.all([
    getPageById(id),
    listDepartments(),
    listPagesForAdmin(),
  ]);

  if (!page) notFound();

  const parentPages = buildAdminParentPageOptions(allPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Edit page</h1>
        <p className="text-sm text-slate-500">/{page.slug}</p>
      </div>
      <PageForm departments={departments} parentPages={parentPages} page={page} />
    </div>
  );
}
