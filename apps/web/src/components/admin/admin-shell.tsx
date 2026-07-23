"use client";

import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { AdminNavAccess } from "@/lib/auth/admin-nav-access";
import type { AdminSession } from "@/lib/auth/session";

/**
 * Client shell so sidebar/header identity stays stable across soft navigations.
 * Layout still re-runs auth on the server; only the main children slot suspends.
 */
export function AdminShell({
  session,
  access,
  children,
}: {
  session: AdminSession;
  access: AdminNavAccess;
  children: ReactNode;
}) {
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
