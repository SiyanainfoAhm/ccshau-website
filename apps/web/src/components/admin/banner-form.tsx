"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBannerAction, updateBannerAction } from "@/actions/banners";
import type { Banner } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";

export function BannerForm({ banner }: { banner?: Banner }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const imageUrl =
    banner && banner.image_path !== "pending" ? getStoredFileUrl(banner.image_path) : null;

  const startValue = banner?.start_date
    ? new Date(banner.start_date).toISOString().slice(0, 16)
    : "";
  const endValue = banner?.end_date ? new Date(banner.end_date).toISOString().slice(0, 16) : "";

  function handleSubmit(formData: FormData) {
    setError(null);
    if (removeImage) formData.set("removeImage", "on");

    startTransition(async () => {
      if (banner) {
        const result = await updateBannerAction(banner.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/banners/${banner.id}`);
      } else {
        const result = await createBannerAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/banners/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title</span>
        <input
          name="title"
          required
          defaultValue={banner?.title ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">
          Banner image {!banner && <span className="text-red-600">*</span>}
        </span>
        {imageUrl && !removeImage && (
          <div className="relative h-40 w-full max-w-md overflow-hidden rounded-lg border border-slate-200">
            <Image src={imageUrl} alt={banner?.alt_text ?? banner?.title ?? ""} fill className="object-cover" />
          </div>
        )}
        {banner && imageUrl && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(e) => setRemoveImage(e.target.checked)}
            />
            Replace current image
          </label>
        )}
        {(!banner || removeImage) && (
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required={!banner}
            className="block w-full text-sm text-slate-600"
          />
        )}
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Target URL</span>
        <input
          name="targetUrl"
          type="url"
          defaultValue={banner?.target_url ?? ""}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Alt text</span>
        <input
          name="altText"
          defaultValue={banner?.alt_text ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Start date</span>
          <input
            name="startDate"
            type="datetime-local"
            defaultValue={startValue}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">End date</span>
          <input
            name="endDate"
            type="datetime-local"
            defaultValue={endValue}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Priority</span>
          <input
            name="priority"
            type="number"
            defaultValue={banner?.priority ?? 0}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-slate-500">Higher numbers appear first</span>
        </label>
        <label className="flex items-center gap-2 pt-7 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={banner?.is_active ?? true} />
          Active on homepage
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Saving…" : banner ? "Save banner" : "Create banner"}
        </button>
        <Link
          href="/admin/banners"
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
