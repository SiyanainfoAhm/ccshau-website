import { redirect } from "next/navigation";

import { isFacultyOnlyUser } from "@/lib/auth/faculty-scope";
import { requireAdminSession } from "@/lib/auth/session";

/** Legacy URL — CMS password change is under Settings. */
export default async function AccountChangePasswordPage() {
  const session = await requireAdminSession();

  if (isFacultyOnlyUser(session)) {
    redirect("/admin/register/faculty/change-password");
  }

  redirect("/admin/settings/change-password");
}
