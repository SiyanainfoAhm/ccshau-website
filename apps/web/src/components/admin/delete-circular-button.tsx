"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteCircularAction } from "@/actions/circulars";

export function DeleteCircularButton({ circularId }: { circularId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Delete this circular?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCircularAction(circularId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/admin/circulars?deleted=1");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p role="alert" className="max-w-xs rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete circular"}
      </button>
    </div>
  );
}
