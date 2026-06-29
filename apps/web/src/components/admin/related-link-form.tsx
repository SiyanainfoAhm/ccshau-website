"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createRelatedLinkAction, updateRelatedLinkAction } from "@/actions/related-links";
import type { RelatedLink } from "@/lib/database/types";
import { RELATED_LINK_CATEGORIES } from "@/lib/validations/related-links";

export function RelatedLinkForm({ link }: { link?: RelatedLink }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (link) {
        const result = await updateRelatedLinkAction(link.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/related-links/${link.id}`);
      } else {
        const result = await createRelatedLinkAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/related-links/${result.data.id}`);
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
          defaultValue={link?.title_en ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input
          name="titleHi"
          defaultValue={link?.title_hi ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">URL</span>
        <input
          name="url"
          type="url"
          required
          defaultValue={link?.url ?? ""}
          placeholder="https://"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select
            name="category"
            defaultValue={link?.category ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">—</option>
            {RELATED_LINK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={link?.sort_order ?? 0}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isExternal"
            defaultChecked={link?.is_external ?? true}
            className="rounded"
          />
          Open in new tab (external)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={link?.is_active ?? true}
            className="rounded"
          />
          Active
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Saving…" : link ? "Save link" : "Create link"}
        </button>
        <Link href="/admin/related-links" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
