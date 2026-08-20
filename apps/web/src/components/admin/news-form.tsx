"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createNewsAction, updateNewsAction } from "@/actions/news";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import { AdminHtmlField } from "@/components/admin/admin-html-field";
import { AttachmentList, useAttachmentRemovals } from "@/components/admin/attachment-list";
import type { NewsItem } from "@/lib/database/types";
import { contentStatusOptions } from "@/lib/auth/content-status-options";
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
  canPublish = true,
  initialSuccess = null,
}: {
  departments: Department[];
  news?: NewsItem;
  canPublish?: boolean;
  /** Shown once after create redirect (?saved=1). */
  initialSuccess?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(initialSuccess);
  const [titleEn, setTitleEn] = useState(news?.title_en ?? "");
  const [titleHi, setTitleHi] = useState(news?.title_hi ?? "");
  const [slug, setSlug] = useState(news?.slug ?? "");
  const [bodyEn, setBodyEn] = useState(news?.body_en ?? "");
  const [bodyHi, setBodyHi] = useState(news?.body_hi ?? "");
  const [isTranslating, setIsTranslating] = useState(false);
  const { removed, remove, removedJson } = useAttachmentRemovals(news?.attachment_paths ?? []);

  async function handleAutoTranslate() {
    setError(null);
    setSuccess(null);
    setIsTranslating(true);
    try {
      const result = await translateFieldsEnToHiAction([
        { key: "titleHi", text: titleEn },
        { key: "bodyHi", text: bodyEn, format: "html" },
      ]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const translated = result.data.translations;
      if (translated.titleHi) setTitleHi(translated.titleHi);
      if (translated.bodyHi) setBodyHi(translated.bodyHi);
      if (result.data.warnings.length > 0) {
        setError(result.data.warnings.join(" "));
      } else if (Object.keys(translated).length === 0) {
        setError("Nothing was translated. Enter English text first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  }

  function handleTitleBlur() {
    if (!news && titleEn && !slug) {
      setSlug(slugify(titleEn));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    formData.set("removedAttachments", removedJson);

    startTransition(async () => {
      const result = news
        ? await updateNewsAction(news.id, formData)
        : await createNewsAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (news) {
        setSuccess("News updated successfully.");
        router.refresh();
        return;
      }

      router.push(`/admin/news/${result.data.id}?saved=1`);
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

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">News content</h2>
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={isPending || isTranslating}
            className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
          </button>
        </div>
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
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
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
            <AdminHtmlField
              name="bodyEn"
              label="Body (English)"
              value={bodyEn}
              onChange={setBodyEn}
              rows={12}
            />
          </div>
          <div className="md:col-span-2">
            <AdminHtmlField
              name="bodyHi"
              label="Body (Hindi)"
              value={bodyHi}
              onChange={setBodyHi}
              rows={8}
              hindi
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

        <AdminFileUploadField
          name="attachments"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,application/pdf,image/*"
          label="Upload attachments"
          hint="PDF or images — max 25 MB PDF / 5 MB image"
          chooseLabel="Choose files"
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
              {contentStatusOptions(canPublish).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
          className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
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
