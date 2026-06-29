"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteDownloadAction } from "@/actions/downloads";

export function DeleteDownloadButton({ downloadId }: { downloadId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this download?")) return;
    startTransition(async () => {
      const result = await deleteDownloadAction(downloadId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/downloads");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete download"}
    </button>
  );
}
