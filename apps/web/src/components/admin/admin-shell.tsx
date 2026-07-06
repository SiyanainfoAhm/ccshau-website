import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { isCollegeOnlyUser } from "@/lib/auth/college-scope";
import type { AdminSession } from "@/lib/auth/session";

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  const isSuperAdmin = session.roles.some((r) => r.role === "super_admin");
  const collegeOnly = isCollegeOnlyUser(session);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        isCollegeOnly={collegeOnly}
        collegeName={session.collegeAssignment?.collegeName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader session={session} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
