import Link from "next/link";

import { listDepartments } from "@/actions/downloads";
import { DownloadForm } from "@/components/admin/download-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewDownloadPage() {
  await requireAdminSession();
  const departments = await listDepartments();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/downloads" className="text-sm text-emerald-700 hover:underline">
          ← All downloads
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New download</h1>
      </div>
      <DownloadForm departments={departments} />
    </div>
  );
}
