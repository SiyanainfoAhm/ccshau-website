import Link from "next/link";

import { AzureUploadForm } from "@/components/admin/azure-upload-form";
import { SETTINGS_ACCESS_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminWithRoles } from "@/lib/auth/session";

export default async function AzureUploadPage() {
  await requireAdminWithRoles([...SETTINGS_ACCESS_ROLES]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-emerald-700 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
          Upload to Azure
        </h1>
        <p className="text-sm text-slate-500">
          Upload a public image or document and copy its Azure link.
        </p>
      </div>

      <AzureUploadForm />
    </div>
  );
}
