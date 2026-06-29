"use client";

import { FileText, X } from "lucide-react";
import { useState } from "react";

import type { AttachmentPath } from "@/lib/database/types";
import { getPublicFileUrl } from "@/lib/storage/upload";

export function AttachmentList({
  attachments,
  removed,
  onRemove,
}: {
  attachments: AttachmentPath[];
  removed: string[];
  onRemove: (path: string) => void;
}) {
  const visible = attachments.filter((a) => !removed.includes(a.path));
  if (visible.length === 0) return null;

  return (
    <ul className="space-y-2">
      {visible.map((file) => {
        const slash = file.path.indexOf("/");
        const bucket = slash > -1 ? file.path.slice(0, slash) : "";
        const objectPath = slash > -1 ? file.path.slice(slash + 1) : file.path;
        const url = getPublicFileUrl(bucket, objectPath);

        return (
          <li
            key={file.path}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-emerald-800 underline"
                >
                  {file.name}
                </a>
              ) : (
                <span className="truncate">{file.name}</span>
              )}
              {file.size ? (
                <span className="shrink-0 text-xs text-slate-500">
                  ({Math.round(file.size / 1024)} KB)
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onRemove(file.path)}
              className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function useAttachmentRemovals(initial: AttachmentPath[] = []) {
  const [removed, setRemoved] = useState<string[]>([]);

  function remove(path: string) {
    setRemoved((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }

  return {
    removed,
    remove,
    removedJson: JSON.stringify(removed),
    keptCount: initial.length - removed.length,
  };
}
