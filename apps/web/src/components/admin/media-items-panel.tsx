"use client";

import { FileText, Link2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { addMediaItemAction, deleteMediaItemAction, updateMediaItemAction } from "@/actions/media";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import type { MediaItem } from "@/lib/database/types";
import { getVideoPlayback } from "@/lib/media/video-playback";
import { getStoredFileUrl } from "@/lib/storage/urls";
import type { MediaItemType } from "@/lib/validations/media";

const TYPE_OPTIONS: { value: MediaItemType; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "link", label: "External link" },
];

export function MediaItemsPanel({ albumId, items }: { albumId: string; items: MediaItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaItemType>("image");
  const [source, setSource] = useState<"upload" | "url">("upload");
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const editorRef = useRef<HTMLFormElement>(null);

  function beginEdit(item: MediaItem) {
    const url = item.storage_path.startsWith("http") ? item.storage_path : "";
    const type = (["image", "video", "pdf", "link"] as const).includes(item.media_type as MediaItemType)
      ? (item.media_type as MediaItemType)
      : "image";
    setEditing(item);
    setMediaType(type);
    setSource(type === "link" || url ? "url" : "upload");
    setError(null);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateMediaItemAction(editing.id, albumId, formData)
        : await addMediaItemAction(albumId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(null);
      setMediaType("image");
      setSource("upload");
      router.refresh();
    });
  }

  function handleDelete(itemId: string) {
    if (!confirm("Delete this media item?")) return;
    startTransition(async () => {
      const result = await deleteMediaItemAction(itemId, albumId);
      if (!result.success) alert(result.error);
      else router.refresh();
    });
  }

  const showUrl = mediaType === "link" || source === "url";
  const showUpload = mediaType !== "link" && source === "upload";
  const accept =
    mediaType === "video"
      ? "video/mp4,video/webm"
      : mediaType === "pdf"
        ? "application/pdf"
        : "image/jpeg,image/png,image/webp,image/gif";
  const uploadLabel =
    mediaType === "video" ? "Upload video file" : mediaType === "pdf" ? "Upload PDF" : "Upload photo";
  const uploadHint =
    mediaType === "video"
      ? "MP4 or WebM, max 100 MB"
      : mediaType === "pdf"
        ? "PDF, max 25 MB"
        : "JPEG, PNG, WebP or GIF, max 5 MB";

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Album media ({items.length})</h2>

      <form
        ref={editorRef}
        key={editing?.id ?? "new"}
        action={handleSave}
        className="scroll-mt-24 space-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4"
      >
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm font-medium text-slate-700">
          {editing ? "Edit media item" : "Add a file or external URL"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="titleEn"
            placeholder="Title (English)"
            defaultValue={editing?.title_en ?? ""}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
          <input
            name="titleHi"
            placeholder="Title (Hindi)"
            defaultValue={editing?.title_hi ?? ""}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm font-hindi"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Alt text (English)</span>
            <input
              name="captionEn"
              placeholder="Describe the item for screen readers"
              defaultValue={editing?.caption_en ?? ""}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Alt text (Hindi)</span>
            <input
              name="captionHi"
              placeholder="स्क्रीन रीडर के लिए विवरण"
              defaultValue={editing?.caption_hi ?? ""}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm font-hindi"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Sort order</span>
            <input
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={editing?.sort_order ?? items.length}
              className="mt-1 block w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select
              name="mediaType"
              value={mediaType}
              onChange={(e) => {
                const next = e.target.value as MediaItemType;
                setMediaType(next);
                setSource(next === "link" ? "url" : "upload");
              }}
              className="mt-1 block rounded border border-slate-200 px-2 py-1.5 text-sm"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {mediaType !== "link" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Source</legend>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceUi"
                  checked={source === "upload"}
                  onChange={() => setSource("upload")}
                />
                Upload file
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceUi"
                  checked={source === "url"}
                  onChange={() => setSource("url")}
                />
                External URL
              </label>
            </div>
          </fieldset>
        )}

        {showUrl && (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">External URL</span>
            <input
              name="externalUrl"
              type="url"
              required={!editing}
              defaultValue={editing?.storage_path.startsWith("http") ? editing.storage_path : ""}
              placeholder="https://"
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Opens in a new tab. Use a direct image, PDF, or video link, or any public page.
            </span>
          </label>
        )}

        {showUpload && (
          <AdminFileUploadField
            name="mediaFile"
            accept={accept}
            required={!editing}
            kind="media"
            label={editing ? `Replace file (optional)` : uploadLabel}
            hint={editing ? "Leave empty to keep the current file." : uploadHint}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-ccshau-chrome-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : editing ? "Save changes" : "Add to album"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setMediaType("image");
                setSource("upload");
                setError(null);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const url =
            item.storage_path !== "pending" ? getStoredFileUrl(item.storage_path) : null;
          const isPdf = item.media_type === "pdf" || Boolean(url && /\.pdf(?:$|[?#])/i.test(url));
          const playback = url && !isPdf ? getVideoPlayback(url) : null;
          const isVideo =
            item.media_type === "video" ||
            playback?.kind === "embed" ||
            Boolean(url && /\.(mp4|webm|ogg)(?:$|[?#])/i.test(url));
          const isExternal = Boolean(url?.startsWith("http") && !url.includes(".blob.core.windows.net"));
          const pdfSrc = url ? (url.includes("#") ? url : `${url}#toolbar=1`) : null;
          const typeLabel = isPdf ? "PDF" : isVideo ? "Video" : item.media_type.replace("_", " ");
          return (
            <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="relative aspect-video bg-slate-100">
                {isPdf && pdfSrc ? (
                  <iframe
                    src={pdfSrc}
                    title={item.title_en ?? "PDF"}
                    className="h-full w-full border-0"
                  />
                ) : isVideo && playback?.kind === "embed" ? (
                  <iframe
                    src={playback.embedUrl}
                    title={item.title_en ?? "Video"}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : isVideo && playback?.kind === "file" ? (
                  <video src={playback.src} controls className="h-full w-full object-cover" />
                ) : url && item.media_type === "image" && !isPdf ? (
                  <Image src={url} alt={item.title_en ?? ""} fill className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-500">
                    {item.media_type === "link" ? <Link2 className="h-8 w-8" aria-hidden /> : <FileText className="h-8 w-8" aria-hidden />}
                    {item.media_type === "link" ? "External link" : "No preview"}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2 text-sm">
                <div className="min-w-0">
                  <span className="block truncate text-slate-700">{item.title_en ?? "Untitled"}</span>
                  <span className="text-xs capitalize text-slate-500">
                    {typeLabel}
                    {isExternal ? " · URL" : ""}
                  </span>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => beginEdit(item)}
                    className="text-ccshau-chrome-900 hover:underline disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
