"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDownloadAction, updateDownloadAction } from "@/actions/downloads";
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
  const [removeFile, setRemoveFile] = useState(false);

  const fileUrl =
    download?.file_path && download.file_path !== "pending"
      ? getStoredFileUrl(download.file_path)
      : null;

  function handleSubmit(formData: FormData) {
    setError(null);
    if (removeFile) formData.set("removeFile", "on");

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
          <span className="font-medium text-slate-700">Version</span>
          <input
            name="version"
            defaultValue={download?.version ?? ""}
            placeholder="e.g. 2026"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

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

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Status</span>
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

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">
          File {!download && <span className="text-red-600">*</span>}
        </span>
        {fileUrl && !removeFile && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-emerald-700 hover:underline"
          >
            {download?.file_name}
          </a>
        )}
        {download && fileUrl && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={removeFile}
              onChange={(e) => setRemoveFile(e.target.checked)}
            />
            Replace current file
          </label>
        )}
        {(!download || removeFile) && (
          <input name="file" type="file" required={!download} className="block w-full text-sm" />
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
