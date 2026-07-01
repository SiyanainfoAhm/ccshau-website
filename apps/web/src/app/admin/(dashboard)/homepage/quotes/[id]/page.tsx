import { notFound } from "next/navigation";

import { getHomepageQuoteById } from "@/actions/homepage";
import { DeleteHomepageQuoteButton, HomepageQuoteForm } from "@/components/admin/homepage-forms";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminEditHomepageQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const quote = await getHomepageQuoteById(id);
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Edit quote</h1>
        <DeleteHomepageQuoteButton id={quote.id} />
      </div>
      <HomepageQuoteForm quote={quote} />
    </div>
  );
}
