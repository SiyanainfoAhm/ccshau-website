import Link from "next/link";
import { notFound } from "next/navigation";

import { getCircularById, listDepartments } from "@/actions/circulars";
import { CircularForm } from "@/components/admin/circular-form";
import { DeleteCircularButton } from "@/components/admin/delete-circular-button";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditCircularPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const [circular, departments] = await Promise.all([
    getCircularById(id),
    listDepartments(),
  ]);
  if (!circular) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/circulars" className="text-sm text-emerald-700 hover:underline">
            ← All circulars
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Edit circular</h1>
        </div>
        <DeleteCircularButton circularId={circular.id} />
      </div>
      <CircularForm departments={departments} circular={circular} />
    </div>
  );
}
