"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createTenderAction, updateTenderAction } from "@/actions/tenders";
import { AttachmentList, useAttachmentRemovals } from "@/components/admin/attachment-list";
import type { Tender } from "@/lib/database/types";
import { TENDER_CATEGORIES } from "@/lib/validations/tenders";
import { slugify } from "@/lib/utils/slug";

interface Department {
  id: string;
  slug: string;
  name_en: string;
}

export function TenderForm({
  departments,
  tender,
}: {
  departments: Department[];
  tender?: Tender;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(tender?.title_en ?? "");
  const [slug, setSlug] = useState(tender?.slug ?? "");
  const { removed, remove, removedJson } = useAttachmentRemovals(tender?.document_paths ?? []);

  function handleTitleBlur() {
    if (!tender && titleEn && !slug) {
      setSlug(slugify(titleEn));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("removedDocuments", removedJson);

    startTransition(async () => {
      const result = tender
        ? await updateTenderAction(tender.id, formData)
        : await createTenderAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(tender ? `/admin/tenders/${tender.id}` : `/admin/tenders/${result.data.id}`);
      router.refresh();
    });
  }

  const closingValue = tender?.closing_date
    ? new Date(tender.closing_date).toISOString().slice(0, 16)
    : "";

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tender details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tender number</label>
            <input
              name="tenderNumber"
              defaultValue={tender?.tender_number ?? ""}
              placeholder="e.g. TND/2026/001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              name="category"
              defaultValue={tender?.category ?? "goods"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {TENDER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
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
              defaultValue={tender?.title_hi ?? ""}
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
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description (English)</label>
            <textarea
              name="descriptionEn"
              rows={6}
              defaultValue={tender?.description_en ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description (Hindi)</label>
            <textarea
              name="descriptionHi"
              rows={6}
              defaultValue={tender?.description_hi ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tender documents</h2>
        <p className="mb-3 text-sm text-slate-500">PDF or images — main tender notice, BOQ, etc.</p>

        {tender?.document_paths && tender.document_paths.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Current documents</p>
            <AttachmentList
              attachments={tender.document_paths}
              removed={removed}
              onRemove={remove}
            />
          </div>
        )}

        <input
          type="file"
          name="documents"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
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
              defaultValue={tender?.department_id ?? ""}
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
              defaultValue={tender?.status ?? "draft"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="draft">Draft</option>
              <option value="open">Open (live)</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Closing date</label>
            <input
              type="datetime-local"
              name="closingDate"
              defaultValue={closingValue}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-60"
        >
          {isPending ? "Saving…" : tender ? "Update tender" : "Create tender"}
        </button>
        <Link href="/admin/tenders" className="text-sm text-slate-600 hover:text-emerald-800">
          Cancel
        </Link>
      </div>
    </form>
  );
}
