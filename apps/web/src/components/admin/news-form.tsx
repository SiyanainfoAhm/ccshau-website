"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createNewsAction, updateNewsAction } from "@/actions/news";
import { AttachmentList, useAttachmentRemovals } from "@/components/admin/attachment-list";
import type { NewsItem } from "@/lib/database/types";
import { NEWS_CATEGORIES } from "@/lib/validations/news";
import { slugify } from "@/lib/utils/slug";

interface Department {
  id: string;
  slug: string;
  name_en: string;
}

export function NewsForm({
  departments,
  news,
}: {
  departments: Department[];
  news?: NewsItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(news?.title_en ?? "");
  const [slug, setSlug] = useState(news?.slug ?? "");
  const { removed, remove, removedJson } = useAttachmentRemovals(news?.attachment_paths ?? []);

  function handleTitleBlur() {
    if (!news && titleEn && !slug) {
      setSlug(slugify(titleEn));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("removedAttachments", removedJson);

    startTransition(async () => {
      const result = news
        ? await updateNewsAction(news.id, formData)
        : await createNewsAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(news ? `/admin/news/${news.id}` : `/admin/news/${result.data.id}`);
      router.refresh();
    });
  }

  const expiresValue = news?.expires_at
    ? new Date(news.expires_at).toISOString().slice(0, 16)
    : "";

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">News content</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Title (English)</label>
            <input
              name="titleEn"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Title (Hindi)</label>
            <input
              name="titleHi"
              defaultValue={news?.title_hi ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">URL slug</label>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              name="noticeType"
              defaultValue={news?.notice_type ?? "news"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="news">News</option>
              <option value="notice">Notice</option>
              <option value="corrigendum">Corrigendum</option>
              <option value="cancellation">Cancellation</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              name="category"
              defaultValue={news?.category ?? "general"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {NEWS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Body (English)</label>
            <textarea
              name="bodyEn"
              rows={8}
              defaultValue={news?.body_en ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Body (Hindi)</label>
            <textarea
              name="bodyHi"
              rows={8}
              defaultValue={news?.body_hi ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Attachments</h2>
        <p className="mb-3 text-sm text-slate-500">PDF or images (max 25 MB PDF / 5 MB image)</p>

        {news?.attachment_paths && news.attachment_paths.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Current files</p>
            <AttachmentList
              attachments={news.attachment_paths}
              removed={removed}
              onRemove={remove}
            />
          </div>
        )}

        <input
          type="file"
          name="attachments"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,application/pdf,image/*"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Publishing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select
              name="departmentId"
              defaultValue={news?.department_id ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              name="status"
              defaultValue={news?.status ?? "draft"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Expires at (optional)</label>
            <input
              type="datetime-local"
              name="expiresAt"
              defaultValue={expiresValue}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={news?.is_featured ?? false}
                className="rounded border-slate-300"
              />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isPinned"
                defaultChecked={news?.is_pinned ?? false}
                className="rounded border-slate-300"
              />
              Pin to top of listing
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-60"
        >
          {isPending ? "Saving…" : news ? "Update news" : "Create news"}
        </button>
        <Link href="/admin/news" className="text-sm text-slate-600 hover:text-emerald-800">
          Cancel
        </Link>
      </div>
    </form>
  );
}
