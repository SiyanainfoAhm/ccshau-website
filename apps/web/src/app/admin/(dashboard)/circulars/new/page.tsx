import Link from "next/link";

import { listCircularCategoriesForAdmin, listDepartments } from "@/actions/circulars";
import { CircularForm } from "@/components/admin/circular-form";
import { CONTENT_EDIT_ROLES, canPublishContent } from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function AdminNewCircularPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdminWithRolesOrRedirect([...CONTENT_EDIT_ROLES]);
  const [departments, categories] = await Promise.all([
    listDepartments(),
    listCircularCategoriesForAdmin(),
  ]);
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/circulars" className="text-sm text-emerald-700 hover:underline">
          ← All circulars
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New circular</h1>
      </div>
      <CircularForm
        departments={departments}
        categories={categories}
        canPublish={canPublishContent(session)}
        initialSuccess={params.saved === "1" ? "Circular created successfully." : null}
      />
    </div>
  );
}
