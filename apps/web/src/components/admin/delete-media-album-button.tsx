"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteMediaAlbumAction } from "@/actions/media";

export function DeleteMediaAlbumButton({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this album and all its media items?")) return;
    startTransition(async () => {
      const result = await deleteMediaAlbumAction(albumId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.push("/admin/media");
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
      {isPending ? "Deleting…" : "Delete album"}
    </button>
  );
}
