"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCircularAction, updateCircularAction } from "@/actions/circulars";
import type { Circular } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";

interface Department {
  id: string;
  name_en: string;
}

export function CircularForm({
  departments,
  circular,
}: {
  departments: Department[];
  circular?: Circular;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removeFile, setRemoveFile] = useState(false);

  const fileUrl = circular?.file_path ? getStoredFileUrl(circular.file_path) : null;

  function handleSubmit(formData: FormData) {
    setError(null);
    if (removeFile) formData.set("removeFile", "on");

    startTransition(async () => {
      if (circular) {
        const result = await updateCircularAction(circular.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/circulars/${circular.id}`);
      } else {
        const result = await createCircularAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/circulars/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Circular number</span>
        <input
          name="circularNumber"
          defaultValue={circular?.circular_number ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (English)</span>
        <input
          name="titleEn"
          required
          defaultValue={circular?.title_en ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input
          name="titleHi"
          defaultValue={circular?.title_hi ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-hindi"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Department</span>
        <select
          name="departmentId"
          defaultValue={circular?.department_id ?? ""}
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
          defaultValue={circular?.status ?? "draft"}
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
          PDF document {!circular && <span className="text-red-600">*</span>}
        </span>
        {fileUrl && !removeFile && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-emerald-700 hover:underline"
          >
            {circular?.file_name ?? "Current file"}
          </a>
        )}
        {circular && fileUrl && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={removeFile}
              onChange={(e) => setRemoveFile(e.target.checked)}
            />
            Replace current file
          </label>
        )}
        {(!circular || removeFile) && (
          <input
            name="file"
            type="file"
            accept="application/pdf,.doc,.docx,image/*"
            required={!circular}
            className="block w-full text-sm"
          />
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : circular ? "Save circular" : "Create circular"}
        </button>
        <Link
          href="/admin/circulars"
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
