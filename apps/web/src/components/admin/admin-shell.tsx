import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminNavAccess } from "@/lib/auth/admin-nav-access";
import { getAllowedCmsModulesForSession } from "@/lib/auth/cms-module-access-server";
import type { AdminSession } from "@/lib/auth/session";

export async function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  const allowedCmsModules = await getAllowedCmsModulesForSession(session);
  const access = getAdminNavAccess(session, allowedCmsModules);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <a href="#admin-main-content" className="skip-link">
        Skip to admin content
      </a>
      <AdminSidebar
        access={access}
        collegeName={
          session.collegeAssignment?.collegeName ??
          session.departmentPageAssignment?.departmentTitle
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader session={session} />
        <main id="admin-main-content" className="flex-1 p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
