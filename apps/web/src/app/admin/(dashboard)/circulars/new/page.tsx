import Link from "next/link";

import { listDepartments } from "@/actions/circulars";
import { CircularForm } from "@/components/admin/circular-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewCircularPage() {
  await requireAdminSession();
  const departments = await listDepartments();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/circulars" className="text-sm text-emerald-700 hover:underline">
          ← All circulars
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New circular</h1>
      </div>
      <CircularForm departments={departments} />
    </div>
  );
}
