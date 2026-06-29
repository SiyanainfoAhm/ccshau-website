"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addCorrigendumAction, deleteCorrigendumAction } from "@/actions/tenders";
import type { TenderCorrigendum } from "@/lib/database/types";
import { getPublicFileUrl } from "@/lib/storage/upload";

export function CorrigendumPanel({
  tenderId,
  corrigenda,
}: {
  tenderId: string;
  corrigenda: TenderCorrigendum[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addCorrigendumAction(tenderId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(corrigendumId: string) {
    if (!confirm("Delete this corrigendum?")) return;
    startTransition(async () => {
      const result = await deleteCorrigendumAction(corrigendumId, tenderId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Corrigenda</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {corrigenda.length > 0 ? (
        <ul className="mb-6 space-y-3">
          {corrigenda.map((item) => {
            let fileUrl: string | null = null;
            if (item.file_path) {
              const slash = item.file_path.indexOf("/");
              const bucket = slash > -1 ? item.file_path.slice(0, slash) : "";
              const path = slash > -1 ? item.file_path.slice(slash + 1) : item.file_path;
              fileUrl = getPublicFileUrl(bucket, path);
            }

            return (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.published_at).toLocaleString("en-IN")}
                  </p>
                  {fileUrl && item.file_name && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-emerald-800 underline"
                    >
                      {item.file_name}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(item.id)}
                  className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-6 text-sm text-slate-500">No corrigenda yet.</p>
      )}

      <form key={corrigenda.length} action={handleAdd} className="space-y-4 border-t border-slate-100 pt-4">
        <p className="text-sm font-medium text-slate-700">Add corrigendum</p>
        <input
          name="title"
          required
          placeholder="Corrigendum title"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          name="description"
          rows={3}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="file"
          name="corrigendumFile"
          accept=".pdf,.doc,.docx,application/pdf"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-800"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add corrigendum"}
        </button>
      </form>
    </div>
  );
}
