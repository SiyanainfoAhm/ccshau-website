"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { createTenderAction, updateTenderAction } from "@/actions/tenders";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import { AttachmentList, useAttachmentRemovals } from "@/components/admin/attachment-list";
import type { Tender } from "@/lib/database/types";
import { tenderStatusOptions } from "@/lib/auth/tender-status-options";
import { getStoredFileUrl } from "@/lib/storage/urls";
import { TENDER_CATEGORIES } from "@/lib/validations/tenders";
import { slugify } from "@/lib/utils/slug";
import { useModalA11y } from "@/lib/a11y/use-modal-a11y";
import { TENDER_STATUS_OPTIONS } from "@/lib/auth/tender-status-options";

interface Department {
  id: string;
  slug: string;
  name_en: string;
}

export function TenderForm({
  departments,
  tender,
  canPublish = true,
}: {
  departments: Department[];
  tender?: Tender;
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(tender?.title_en ?? "");
  const [titleHi, setTitleHi] = useState(tender?.title_hi ?? "");
  const [descriptionEn, setDescriptionEn] = useState(tender?.description_en ?? "");
  const [descriptionHi, setDescriptionHi] = useState(tender?.description_hi ?? "");
  const [cancellationNoticeEn, setCancellationNoticeEn] = useState(tender?.cancellation_notice_en ?? "");
  const [cancellationNoticeHi, setCancellationNoticeHi] = useState(tender?.cancellation_notice_hi ?? "");
  const [slug, setSlug] = useState(tender?.slug ?? "");
  const [status, setStatus] = useState(tender?.status ?? (canPublish ? "open" : "draft"));
  const [savedTender, setSavedTender] = useState<{ id: string; status: Tender["status"] } | null>(null);
  const successPanelRef = useRef<HTMLDivElement>(null);
  const closeSuccess = useCallback(() => {
    if (!savedTender) return;
    setSavedTender(null);
    router.push(`/admin/tenders/${savedTender.id}`);
    router.refresh();
  }, [savedTender, router]);
  useModalA11y({ open: Boolean(savedTender), onClose: closeSuccess, panelRef: successPanelRef });
  const [removeCancellationDoc, setRemoveCancellationDoc] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const { removed, remove, removedJson } = useAttachmentRemovals(tender?.document_paths ?? []);

  function handleTitleBlur() {
    if (!tender && titleEn && !slug) {
      setSlug(slugify(titleEn));
    }
  }

  async function handleAutoTranslate() {
    setError(null);
    setIsTranslating(true);
    try {
      const result = await translateFieldsEnToHiAction([
        { key: "titleHi", text: titleEn },
        { key: "descriptionHi", text: descriptionEn },
        { key: "cancellationNoticeHi", text: cancellationNoticeEn },
      ]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const translated = result.data.translations;
      if (translated.titleHi) setTitleHi(translated.titleHi);
      if (translated.descriptionHi) setDescriptionHi(translated.descriptionHi);
      if (translated.cancellationNoticeHi) setCancellationNoticeHi(translated.cancellationNoticeHi);
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

  function handleSubmit(formData: FormData) {
    if (savedTender || isPending) return;
    setError(null);
    const submittedStatus = formData.get("status") as Tender["status"];
    formData.set("removedDocuments", removedJson);
    formData.set("removeCancellationDocument", removeCancellationDoc ? "true" : "false");

    startTransition(async () => {
      const result = tender
        ? await updateTenderAction(tender.id, formData)
        : await createTenderAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSavedTender({ id: result.data.id, status: submittedStatus });
    });
  }

  const publishedValue = tender?.published_at
    ? new Date(tender.published_at).toISOString().slice(0, 16)
    : "";
  const closingValue = tender?.closing_date
    ? new Date(tender.closing_date).toISOString().slice(0, 16)
    : "";
  const cancellationDocUrl = tender?.cancellation_document_path
    ? getStoredFileUrl(tender.cancellation_document_path)
    : null;

  const statusOptions = tenderStatusOptions(canPublish);

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {savedTender && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div ref={successPanelRef} role="dialog" aria-modal="true" aria-labelledby="tender-success-title" aria-describedby="tender-success-message" tabIndex={-1} className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl outline-none">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" aria-hidden />
            <h2 id="tender-success-title" className="text-xl font-semibold text-slate-900">Tender {tender ? "updated" : "created"} successfully</h2>
            <p id="tender-success-message" className="mt-3 text-sm text-slate-700">
              {savedTender.status === "open"
                ? "Your tender was published successfully."
                : `Your tender was saved as ${TENDER_STATUS_OPTIONS.find((option) => option.value === savedTender.status)?.label ?? savedTender.status} successfully.`}
            </p>
            <button type="button" onClick={closeSuccess} className="mt-5 rounded-lg bg-emerald-800 px-6 py-2 font-semibold text-white hover:bg-emerald-700">OK</button>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Tender details</h2>
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
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description (English)</label>
            <textarea
              name="descriptionEn"
              rows={6}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description (Hindi)</label>
            <textarea
              name="descriptionHi"
              rows={6}
              value={descriptionHi}
              onChange={(e) => setDescriptionHi(e.target.value)}
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

        <AdminFileUploadField
          name="documents"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
          label="Upload tender documents"
          hint="PDF or images — notice, BOQ, etc."
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
              value={status}
              onChange={(e) => setStatus(e.target.value as Tender["status"])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Publish date</label>
            <input
              type="datetime-local"
              name="publishedAt"
              defaultValue={publishedValue}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">Leave blank to use the current time when first published.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Closing date</label>
            <input
              type="datetime-local"
              name="closingDate"
              defaultValue={closingValue}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Display order</label>
            <input
              type="number"
              name="sortOrder"
              min={0}
              step={1}
              defaultValue={tender?.sort_order ?? 0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">Lower numbers appear first.</p>
          </div>
        </div>
      </div>

      {(status === "cancelled" || tender?.status === "cancelled") && (
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Cancellation notice</h2>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notice (English)</label>
              <textarea
                name="cancellationNoticeEn"
                rows={4}
                value={cancellationNoticeEn}
                onChange={(e) => setCancellationNoticeEn(e.target.value)}
                placeholder="Official cancellation notice text…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notice (Hindi)</label>
              <textarea
                name="cancellationNoticeHi"
                rows={4}
                value={cancellationNoticeHi}
                onChange={(e) => setCancellationNoticeHi(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
              />
            </div>
            {cancellationDocUrl && tender?.cancellation_document_name && !removeCancellationDoc && (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-medium text-slate-700">Current cancellation document</p>
                <a
                  href={cancellationDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-emerald-800 underline"
                >
                  {tender.cancellation_document_name}
                </a>
                <button
                  type="button"
                  onClick={() => setRemoveCancellationDoc(true)}
                  className="ml-4 text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
            {removeCancellationDoc && (
              <p className="text-sm text-amber-800">Cancellation document will be removed on save.</p>
            )}
            <AdminFileUploadField
              name="cancellationDocument"
              accept=".pdf,.doc,.docx,application/pdf"
              label="Upload cancellation document"
              hint="PDF or Word document (optional)"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || Boolean(savedTender)}
          className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
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
