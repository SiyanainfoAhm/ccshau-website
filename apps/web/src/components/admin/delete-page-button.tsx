"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deletePageAction } from "@/actions/pages";

export function DeletePageButton({
  pageId,
  pageTitle,
  variant = "detail",
}: {
  pageId: string;
  pageTitle: string;
  variant?: "detail" | "list";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Delete "${pageTitle}"? This cannot be undone. Child pages will be unlinked from this parent.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deletePageAction(pageId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      if (variant === "detail") {
        router.push("/admin/pages");
      }
      router.refresh();
    });
  }

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete page"}
    </button>
  );
}
