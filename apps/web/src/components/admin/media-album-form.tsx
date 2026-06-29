"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createMediaAlbumAction, updateMediaAlbumAction } from "@/actions/media";
import type { MediaAlbum } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";
import { slugify } from "@/lib/utils/slug";

interface Department {
  id: string;
  name_en: string;
}

export function MediaAlbumForm({
  departments,
  album,
}: {
  departments: Department[];
  album?: MediaAlbum;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(album?.title_en ?? "");
  const [slug, setSlug] = useState(album?.slug ?? "");
  const [removeCover, setRemoveCover] = useState(false);

  const coverUrl = album?.cover_image_path ? getStoredFileUrl(album.cover_image_path) : null;
  const eventValue = album?.event_date ?? "";

  function handleTitleBlur() {
    if (!album && titleEn && !slug) setSlug(slugify(titleEn));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    if (removeCover) formData.set("removeCover", "on");

    startTransition(async () => {
      if (album) {
        const result = await updateMediaAlbumAction(album.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/media/${album.id}`);
      } else {
        const result = await createMediaAlbumAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/media/${result.data.id}`);
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
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          onBlur={handleTitleBlur}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input
          name="titleHi"
          defaultValue={album?.title_hi ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-hindi"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">URL slug</span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Album type</span>
          <select
            name="albumType"
            defaultValue={album?.album_type ?? "photo"}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 capitalize"
          >
            <option value="photo">Photo gallery</option>
            <option value="video">Video gallery</option>
            <option value="press_release">Press release</option>
            <option value="event">Event</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Event date</span>
          <input
            name="eventDate"
            type="date"
            defaultValue={eventValue}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Department</span>
        <select
          name="departmentId"
          defaultValue={album?.department_id ?? ""}
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
          defaultValue={album?.status ?? "draft"}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        >
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Cover image</span>
        {coverUrl && !removeCover && (
          <div className="relative h-32 w-48 overflow-hidden rounded-lg border border-slate-200">
            <Image src={coverUrl} alt="" fill className="object-cover" />
          </div>
        )}
        {album && coverUrl && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={removeCover}
              onChange={(e) => setRemoveCover(e.target.checked)}
            />
            Replace cover image
          </label>
        )}
        {(!album || removeCover || !coverUrl) && (
          <input name="cover" type="file" accept="image/*" className="block w-full text-sm" />
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : album ? "Save album" : "Create album"}
        </button>
        <Link
          href="/admin/media"
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
