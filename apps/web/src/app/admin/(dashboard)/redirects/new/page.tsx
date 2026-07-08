import Link from "next/link";

import { RedirectForm } from "@/components/admin/redirect-form";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function AdminNewRedirectPage() {
  await requireAdminWithRolesOrRedirect(["super_admin", "dept_admin"]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/redirects" className="text-sm text-emerald-700 hover:underline">
          ← All redirects
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New redirect</h1>
      </div>
      <RedirectForm />
    </div>
  );
}
