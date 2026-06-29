import Link from "next/link";

import { getSecuritySettingsForAdmin } from "@/actions/settings";
import { SecuritySettingsForm } from "@/components/admin/security-settings-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();
  const isSuperAdmin = session.roles.some((r) => r.role === "super_admin");
  const isDeptAdmin = session.roles.some((r) => r.role === "dept_admin");
  const securitySettings = isSuperAdmin ? await getSecuritySettingsForAdmin() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">System configuration and administration tools</p>
      </div>

      {isSuperAdmin && securitySettings && (
        <SecuritySettingsForm view={securitySettings} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/menus"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300"
        >
          <p className="font-semibold text-slate-900">Menu manager</p>
          <p className="mt-1 text-sm text-slate-500">Header, footer, and quick-link navigation</p>
        </Link>
        <Link
          href="/admin/related-links"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300"
        >
          <p className="font-semibold text-slate-900">Related links</p>
          <p className="mt-1 text-sm text-slate-500">Homepage partner and institutional links</p>
        </Link>
        {(isSuperAdmin || isDeptAdmin) && (
          <Link
            href="/admin/redirects"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300"
          >
            <p className="font-semibold text-slate-900">URL redirects</p>
            <p className="mt-1 text-sm text-slate-500">Legacy hau.ac.in paths → new routes</p>
          </Link>
        )}
        {isSuperAdmin && (
          <>
            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300"
            >
              <p className="font-semibold text-slate-900">Users & roles</p>
              <p className="mt-1 text-sm text-slate-500">CMS accounts and RBAC assignments</p>
            </Link>
            <Link
              href="/admin/audit"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300"
            >
              <p className="font-semibold text-slate-900">Audit log</p>
              <p className="mt-1 text-sm text-slate-500">CMS and security activity (super admin)</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
