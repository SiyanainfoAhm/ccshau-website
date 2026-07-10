"use client";

import { getStoredFileUrl } from "@/lib/storage/upload";
import type { DownloadVersion } from "@/lib/database/types";

export function DownloadVersionPanel({ versions }: { versions: DownloadVersion[] }) {
  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Version history</h2>
        <p className="mt-2 text-sm text-slate-500">Previous file revisions appear here when you replace the document.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Version history</h2>
      <ul className="space-y-3">
        {versions.map((version) => {
          const fileUrl = getStoredFileUrl(version.file_path);
          return (
            <li
              key={version.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{version.file_name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {version.version_label ? `Version ${version.version_label} · ` : ""}
                  {new Date(version.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-emerald-800 hover:underline"
                >
                  View file
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
