import { redirect } from "next/navigation";

import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { isFacultyOnlyUser } from "@/lib/auth/faculty-scope";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminDashboardData } from "@/lib/data/admin-dashboard";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  if (isFacultyOnlyUser(session)) {
    redirect("/admin/register/faculty/me");
  }
  const data = await getAdminDashboardData(session);

  return <AdminDashboardView session={session} data={data} />;
}
