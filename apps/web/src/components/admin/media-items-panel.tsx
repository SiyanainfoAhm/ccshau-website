"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addMediaItemAction, deleteMediaItemAction } from "@/actions/media";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import type { MediaItem } from "@/lib/database/types";
import { getVideoPlayback } from "@/lib/media/video-playback";
import { getStoredFileUrl } from "@/lib/storage/urls";

export function MediaItemsPanel({ albumId, items }: { albumId: string; items: MediaItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [videoSource, setVideoSource] = useState<"upload" | "url">("upload");

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMediaItemAction(albumId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMediaType("image");
      setVideoSource("upload");
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

  const showUpload = mediaType === "image" || videoSource === "upload";
  const showVideoUrl = mediaType === "video" && videoSource === "url";

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Album media ({items.length})</h2>

      <form action={handleAdd} className="space-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm font-medium text-slate-700">Add photo or video</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="titleEn"
            placeholder="Title (English)"
            className="rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
          <input
            name="titleHi"
            placeholder="Title (Hindi)"
            className="rounded border border-slate-200 px-2 py-1.5 text-sm font-hindi"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Alt text (English)</span>
            <input
              name="captionEn"
              placeholder="Describe image for screen readers"
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Alt text (Hindi)</span>
            <input
              name="captionHi"
              placeholder="स्क्रीन रीडर के लिए विवरण"
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
              defaultValue={items.length}
              className="mt-1 block w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select
              name="mediaType"
              value={mediaType}
              onChange={(e) => {
                const next = e.target.value === "video" ? "video" : "image";
                setMediaType(next);
                if (next === "image") setVideoSource("upload");
              }}
              className="mt-1 block rounded border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </label>
        </div>

        {mediaType === "video" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Video source</legend>
            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="videoSourceUi"
                  checked={videoSource === "upload"}
                  onChange={() => setVideoSource("upload")}
                />
                Upload video file
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="videoSourceUi"
                  checked={videoSource === "url"}
                  onChange={() => setVideoSource("url")}
                />
                Paste video URL
              </label>
            </div>
          </fieldset>
        )}

        {showVideoUrl && (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Video URL</span>
            <input
              name="videoUrl"
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=… or direct .mp4 URL"
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">
              YouTube, Vimeo, or a direct MP4/WebM link.
            </span>
          </label>
        )}

        {showUpload && (
          <AdminFileUploadField
            name="mediaFile"
            accept={mediaType === "video" ? "video/mp4,video/webm,video/*" : "image/*"}
            required
            kind="media"
            label={mediaType === "video" ? "Upload video file" : "Upload photo"}
            hint={
              mediaType === "video"
                ? "MP4 or WebM, max 100 MB"
                : "JPEG, PNG, WebP or GIF, max 5 MB"
            }
          />
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-ccshau-chrome-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add to album"}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const url =
            item.storage_path !== "pending" ? getStoredFileUrl(item.storage_path) : null;
          const playback = item.media_type === "video" && url ? getVideoPlayback(url) : null;
          const isExternal = Boolean(url?.startsWith("http"));
          return (
            <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="relative aspect-video bg-slate-100">
                {url && item.media_type === "image" ? (
                  <Image src={url} alt={item.title_en ?? ""} fill className="object-cover" />
                ) : playback?.kind === "embed" ? (
                  <iframe
                    src={playback.embedUrl}
                    title={item.title_en ?? "Video"}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : playback?.kind === "file" ? (
                  <video src={playback.src} controls className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    {item.media_type === "video" ? "Video" : "No preview"}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2 text-sm">
                <div className="min-w-0">
                  <span className="block truncate text-slate-700">{item.title_en ?? "Untitled"}</span>
                  {item.media_type === "video" && isExternal && (
                    <span className="text-xs text-slate-500">URL</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(item.id)}
                  className="shrink-0 text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
