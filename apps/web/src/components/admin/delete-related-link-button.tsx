"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteRelatedLinkAction } from "@/actions/related-links";

export function DeleteRelatedLinkButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this related link?")) return;
    startTransition(async () => {
      const result = await deleteRelatedLinkAction(linkId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/related-links");
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
      {isPending ? "Deleting…" : "Delete link"}
    </button>
  );
}
