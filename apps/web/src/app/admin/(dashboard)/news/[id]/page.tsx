import { notFound } from "next/navigation";

import { getNewsById, listDepartments } from "@/actions/news";
import { ContentReviewPanel } from "@/components/admin/content-review-panel";
import { NewsForm } from "@/components/admin/news-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import {
  canEditContent,
  canPublishContent,
  CMS_READ_ROLES,
} from "@/lib/auth/cms-roles";
import { requireAdminWithRolesOrRedirect } from "@/lib/auth/session";

export default async function EditNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdminWithRolesOrRedirect([...CMS_READ_ROLES]);
  const { id } = await params;
  const { saved } = await searchParams;
  const [news, departments] = await Promise.all([getNewsById(id), listDepartments()]);

  if (!news) notFound();

  const canEdit = canEditContent(session);
  const showReview =
    news.status === "pending_review" && canPublishContent(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {canEdit ? "Edit news" : "Review news"}
        </h1>
        <p className="text-sm text-slate-500">/{news.slug}</p>
      </div>

      {showReview ? (
        <ContentReviewPanel entityType="news" entityId={id} title={news.title_en} />
      ) : null}

      {canEdit ? (
        <NewsForm
          departments={departments}
          news={news}
          canPublish={canPublishContent(session)}
          initialSuccess={saved === "1" ? "News created successfully." : null}
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{news.title_en}</h2>
            <StatusBadge status={news.status} />
          </div>
          {news.body_en ? (
            <CmsHtmlContent html={news.body_en} className="prose prose-slate max-w-none text-sm" />
          ) : (
            <p className="text-sm text-slate-500">No body content.</p>
          )}
        </div>
      )}
    </div>
  );
}
