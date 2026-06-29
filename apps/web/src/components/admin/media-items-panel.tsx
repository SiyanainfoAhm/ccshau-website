"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addMediaItemAction, deleteMediaItemAction } from "@/actions/media";
import type { MediaItem } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";

export function MediaItemsPanel({ albumId, items }: { albumId: string; items: MediaItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMediaItemAction(albumId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
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
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={items.length}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <select name="mediaType" className="rounded border border-slate-200 px-2 py-1.5 text-sm">
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <input name="mediaFile" type="file" accept="image/*,video/*" required className="text-sm" />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Uploading…" : "Add to album"}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const url =
            item.storage_path !== "pending" ? getStoredFileUrl(item.storage_path) : null;
          return (
            <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="relative aspect-video bg-slate-100">
                {url && item.media_type === "image" ? (
                  <Image src={url} alt={item.title_en ?? ""} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    {item.media_type === "video" ? "Video" : "No preview"}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-2 text-sm">
                <span className="truncate text-slate-700">{item.title_en ?? "Untitled"}</span>
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
          );
        })}
      </div>
    </div>
  );
}
