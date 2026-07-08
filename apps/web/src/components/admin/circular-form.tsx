"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCircularAction, updateCircularAction } from "@/actions/circulars";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import type { Circular } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";

interface Department {
  id: string;
  name_en: string;
}

export function CircularForm({
  departments,
  circular,
  canEdit = true,
}: {
  departments: Department[];
  circular?: Circular;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasFile = Boolean(circular?.file_path);
  const fileUrl = hasFile ? getStoredFileUrl(circular!.file_path!) : null;
  const showUpload = canEdit;

  function handleSubmit(formData: FormData) {
    setError(null);

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
    <form
      action={canEdit ? handleSubmit : undefined}
      encType="multipart/form-data"
      className="max-w-2xl space-y-5"
    >
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!canEdit && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          View-only access — you cannot edit or save this circular.
        </p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Circular number</span>
        <input
          name="circularNumber"
          defaultValue={circular?.circular_number ?? ""}
          disabled={!canEdit}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (English)</span>
        <input
          name="titleEn"
          required={canEdit}
          defaultValue={circular?.title_en ?? ""}
          disabled={!canEdit}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input
          name="titleHi"
          defaultValue={circular?.title_hi ?? ""}
          disabled={!canEdit}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-hindi disabled:bg-slate-50"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Department</span>
        <select
          name="departmentId"
          defaultValue={circular?.department_id ?? ""}
          disabled={!canEdit}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
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
          disabled={!canEdit}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
        >
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium text-slate-700">
            PDF document {!circular && !hasFile && <span className="text-red-600">*</span>}
          </span>
          <p className="mt-0.5 text-xs text-slate-500">
            Official circular or office order for public download.
          </p>
        </div>

        {hasFile && (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-100 text-[10px] font-bold uppercase text-rose-700">
              PDF
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{circular?.file_name ?? "Current file"}</p>
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  View document
                </a>
              ) : (
                <p className="text-xs text-slate-500">Document attached</p>
              )}
            </div>
          </div>
        )}

        {canEdit && !hasFile && (
          <p className="text-xs text-amber-800">No document attached yet — upload a PDF below.</p>
        )}

        {showUpload && (
          <AdminFileUploadField
            name="file"
            accept="application/pdf,.doc,.docx,image/*"
            required={!circular}
            label={hasFile ? "Replace circular document" : "Upload circular document"}
            hint="Accepted: PDF, Word (.doc, .docx), or image (JPG, PNG)"
          />
        )}
      </div>

      <div className="flex gap-3">
        {canEdit && (
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : circular ? "Save circular" : "Create circular"}
        </button>
        )}
        <Link
          href="/admin/circulars"
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          {canEdit ? "Cancel" : "Back to list"}
        </Link>
      </div>
    </form>
  );
}
