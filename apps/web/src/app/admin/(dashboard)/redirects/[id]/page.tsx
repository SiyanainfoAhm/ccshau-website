import Link from "next/link";
import { notFound } from "next/navigation";

import { getRedirectById } from "@/actions/redirects";
import { DeleteRedirectButton } from "@/components/admin/delete-redirect-button";
import { RedirectForm } from "@/components/admin/redirect-form";
import { requireAdminWithRoles } from "@/lib/auth/session";

export default async function AdminEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminWithRoles(["super_admin", "dept_admin"]);
  const { id } = await params;
  const redirect = await getRedirectById(id);
  if (!redirect) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/redirects" className="text-sm text-emerald-700 hover:underline">
            ← All redirects
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit redirect</h1>
          <p className="font-mono text-sm text-slate-500">{redirect.legacy_path}</p>
        </div>
        <DeleteRedirectButton redirectId={redirect.id} />
      </div>
      <RedirectForm redirect={redirect} />
    </div>
  );
}
