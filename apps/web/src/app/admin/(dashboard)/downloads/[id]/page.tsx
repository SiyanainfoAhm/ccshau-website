import Link from "next/link";
import { notFound } from "next/navigation";

import { getDownloadById, listDepartments } from "@/actions/downloads";
import { DeleteDownloadButton } from "@/components/admin/delete-download-button";
import { DownloadForm } from "@/components/admin/download-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const [download, departments] = await Promise.all([
    getDownloadById(id),
    listDepartments(),
  ]);
  if (!download) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/downloads" className="text-sm text-emerald-700 hover:underline">
            ← All downloads
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit download</h1>
        </div>
        <DeleteDownloadButton downloadId={download.id} />
      </div>
      <DownloadForm departments={departments} download={download} />
    </div>
  );
}
