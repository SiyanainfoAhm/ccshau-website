import { AdminReportsView } from "@/components/admin/admin-reports-view";
import { CMS_READ_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";
import { getAdminReportsData } from "@/lib/data/admin-reports";

export default async function AdminReportsPage() {
  const session = await requireAdminWithRolesOrRedirect([...CMS_READ_ROLES]);
  const data = await getAdminReportsData(session);

  return <AdminReportsView data={data} />;
}
