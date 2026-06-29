"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteTenderAction } from "@/actions/tenders";

export function DeleteTenderButton({ tenderId }: { tenderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this tender and all corrigenda? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteTenderAction(tenderId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/tenders");
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
      {isPending ? "Deleting…" : "Delete tender"}
    </button>
  );
}
