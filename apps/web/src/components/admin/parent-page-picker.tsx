"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  searchParentPageOptionsForAdmin,
  type AdminParentPageOption,
} from "@/actions/pages";

export type ParentPageOption = AdminParentPageOption;

export function ParentPagePicker({
  name = "parentId",
  value,
  onChange,
  excludePageId = null,
  disabled = false,
}: {
  name?: string;
  value: ParentPageOption | null;
  onChange: (next: ParentPageOption | null) => void;
  excludePageId?: string | null;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParentPageOption[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const rows = await searchParentPageOptionsForAdmin(query, excludePageId, 40);
        setResults(rows);
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, query, excludePageId]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm disabled:bg-slate-50 disabled:text-slate-500"
      >
        <span className="min-w-0 truncate">
          {value ? (
            <>
              <span className="font-medium text-slate-800">{value.title_en}</span>
              <span className="text-slate-500"> ({value.publicPath})</span>
            </>
          ) : (
            <span className="text-slate-500">— None (top level) —</span>
          )}
        </span>
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && !disabled ? (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or slug…"
            autoFocus
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <ul
            id={listId}
            role="listbox"
            className="mt-2 max-h-60 overflow-y-auto text-sm"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className="flex w-full rounded-md px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQuery("");
                }}
              >
                — None (top level) —
              </button>
            </li>
            {isPending && results.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">Searching…</li>
            ) : null}
            {!isPending && results.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">No matching pages.</li>
            ) : null}
            {results.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === option.id}
                  className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-emerald-50"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="font-medium text-slate-800">{option.title_en}</span>
                  <span className="truncate font-mono text-xs text-slate-500">
                    {option.publicPath}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
