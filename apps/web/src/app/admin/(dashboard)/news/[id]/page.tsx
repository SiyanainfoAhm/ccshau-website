import { notFound } from "next/navigation";

import { getNewsById, listDepartments } from "@/actions/news";
import { NewsForm } from "@/components/admin/news-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [news, departments] = await Promise.all([getNewsById(id), listDepartments()]);

  if (!news) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Edit news</h1>
        <p className="text-sm text-slate-500">/{news.slug}</p>
      </div>
      <NewsForm departments={departments} news={news} />
    </div>
  );
}
