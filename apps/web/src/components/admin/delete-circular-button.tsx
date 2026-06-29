"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteCircularAction } from "@/actions/circulars";

export function DeleteCircularButton({ circularId }: { circularId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this circular?")) return;
    startTransition(async () => {
      const result = await deleteCircularAction(circularId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/circulars");
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
      {isPending ? "Deleting…" : "Delete circular"}
    </button>
  );
}
