"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateMicrositeFooterAction } from "@/actions/microsite-footer";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import type { MicrositeFooterInput, MicrositeFooterSection } from "@/lib/pages/microsite-footer";

export function MicrositeFooterForm({
  collegePageId,
  footer,
  columnReady,
}: {
  collegePageId: string;
  footer: MicrositeFooterInput;
  columnReady: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState(footer.custom);
  const [useHauLinks, setUseHauLinks] = useState(footer.useHauLinks);
  const [isTranslating, setIsTranslating] = useState(false);
  const [nameEn, setNameEn] = useState(footer.nameEn);
  const [nameHi, setNameHi] = useState(footer.nameHi);
  const [descriptionEn, setDescriptionEn] = useState(footer.descriptionEn);
  const [descriptionHi, setDescriptionHi] = useState(footer.descriptionHi);
  const [addressEn, setAddressEn] = useState(footer.addressEn);
  const [addressHi, setAddressHi] = useState(footer.addressHi);
  const [sections, setSections] = useState<MicrositeFooterSection[]>(footer.sections);

  function updateSection(index: number, patch: Partial<MicrositeFooterSection>) {
    setSections((current) => current.map((section, sectionIndex) => (sectionIndex === index ? { ...section, ...patch } : section)));
  }

  function updateLink(sectionIndex: number, linkIndex: number, field: "labelEn" | "labelHi" | "href", value: string) {
    setSections((current) =>
      current.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          links: section.links.map((link, itemIndex) =>
            itemIndex === linkIndex ? { ...link, [field]: value } : link,
          ),
        };
      }),
    );
  }

  function deleteLink(sectionIndex: number, linkIndex: number) {
    setSections((current) =>
      current.map((section, index) =>
        index === sectionIndex
          ? { ...section, links: section.links.filter((_, itemIndex) => itemIndex !== linkIndex) }
          : section,
      ),
    );
  }

  async function handleAutoTranslate() {
    setError(null);
    setSaved(false);
    setIsTranslating(true);
    try {
      const fields = [
        { key: "nameHi", text: nameEn },
        { key: "descriptionHi", text: descriptionEn },
        { key: "addressHi", text: addressEn },
        ...sections.flatMap((section, sectionIndex) => [
          { key: `sectionHi${sectionIndex}`, text: section.titleEn },
          ...section.links.map((link, linkIndex) => ({
            key: `linkHi${sectionIndex}-${linkIndex}`,
            text: link.labelEn,
          })),
        ]),
      ];
      const result = await translateFieldsEnToHiAction(fields);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const translated = result.data.translations;
      if (translated.nameHi) setNameHi(translated.nameHi);
      if (translated.descriptionHi) setDescriptionHi(translated.descriptionHi);
      if (translated.addressHi) setAddressHi(translated.addressHi);
      setSections((current) =>
        current.map((section, sectionIndex) => ({
          ...section,
          titleHi: translated[`sectionHi${sectionIndex}`] || section.titleHi,
          links: section.links.map((link, linkIndex) =>
            translated[`linkHi${sectionIndex}-${linkIndex}`]
              ? { ...link, labelHi: translated[`linkHi${sectionIndex}-${linkIndex}`] }
              : link,
          ),
        })),
      );
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
      const result = await updateMicrositeFooterAction(collegePageId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-4xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600">
        Turn this on to show only this microsite footer on the college or directorate and its inner pages.
        Turn it off to hide this footer and show the university footer instead.
      </p>
      {!columnReady && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Run supabase/migrations/20260928100000_microsite_footer.sql in the Supabase SQL editor
          before saving a custom footer. Until then, pages use the contact details.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Footer saved.</p>
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
        Use a custom footer for this microsite
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
        <span className="font-medium text-slate-700">Description (English)</span>
        <textarea name="descriptionEn" rows={2} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Description (Hindi)</span>
        <textarea name="descriptionHi" rows={2} value={descriptionHi} onChange={(e) => setDescriptionHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Address (English)</span>
        <input name="addressEn" value={addressEn} onChange={(e) => setAddressEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Address (Hindi)</span>
        <input name="addressHi" value={addressHi} onChange={(e) => setAddressHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <input name="phone" defaultValue={footer.phone} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Email</span>
          <input name="email" type="text" defaultValue={footer.email} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>

      <div className="space-y-6">
        <p className="text-sm font-medium text-slate-700">Four footer columns</p>
        <p className="text-sm text-slate-500">
          Column 1 is Visit Us and uses the name, description, address, phone, and email above.
          Columns 2, 3, and 4 are link lists. Change each column heading here.
        </p>
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Column {sectionIndex + 1}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Heading (English)</span>
                <input
                  name={`sectionTitleEn${sectionIndex}`}
                  value={section.titleEn}
                  onChange={(e) => updateSection(sectionIndex, { titleEn: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Heading (Hindi)</span>
                <input
                  name={`sectionTitleHi${sectionIndex}`}
                  value={section.titleHi}
                  onChange={(e) => updateSection(sectionIndex, { titleHi: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
                />
              </label>
            </div>
            {sectionIndex === 3 && (
              <label className="flex items-start gap-2 text-sm text-slate-800">
                <input
                  name="useHauLinks"
                  type="checkbox"
                  checked={useHauLinks}
                  onChange={(e) => setUseHauLinks(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Add HAU Links</span>
                  <span className="mt-0.5 block text-slate-500">
                    Checked: column 4 shows the homepage menu, with one submenu level.
                    Unchecked: column 4 shows the links below.
                  </span>
                </span>
              </label>
            )}
            {sectionIndex > 0 && (
              <div className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <div key={linkIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                      name={`linkLabelEn${sectionIndex}`}
                      placeholder="English label"
                      value={link.labelEn}
                      onChange={(e) => updateLink(sectionIndex, linkIndex, "labelEn", e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      name={`linkLabelHi${sectionIndex}`}
                      placeholder="Hindi label"
                      value={link.labelHi}
                      onChange={(e) => updateLink(sectionIndex, linkIndex, "labelHi", e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 font-hindi text-sm"
                    />
                    <input
                      name={`linkHref${sectionIndex}`}
                      placeholder="/college/… or https://"
                      value={link.href}
                      onChange={(e) => updateLink(sectionIndex, linkIndex, "href", e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => deleteLink(sectionIndex, linkIndex)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50"
                      aria-label={`Delete link ${linkIndex + 1}`}
                      title="Delete link"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
                {section.links.length < 30 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateSection(sectionIndex, {
                        links: [...section.links, { labelEn: "", labelHi: "", href: "" }],
                      })
                    }
                    className="text-sm font-medium text-emerald-800 hover:underline"
                  >
                    Add link
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : "Save footer"}
        </button>
        <Link href={`/admin/register/${collegePageId}`} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}
