"use client";

import { useEffect, useRef, useState } from "react";

import { normalizeCmsHtml, sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

function renderedHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return sanitizeCmsHtml(normalizeCmsHtml(trimmed));
}

export function AdminHtmlField({
  name,
  label,
  value,
  onChange,
  rows = 12,
  disabled = false,
  hindi = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
  hindi?: boolean;
}) {
  const [mode, setMode] = useState<"design" | "html">("design");
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (mode !== "design") return;
    const el = editorRef.current;
    if (!el || focusedRef.current) return;
    const html = renderedHtml(value);
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value, mode]);

  return (
    <div className="block text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-slate-700">{label}</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("design")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              mode === "design" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setMode("html")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              mode === "html" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            HTML
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {mode === "design"
          ? "Click any text below to edit it. Tables and headings stay in place."
          : "HTML source. Switch back to Design to edit as formatted text."}
      </p>
      {mode === "design" ? (
        <div
          ref={editorRef}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            if (!editorRef.current) return;
            onChange(editorRef.current.innerHTML);
          }}
          onInput={() => {
            if (!editorRef.current) return;
            onChange(editorRef.current.innerHTML);
          }}
          onClick={(event) => {
            const link = (event.target as HTMLElement | null)?.closest("a");
            if (link) event.preventDefault();
          }}
          className={[
            "cms-html mt-2 min-h-[12rem] max-h-[36rem] overflow-auto rounded-lg border border-slate-200 bg-white p-4 outline-none",
            disabled ? "cursor-default" : "cursor-text focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
            hindi ? "font-hindi" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : (
        <textarea
          rows={rows}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm ${hindi ? "font-hindi" : ""}`}
        />
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
