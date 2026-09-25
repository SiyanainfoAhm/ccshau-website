"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateHeaderBrandingAction } from "@/actions/settings";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import type { SiteSettings } from "@/lib/database/types";
import { resolveHeaderBranding } from "@/lib/settings/header-branding";

function ImagePreview({ src, alt, round }: { src: string; alt: string; round?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden border border-slate-200 bg-slate-900 ${
        round ? "h-20 w-20 rounded-full" : "h-24 w-20 rounded-lg"
      }`}
    >
      <Image src={src} alt={alt} fill className="object-cover" unoptimized />
    </div>
  );
}

export function HeaderBrandingForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const branding = resolveHeaderBranding(settings);
  const [taglineEn, setTaglineEn] = useState(settings.header_tagline_en ?? branding.taglineEn);
  const [taglineHi, setTaglineHi] = useState(settings.header_tagline_hi ?? branding.taglineHi);
  const [nameEn, setNameEn] = useState(settings.header_name_en ?? branding.nameEn);
  const [nameHi, setNameHi] = useState(settings.header_name_hi ?? branding.nameHi);
  const [accreditationEn, setAccreditationEn] = useState(
    settings.header_accreditation_en ?? branding.accreditationEn,
  );
  const [accreditationHi, setAccreditationHi] = useState(
    settings.header_accreditation_hi ?? branding.accreditationHi,
  );

  async function handleAutoTranslate() {
    setError(null);
    setSaved(false);
    setIsTranslating(true);
    try {
      const result = await translateFieldsEnToHiAction([
        { key: "taglineHi", text: taglineEn },
        { key: "nameHi", text: nameEn },
        { key: "accreditationHi", text: accreditationEn },
      ]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const translated = result.data.translations;
      if (translated.taglineHi) setTaglineHi(translated.taglineHi);
      if (translated.nameHi) setNameHi(translated.nameHi);
      if (translated.accreditationHi) setAccreditationHi(translated.accreditationHi);
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
      const result = await updateHeaderBrandingAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Public header</h2>
        <p className="mt-1 text-sm text-slate-500">
          Change the motto, the three lines beside the logo, the logo on the left, and the photo
          on the right. Leave an image empty to keep the current one.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Header saved. Refresh the public site if the old motto or photos are still cached.
        </p>
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

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Header text (English)</span>
        <input
          name="taglineEn"
          required
          maxLength={80}
          value={taglineEn}
          onChange={(e) => setTaglineEn(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Header text (Hindi)</span>
        <input
          name="taglineHi"
          maxLength={80}
          value={taglineHi}
          onChange={(e) => setTaglineHi(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Short name</span>
        <input
          name="shortName"
          required
          maxLength={40}
          defaultValue={settings.header_short_name ?? branding.shortName}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">University name (English)</span>
        <input
          name="nameEn"
          required
          maxLength={160}
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">University name (Hindi)</span>
        <input
          name="nameHi"
          maxLength={160}
          value={nameHi}
          onChange={(e) => setNameHi(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Accreditation (English)</span>
        <input
          name="accreditationEn"
          required
          maxLength={80}
          value={accreditationEn}
          onChange={(e) => setAccreditationEn(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Accreditation (Hindi)</span>
        <input
          name="accreditationHi"
          maxLength={80}
          value={accreditationHi}
          onChange={(e) => setAccreditationHi(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Left image (logo)</span>
        <ImagePreview src={branding.logoUrl} alt="Current header logo" round />
        <AdminFileUploadField
          name="logo"
          accept="image/jpeg,image/png,image/webp,image/gif"
          kind="image"
          label="Replace logo"
          hint="JPEG, PNG, WebP or GIF"
        />
        {settings.header_logo_path && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="resetLogo" type="checkbox" />
            Restore the built-in logo
          </label>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Right photo</span>
        <ImagePreview src={branding.portraitUrl} alt="Current header photo" />
        <AdminFileUploadField
          name="portrait"
          accept="image/jpeg,image/png,image/webp,image/gif"
          kind="image"
          label="Replace photo"
          hint="JPEG, PNG, WebP or GIF"
        />
        {settings.header_portrait_path && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="resetPortrait" type="checkbox" />
            Restore the built-in photo
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save header"}
      </button>
    </form>
  );
}
