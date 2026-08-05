"use client";

import { FileText, Film, Image as ImageIcon, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileKind = "document" | "image" | "media";

function KindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  if (kind === "image") return <ImageIcon className={className} aria-hidden />;
  if (kind === "media") return <Film className={className} aria-hidden />;
  return <FileText className={className} aria-hidden />;
}

function syncInputFiles(input: HTMLInputElement, files: File[]) {
  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  input.files = dt.files;
}

export function AdminFileUploadField({
  name,
  accept,
  required = false,
  disabled = false,
  multiple = false,
  kind = "document",
  label = "Upload file",
  hint,
  chooseLabel = "Choose file",
}: {
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  kind?: FileKind;
  label?: string;
  hint?: string;
  chooseLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function applyFiles(files: File[]) {
    const next = multiple ? files : files.slice(0, 1);
    setSelectedFiles(next);
    const input = inputRef.current;
    if (!input) return;
    if (next.length === 0) {
      input.value = "";
      return;
    }
    syncInputFiles(input, next);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    applyFiles(Array.from(e.dataTransfer.files));
  }

  function removeAt(index: number) {
    applyFiles(selectedFiles.filter((_, i) => i !== index));
  }

  if (disabled) return null;

  const hasFiles = selectedFiles.length > 0;

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required && !hasFiles}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => applyFiles(Array.from(e.target.files ?? []))}
      />

      {hasFiles ? (
        <div className="space-y-1.5">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2"
            >
              <KindIcon kind={kind} className="h-4 w-4 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
              {multiple && selectedFiles.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFiles([])}
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    aria-label="Remove selected file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {multiple ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              {selectedFiles.length > 1 ? "Replace all files" : "Choose files"}
            </button>
          ) : null}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2 transition ${
            isDragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/30"
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <Upload className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">{label}</p>
            {hint ? <p className="truncate text-xs text-slate-500">{hint}</p> : null}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-ccshau-chrome-900 px-3 py-1.5 text-xs font-semibold text-white">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {chooseLabel}
          </span>
        </div>
      )}
    </div>
  );
}
