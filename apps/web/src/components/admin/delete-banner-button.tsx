"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteBannerAction } from "@/actions/banners";

export function DeleteBannerButton({ bannerId }: { bannerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this banner? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteBannerAction(bannerId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/banners");
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
      {isPending ? "Deleting…" : "Delete banner"}
    </button>
  );
}
