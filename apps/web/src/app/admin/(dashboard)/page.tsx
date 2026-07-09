import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminDashboardData } from "@/lib/data/admin-dashboard";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData(session);

  return <AdminDashboardView session={session} data={data} />;
}
