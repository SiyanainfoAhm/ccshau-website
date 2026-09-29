"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateMicrositeHeaderAction } from "@/actions/microsite-header";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import type { MicrositeHeaderInput } from "@/lib/pages/microsite-header";

export function MicrositeHeaderForm({
  collegePageId,
  header,
  columnReady,
  logoPreviewUrl,
}: {
  collegePageId: string;
  header: MicrositeHeaderInput;
  columnReady: boolean;
  logoPreviewUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [custom, setCustom] = useState(header.custom);
  const [showUniversityMenu, setShowUniversityMenu] = useState(header.showUniversityMenu);
  const [nameEn, setNameEn] = useState(header.nameEn);
  const [nameHi, setNameHi] = useState(header.nameHi);
  const [taglineEn, setTaglineEn] = useState(header.taglineEn);
  const [taglineHi, setTaglineHi] = useState(header.taglineHi);

  async function handleAutoTranslate() {
    setError(null);
    setSaved(false);
    setIsTranslating(true);
    try {
      const result = await translateFieldsEnToHiAction([
        { key: "nameHi", text: nameEn },
        { key: "taglineHi", text: taglineEn },
      ]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const translated = result.data.translations;
      if (translated.nameHi) setNameHi(translated.nameHi);
      if (translated.taglineHi) setTaglineHi(translated.taglineHi);
      if (result.data.warnings.length > 0) {
        setError(result.data.warnings.join(" "));
      } else if (Object.keys(translated).length === 0) {
        setError("Nothing was translated. Enter English text first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateMicrositeHeaderAction(collegePageId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600">
        Turn this on to show this name, short line, and logo on the microsite bar. The university logo,
        motto, and portrait stay on the green bar above. Turn it off to keep today&apos;s header.
      </p>
      {!columnReady && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Run supabase/migrations/20260929140000_microsite_header.sql in the Supabase SQL editor
          before saving a custom header.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Header saved.</p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAutoTranslate}
          disabled={isPending || isTranslating}
          className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
        >
          {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input name="custom" type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
        Use a custom header for this microsite
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Name (English)</span>
        <input name="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Name (Hindi)</span>
        <input name="nameHi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Short line (English)</span>
        <input name="taglineEn" value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Short line (Hindi)</span>
        <input name="taglineHi" value={taglineHi} onChange={(e) => setTaglineHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Logo</p>
        {logoPreviewUrl && (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <Image src={logoPreviewUrl} alt="" fill className="object-contain" unoptimized />
          </div>
        )}
        <AdminFileUploadField name="logo" accept="image/*" kind="image" label="Upload logo" hint="Optional. Leave empty to keep the current logo." />
        {header.logoPath && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="removeLogo" type="checkbox" />
            Remove logo
          </label>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          name="showUniversityMenu"
          type="checkbox"
          checked={showUniversityMenu}
          onChange={(e) => setShowUniversityMenu(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Show university menu</span>
          <span className="mt-0.5 block text-slate-500">
            On: the university menu shows under the microsite name, and the microsite menu is hidden.
            Off: the microsite menu shows, and the university menu is hidden.
          </span>
        </span>
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : "Save header"}
        </button>
        <Link href={`/admin/register/${collegePageId}`} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}
