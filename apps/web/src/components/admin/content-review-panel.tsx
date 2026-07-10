"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { reviewContentAction, type ReviewableEntityType } from "@/actions/content-review";

export function ContentReviewPanel({
  entityType,
  entityId,
  title,
}: {
  entityType: ReviewableEntityType;
  entityId: string;
  title: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function runReview(decision: "approve" | "reject") {
    setError(null);
    setMessage(null);
    const label = decision === "approve" ? "approve and publish" : "return to draft";
    if (!confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} this item?`)) return;

    startTransition(async () => {
      const result = await reviewContentAction(entityType, entityId, decision);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(decision === "approve" ? "Published successfully." : "Returned to draft.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">Pending review</p>
          <p className="mt-1 text-sm text-amber-800">
            <span className="font-medium">{title}</span> is awaiting approval before it can go live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => runReview("approve")}
            className="rounded-lg bg-[#0b3d2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3427] disabled:opacity-50"
          >
            Approve & publish
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runReview("reject")}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Return to draft
          </button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
    </div>
  );
}
