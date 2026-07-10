"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDownloadAction, updateDownloadAction } from "@/actions/downloads";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import type { Download } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { DOWNLOAD_CATEGORIES } from "@/lib/validations/downloads";

interface Department {
  id: string;
  name_en: string;
}

export function DownloadForm({
  departments,
  download,
}: {
  departments: Department[];
  download?: Download;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(download?.is_public ?? true);

  const hasFile = Boolean(download?.file_path && download.file_path !== "pending");
  const fileUrl = hasFile ? getStoredFileUrl(download!.file_path!) : null;
  const expiresValue = download?.expires_at
    ? new Date(download.expires_at).toISOString().slice(0, 16)
    : "";

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("isPublic", isPublic ? "true" : "false");

    startTransition(async () => {
      if (download) {
        const result = await updateDownloadAction(download.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/downloads/${download.id}`);
      } else {
        const result = await createDownloadAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/downloads/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (English)</span>
        <input
          name="titleEn"
          required
          defaultValue={download?.title_en ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input
          name="titleHi"
          defaultValue={download?.title_hi ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-hindi"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select
            name="category"
            defaultValue={download?.category ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 capitalize"
          >
            <option value="">Uncategorized</option>
            {DOWNLOAD_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Version label</span>
          <input
            name="version"
            defaultValue={download?.version ?? ""}
            placeholder="e.g. 2026"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Tags</span>
        <input
          name="tags"
          defaultValue={download?.tags?.join(", ") ?? ""}
          placeholder="admission, form, ug (comma-separated)"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-500">Used for search and public tag filters.</p>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Department</span>
        <select
          name="departmentId"
          defaultValue={download?.department_id ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        >
          <option value="">Unassigned</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_en}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Workflow status</span>
          <select
            name="status"
            defaultValue={download?.status ?? "draft"}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="draft">Draft</option>
            <option value="pending_review">Pending review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Expiry date</span>
          <input
            type="datetime-local"
            name="expiresAt"
            defaultValue={expiresValue}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">Auto-archived after this date.</p>
        </label>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Public visibility</legend>
        <label className="mt-2 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-slate-900">Public document</span>
            <span className="mt-0.5 block text-slate-600">
              When published, anyone can find and download this file on the public downloads page.
              Uncheck for admin-only internal documents.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">
          File {!download && <span className="text-red-600">*</span>}
        </span>
        {hasFile && (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-bold uppercase text-emerald-800">
              FILE
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{download?.file_name}</p>
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  View document
                </a>
              ) : null}
            </div>
          </div>
        )}
        {!hasFile && (
          <p className="text-xs text-amber-800">No file attached yet — upload below.</p>
        )}
        <AdminFileUploadField
          name="file"
          required={!download}
          accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
          label={hasFile ? "Replace download file" : "Upload download file"}
          hint="PDF, Word, or Excel — max 25 MB"
        />
        {hasFile && (
          <p className="text-xs text-slate-500">
            Replacing the file keeps the previous version in version history.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : download ? "Save download" : "Create download"}
        </button>
        <Link
          href="/admin/downloads"
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
