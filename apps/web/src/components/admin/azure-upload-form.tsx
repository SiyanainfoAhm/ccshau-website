"use client";

import { useRef, useState, useTransition } from "react";

import { uploadToAzureAction } from "@/actions/azure-upload";

export function AzureUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setUrl(null);
    setCopied(false);

    startTransition(async () => {
      const result = await uploadToAzureAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setUrl(result.data.url);
      formRef.current?.reset();
    });
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select and copy the link manually.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form
        ref={formRef}
        action={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Image or document</span>
          <input
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-medium file:text-emerald-800"
          />
          <span className="mt-2 block text-xs text-slate-500">
            Images: JPEG, PNG, WebP or GIF up to 5 MB. Documents: PDF, Word or Excel up to 25 MB.
          </span>
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
        >
          {isPending ? "Uploading…" : "Upload to Azure"}
        </button>
      </form>

      {url ? (
        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-950">Azure link</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={url}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Uploaded Azure file link"
              className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800"
            />
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-emerald-800 hover:underline"
          >
            Open uploaded file
          </a>
        </section>
      ) : null}
    </div>
  );
}
