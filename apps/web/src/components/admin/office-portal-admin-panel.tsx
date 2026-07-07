"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createPageContactLineAction,
  createPageGalleryItemAction,
  createPageNewsTickerItemAction,
  createPageStudentCornerItemAction,
  createPageSidebarItemAction,
  createPageStaffAction,
  deletePageContactLineAction,
  deletePageGalleryItemAction,
  deletePageNewsTickerItemAction,
  deletePageStudentCornerItemAction,
  deletePageSidebarItemAction,
  deletePageStaffAction,
  updatePageSidebarItemAction,
} from "@/actions/office-portal";
import type {
  PageContactLine,
  PageGalleryItem,
  PageNewsTickerItem,
  PageStudentCornerItem,
  PageSidebarItem,
  PageStaff,
} from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { formatAdminDateTime, isExpiredAt } from "@/lib/utils/format-datetime";

function galleryImagePreview(path: string): string {
  return getStoredFileUrl(path) ?? path;
}

function DeleteButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete this ${label}?`)) return;
        startTransition(onConfirm);
      }}
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      Delete
    </button>
  );
}

function NewsTickerAddForm({
  pageId,
  defaultSortOrder,
  onSuccess,
  onError,
}: {
  pageId: string;
  defaultSortOrder: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        onError("");
        startTransition(async () => {
          const result = await createPageNewsTickerItemAction(pageId, new FormData(form));
          if (!result.success) {
            onError(result.error ?? "Save failed.");
            return;
          }
          onSuccess();
        });
      }}
    >
      <input
        name="titleEn"
        required
        placeholder="Headline (English)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name="titleHi"
        placeholder="Headline (Hindi)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi sm:col-span-2"
      />
      <input
        name="href"
        placeholder="Link URL (optional)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
        Expires at (optional)
        <input
          name="expiresAt"
          type="datetime-local"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
        File upload (optional)
        <input
          name="tickerFile"
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif"
          className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-900"
        />
        <span className="mt-1 block text-xs text-slate-500">
          PDF, Word, or image (max 25 MB). Used as the headline link when no URL is set.
        </span>
      </label>
      <input
        name="sortOrder"
        type="number"
        defaultValue={defaultSortOrder}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input name="isNew" type="checkbox" defaultChecked className="rounded border-slate-300" />
        Show &quot;NEW&quot; badge
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        {isPending ? "Adding…" : "Add news headline"}
      </button>
    </form>
  );
}

function StudentCornerAddForm({
  pageId,
  defaultSortOrder,
  onSuccess,
  onError,
}: {
  pageId: string;
  defaultSortOrder: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        onError("");
        startTransition(async () => {
          const result = await createPageStudentCornerItemAction(pageId, new FormData(form));
          if (!result.success) {
            onError(result.error ?? "Save failed.");
            return;
          }
          onSuccess();
        });
      }}
    >
      <input
        name="titleEn"
        required
        placeholder="Title (English)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name="titleHi"
        placeholder="Title (Hindi)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi sm:col-span-2"
      />
      <input
        name="href"
        placeholder="Link URL (optional)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
        Expires at (optional)
        <input
          name="expiresAt"
          type="datetime-local"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
        File upload (optional)
        <input
          name="cornerFile"
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif"
          className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-900"
        />
        <span className="mt-1 block text-xs text-slate-500">
          PDF, Word, or image (max 25 MB). Used as the link when no URL is set.
        </span>
      </label>
      <input
        name="sortOrder"
        type="number"
        defaultValue={defaultSortOrder}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input name="isNew" type="checkbox" defaultChecked className="rounded border-slate-300" />
        Show &quot;NEW&quot; badge
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        {isPending ? "Adding…" : "Add student corner item"}
      </button>
    </form>
  );
}

export function OfficePortalAdminPanel({
  pageId,
  contactLines,
  staff,
  galleryItems,
  newsTickerItems,
  studentCornerItems,
  sidebarItems,
  showContacts = true,
  showStaff = true,
  showGallery = true,
  showNewsTicker = true,
  showStudentCorner = true,
  showLeftSidebar = true,
  showRightSidebar = true,
}: {
  pageId: string;
  contactLines: PageContactLine[];
  staff: PageStaff[];
  galleryItems: PageGalleryItem[];
  newsTickerItems: PageNewsTickerItem[];
  studentCornerItems: PageStudentCornerItem[];
  sidebarItems: PageSidebarItem[];
  showContacts?: boolean;
  showStaff?: boolean;
  showGallery?: boolean;
  showNewsTicker?: boolean;
  showStudentCorner?: boolean;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newsTickerFormSeed, setNewsTickerFormSeed] = useState(0);
  const [studentCornerFormSeed, setStudentCornerFormSeed] = useState(0);

  const leftItems = sidebarItems.filter((item) => item.side === "left");
  const rightItems = sidebarItems.filter((item) => item.side === "right");

  function refresh() {
    router.refresh();
  }

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Save failed.");
        return;
      }
      refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {showContacts && (
        <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Contact lines</h2>
          <ul className="mt-4 space-y-2">
            {contactLines.map((line) => (
              <li
                key={line.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-800">{line.label_en}</p>
                  <p className="text-slate-600">{line.value_en}</p>
                </div>
                <DeleteButton
                  label="contact line"
                  onConfirm={async () => {
                    await deletePageContactLineAction(pageId, line.id);
                  }}
                />
              </li>
            ))}
          </ul>
          <form
            className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
            action={(formData) =>
              runAction(() => createPageContactLineAction(pageId, formData))
            }
          >
            <input name="labelEn" required placeholder="Label (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="labelHi" placeholder="Label (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
            <input name="valueEn" required placeholder="Value (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <input name="valueHi" placeholder="Value (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi sm:col-span-2" />
            <input name="sortOrder" type="number" defaultValue={contactLines.length + 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Add contact line
            </button>
          </form>
        </section>
      )}

      {showStaff && (
        <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Staff directory</h2>
          <ul className="mt-4 space-y-2">
            {staff.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-800">{row.name_en}</p>
                  <p className="text-slate-600">{row.designation_en}</p>
                </div>
                <DeleteButton
                  label="staff row"
                  onConfirm={async () => {
                    await deletePageStaffAction(pageId, row.id);
                  }}
                />
              </li>
            ))}
          </ul>
          <form
            className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
            action={(formData) => runAction(() => createPageStaffAction(pageId, formData))}
          >
            <input name="nameEn" required placeholder="Name (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="nameHi" placeholder="Name (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
            <input name="designationEn" required placeholder="Designation (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="designationHi" placeholder="Designation (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
            <input name="specializationEn" placeholder="Specialization (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="specializationHi" placeholder="Specialization (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
            <input name="imagePath" placeholder="Photo URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <input name="detailHref" placeholder="Details link URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <input name="sortOrder" type="number" defaultValue={staff.length + 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Add staff member
            </button>
          </form>
        </section>
      )}

      {showGallery && (
        <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Photo gallery</h2>
          <p className="mt-1 text-xs text-slate-500">
            Images appear in a zoomable grid on the public page when Photo gallery is enabled in
            Layout sections.
          </p>
          <ul className="mt-4 space-y-2">
            {galleryItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={galleryImagePreview(item.thumbnail_url ?? item.image_url)}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {item.title_en ?? `Image ${item.sort_order}`}
                    </p>
                    <p className="truncate text-xs text-slate-500">{item.image_url}</p>
                  </div>
                </div>
                <DeleteButton
                  label="gallery image"
                  onConfirm={async () => {
                    await deletePageGalleryItemAction(pageId, item.id);
                  }}
                />
              </li>
            ))}
          </ul>
          <form
            className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
            action={(formData) => runAction(() => createPageGalleryItemAction(pageId, formData))}
          >
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Upload image</span>
              <input
                name="galleryFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-slate-600"
              />
              <span className="mt-1 block text-xs text-slate-500">
                JPEG, PNG, WebP or GIF — max 5 MB
              </span>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">
                Thumbnail upload (optional)
              </span>
              <input
                name="thumbnailFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-slate-600"
              />
            </label>
            <p className="text-xs text-slate-500 sm:col-span-2">Or paste external URLs:</p>
            <input
              name="imageUrl"
              placeholder="Full image URL (if not uploading)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              name="thumbnailUrl"
              placeholder="Thumbnail URL (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              name="titleEn"
              placeholder="Caption (English)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="titleHi"
              placeholder="Caption (Hindi)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi"
            />
            <input
              name="sortOrder"
              type="number"
              defaultValue={galleryItems.length + 1}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add gallery image
            </button>
          </form>
        </section>
      )}

      {showNewsTicker && (
        <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">News ticker</h2>
          <p className="mt-1 text-sm text-slate-500">
            Headlines shown in the yellow scrolling bar on the public page.
          </p>
          <ul className="mt-4 space-y-2">
            {newsTickerItems.map((item) => {
              const fileUrl = item.file_path ? getStoredFileUrl(item.file_path) : null;
              const expiresLabel = item.expires_at ? formatAdminDateTime(item.expires_at) : null;
              const isExpired = item.expires_at ? isExpiredAt(item.expires_at) : false;

              return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-800">{item.title_en}</p>
                  {item.href && <p className="text-xs text-slate-500">Link: {item.href}</p>}
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      Attached file
                    </a>
                  )}
                  {expiresLabel && (
                    <p className={`text-xs ${isExpired ? "font-medium text-red-600" : "text-slate-500"}`}>
                      Expires: {expiresLabel}
                      {isExpired ? " (expired)" : ""}
                    </p>
                  )}
                  {!item.is_active && (
                    <p className="text-xs font-medium text-amber-700">Hidden (inactive)</p>
                  )}
                </div>
                <DeleteButton
                  label="news headline"
                  onConfirm={async () => {
                    await deletePageNewsTickerItemAction(pageId, item.id);
                  }}
                />
              </li>
            );
            })}
          </ul>
          <NewsTickerAddForm
            key={`${newsTickerItems.length}-${newsTickerFormSeed}`}
            pageId={pageId}
            defaultSortOrder={newsTickerItems.length + 1}
            onSuccess={() => {
              setNewsTickerFormSeed((seed) => seed + 1);
              refresh();
            }}
            onError={setError}
          />
        </section>
      )}

      {showStudentCorner && (
        <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Student Corner</h2>
          <p className="mt-1 text-sm text-slate-500">
            Notices and download links shown in the student corner panel on the public page.
          </p>
          <ul className="mt-4 space-y-2">
            {studentCornerItems.map((item) => {
              const fileUrl = item.file_path ? getStoredFileUrl(item.file_path) : null;
              const expiresLabel = item.expires_at ? formatAdminDateTime(item.expires_at) : null;
              const isExpired = item.expires_at ? isExpiredAt(item.expires_at) : false;

              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{item.title_en}</p>
                    {item.href && <p className="text-xs text-slate-500">Link: {item.href}</p>}
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Attached file
                      </a>
                    )}
                    {expiresLabel && (
                      <p className={`text-xs ${isExpired ? "font-medium text-red-600" : "text-slate-500"}`}>
                        Expires: {expiresLabel}
                        {isExpired ? " (expired)" : ""}
                      </p>
                    )}
                    {!item.is_active && (
                      <p className="text-xs font-medium text-amber-700">Hidden (inactive)</p>
                    )}
                  </div>
                  <DeleteButton
                    label="student corner item"
                    onConfirm={async () => {
                      await deletePageStudentCornerItemAction(pageId, item.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <StudentCornerAddForm
            key={`${studentCornerItems.length}-${studentCornerFormSeed}`}
            pageId={pageId}
            defaultSortOrder={studentCornerItems.length + 1}
            onSuccess={() => {
              setStudentCornerFormSeed((seed) => seed + 1);
              refresh();
            }}
            onError={setError}
          />
        </section>
      )}

      {showLeftSidebar && (
        <SidebarEditor
          title="Left sidebar quick links"
          side="left"
          items={leftItems}
          pageId={pageId}
          isPending={isPending}
          error={error}
          setError={setError}
          onAdd={(formData) => runAction(() => createPageSidebarItemAction(pageId, formData))}
          onDelete={(id) => runAction(() => deletePageSidebarItemAction(pageId, id))}
        />
      )}

      {showRightSidebar && (
        <SidebarEditor
          title="Right sidebar quick links"
          side="right"
          items={rightItems}
          pageId={pageId}
          isPending={isPending}
          error={error}
          setError={setError}
          onAdd={(formData) => runAction(() => createPageSidebarItemAction(pageId, formData))}
          onDelete={(id) => runAction(() => deletePageSidebarItemAction(pageId, id))}
        />
      )}
    </div>
  );
}

function SidebarItemForm({
  side,
  item,
  defaultSortOrder,
  isPending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  side: "left" | "right";
  item?: PageSidebarItem;
  defaultSortOrder: number;
  isPending: boolean;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
}) {
  return (
    <form
      className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
      action={onSubmit}
    >
      <input type="hidden" name="side" value={side} />
      <input
        name="labelEn"
        required
        defaultValue={item?.label_en ?? ""}
        placeholder="Label (English)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="labelHi"
        defaultValue={item?.label_hi ?? ""}
        placeholder="Label (Hindi)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi"
      />
      <input
        name="href"
        defaultValue={item?.href ?? ""}
        placeholder="URL (optional — navigates when set)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block font-medium text-slate-700">
          Content (English) — required if no URL
        </span>
        <textarea
          name="contentEn"
          rows={4}
          defaultValue={item?.content_en ?? ""}
          placeholder="HTML content shown in main area when URL is empty"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block font-medium text-slate-700">Content (Hindi)</span>
        <textarea
          name="contentHi"
          rows={4}
          defaultValue={item?.content_hi ?? ""}
          placeholder="Hindi HTML content"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi"
        />
      </label>
      <input
        name="sortOrder"
        type="number"
        defaultValue={item?.sort_order ?? defaultSortOrder}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function SidebarEditor({
  title,
  side,
  items,
  pageId,
  isPending,
  error,
  setError,
  onAdd,
  onDelete,
}: {
  title: string;
  side: "left" | "right";
  items: PageSidebarItem[];
  pageId: string;
  isPending: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  onAdd: (formData: FormData) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  function handleUpdate(itemId: string, formData: FormData) {
    setError(null);
    startEditTransition(async () => {
      const result = await updatePageSidebarItemAction(pageId, itemId, formData);
      if (!result.success) {
        setError(result.error ?? "Save failed.");
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  const pending = isPending || isEditPending;

  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">
        Set a URL to navigate, or leave URL empty and add content to display in the main area.
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-100">
            {editingId === item.id ? (
              <div className="p-3">
                <SidebarItemForm
                  side={side}
                  item={item}
                  defaultSortOrder={item.sort_order}
                  isPending={pending}
                  submitLabel="Save changes"
                  onSubmit={(formData) => handleUpdate(item.id, formData)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{item.label_en}</p>
                  <p className="text-slate-500">
                    {item.href
                      ? item.href
                      : item.content_en
                        ? "Inline content"
                        : "(linked page)"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this sidebar link?")) onDelete(item.id);
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <SidebarItemForm
        side={side}
        defaultSortOrder={items.length + 1}
        isPending={pending}
        submitLabel={`Add ${side} link`}
        onSubmit={onAdd}
      />
    </section>
  );
}
