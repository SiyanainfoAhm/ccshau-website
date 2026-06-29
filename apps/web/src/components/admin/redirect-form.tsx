"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createRedirectAction, updateRedirectAction } from "@/actions/redirects";
import type { UrlRedirect } from "@/lib/database/types";

export function RedirectForm({ redirect }: { redirect?: UrlRedirect }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (redirect) {
        const result = await updateRedirectAction(redirect.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/redirects/${redirect.id}`);
      } else {
        const result = await createRedirectAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/redirects/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Legacy path</span>
        <input
          name="legacyPath"
          required
          defaultValue={redirect?.legacy_path ?? ""}
          placeholder="/Circular.aspx"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">New path</span>
        <input
          name="newPath"
          required
          defaultValue={redirect?.new_path ?? ""}
          placeholder="/circulars"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Redirect type</span>
        <select
          name="redirectType"
          defaultValue={String(redirect?.redirect_type ?? 301)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="301">301 — Permanent</option>
          <option value="302">302 — Temporary</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={redirect?.notes ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={redirect?.is_active ?? true}
          className="rounded"
        />
        Active
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-50"
        >
          {isPending ? "Saving…" : redirect ? "Save redirect" : "Create redirect"}
        </button>
        <Link href="/admin/redirects" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
