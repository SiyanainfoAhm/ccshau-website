import Link from "next/link";

import { RelatedLinkForm } from "@/components/admin/related-link-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminNewRelatedLinkPage() {
  await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/related-links" className="text-sm text-emerald-700 hover:underline">
          ← All related links
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">New related link</h1>
      </div>
      <RelatedLinkForm />
    </div>
  );
}
