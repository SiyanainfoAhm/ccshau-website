import type { Metadata } from "next";
import { headers } from "next/headers";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPathOrRedirect } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-admin-pathname") ?? "/admin";
  const { session, access } = await requireAdminPathOrRedirect(pathname);

  return (
    <AdminShell session={session} access={access}>
      {children}
    </AdminShell>
  );
}
