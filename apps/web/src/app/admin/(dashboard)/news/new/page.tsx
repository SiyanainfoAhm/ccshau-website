import { listDepartments } from "@/actions/news";
import { NewsForm } from "@/components/admin/news-form";
import { requireAdminSession } from "@/lib/auth/session";

export default async function NewNewsPage() {
  await requireAdminSession();
  const departments = await listDepartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">New news / notice</h1>
        <p className="text-sm text-slate-500">Create a bilingual news item with optional PDF attachments</p>
      </div>
      <NewsForm departments={departments} />
    </div>
  );
}
