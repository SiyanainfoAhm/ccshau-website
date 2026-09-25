"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteNewsAction } from "@/actions/news";

export function DeleteNewsButton({
  newsId,
  compact = false,
}: {
  newsId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this news item? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteNewsAction(newsId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/news");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className={
        compact
          ? "text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
          : "rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      }
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
