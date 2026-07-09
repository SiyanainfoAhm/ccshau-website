import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminNavAccess } from "@/lib/auth/admin-nav-access";
import type { AdminSession } from "@/lib/auth/session";

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  const access = getAdminNavAccess(session);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <a href="#admin-main-content" className="skip-link">
        Skip to admin content
      </a>
      <AdminSidebar access={access} collegeName={session.collegeAssignment?.collegeName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader session={session} />
        <main id="admin-main-content" className="flex-1 p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
