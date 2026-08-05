"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function FeedbackInboxFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get("q") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (name.trim()) params.set("q", name.trim());
    else params.delete("q");

    if (from) params.set("from", from);
    else params.delete("from");

    if (to) params.set("to", to);
    else params.delete("to");

    const qs = params.toString();
    router.push(qs ? `/admin/feedback?${qs}` : "/admin/feedback");
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("from");
    params.delete("to");
    params.delete("page");
    setName("");
    setFrom("");
    setTo("");
    const qs = params.toString();
    router.push(qs ? `/admin/feedback?${qs}` : "/admin/feedback");
  }

  const hasFilters = Boolean(searchParams.get("q") || searchParams.get("from") || searchParams.get("to"));

  return (
    <form
      onSubmit={applyFilters}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Name</span>
        <input
          type="search"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Search by submitter name"
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          min={from || undefined}
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-ccshau-chrome-900 px-4 py-2 text-sm font-medium text-white hover:bg-ccshau-green-900"
      >
        Apply
      </button>
      {hasFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
