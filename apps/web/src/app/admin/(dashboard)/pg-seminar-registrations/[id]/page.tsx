import { notFound, redirect } from "next/navigation";

import { getPgSeminarRegistrationById } from "@/actions/pg-seminar-registrations";
import { PgSeminarRegistrationDetailPanel } from "@/components/admin/pg-seminar-registration-detail-panel";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminPgSeminarRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  if (!session.roles.some((r) => r.role === "super_admin")) {
    redirect("/admin");
  }

  const { id } = await params;
  const registration = await getPgSeminarRegistrationById(id);
  if (!registration) notFound();

  return <PgSeminarRegistrationDetailPanel registration={registration} />;
}
