"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateFacultyPersonAction } from "@/actions/college-register";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import { AdminHtmlField } from "@/components/admin/admin-html-field";
import type { FacultyPerson } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/urls";

export function FacultyPersonEditor({
  person,
  readOnly = false,
  successMessage,
  ownProfileOnly = false,
}: {
  person: FacultyPerson;
  readOnly?: boolean;
  successMessage?: string;
  ownProfileOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [nameEn, setNameEn] = useState(person.name_en);
  const [nameHi, setNameHi] = useState(person.name_hi ?? "");
  const [specializationEn, setSpecializationEn] = useState(person.specialization_en ?? "");
  const [specializationHi, setSpecializationHi] = useState(person.specialization_hi ?? "");
  const [experienceEn, setExperienceEn] = useState(person.experience_en ?? "");
  const [experienceHi, setExperienceHi] = useState(person.experience_hi ?? "");
  const [qualificationEn, setQualificationEn] = useState(person.qualification_en ?? "");
  const [qualificationHi, setQualificationHi] = useState(person.qualification_hi ?? "");
  const [detailContentEn, setDetailContentEn] = useState(person.detail_content_en ?? "");
  const [detailContentHi, setDetailContentHi] = useState(person.detail_content_hi ?? "");
  const previewUrl =
    person.image_path && person.image_path !== "pending" ? getStoredFileUrl(person.image_path) : null;
  const externalImageUrl =
    person.image_path?.startsWith("http://") || person.image_path?.startsWith("https://")
      ? person.image_path
      : "";

  async function handleAutoTranslate(
    fields: { key: string; text: string; format?: "text" | "html" }[],
    apply: (translated: Record<string, string>) => void,
  ) {
    setError(null);
    setIsTranslating(true);
    try {
      const result = await translateFieldsEnToHiAction(fields);
      if (!result.success) {
        setError(result.error);
        return;
      }
      apply(result.data.translations);
    } finally {
      setIsTranslating(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateFacultyPersonAction(person.id, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(
        successMessage ?? "Shared profile saved. Other Activities now match on every assignment.",
      );
      router.refresh();
    });
  }

  const disabled = readOnly || isPending || isTranslating;

  return (
    <form action={readOnly ? undefined : handleSubmit} className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}

      <fieldset disabled={readOnly} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {ownProfileOnly ? "Your profile" : "Shared profile"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {ownProfileOnly
                  ? "You can change only your own name, photo, contact details, specialization, and Other Activities. Use Change password below to update your login password."
                  : "Name, photo, contact, qualification, and Other Activities apply everywhere this person is assigned."}
              </p>
            </div>
            {!readOnly ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleAutoTranslate(
                    [
                      { key: "nameHi", text: nameEn },
                      { key: "specializationHi", text: specializationEn },
                    ],
                    (t) => {
                      if (t.nameHi) setNameHi(t.nameHi);
                      if (t.specializationHi) setSpecializationHi(t.specializationHi);
                    },
                  )
                }
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                {isTranslating ? "Translating…" : "Auto-translate names"}
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Name (English)</span>
              <input name="nameEn" required value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Name (Hindi)</span>
              <input name="nameHi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Mobile</span>
              <input name="mobile" defaultValue={person.mobile ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input name="email" type="email" defaultValue={person.email ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Specialization (default)</span>
              <textarea name="specializationEn" rows={2} value={specializationEn} onChange={(e) => setSpecializationEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Specialization (Hindi)</span>
              <textarea name="specializationHi" rows={2} value={specializationHi} onChange={(e) => setSpecializationHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
            </label>
            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Photo</span>
              {previewUrl ? (
                <div className="relative h-40 w-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <Image src={previewUrl} alt="" fill className="object-cover object-top" unoptimized />
                </div>
              ) : null}
              {!readOnly ? (
                <AdminFileUploadField name="image" accept="image/jpeg,image/png,image/webp,image/gif" kind="image" label={previewUrl ? "Replace photo" : "Upload photo"} hint="JPEG, PNG, WebP or GIF" />
              ) : null}
              <input name="imagePath" type="url" defaultValue={externalImageUrl} placeholder="https://..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Other Activities / full profile</h2>
              <p className="mt-1 text-xs text-slate-500">Edited once. Shows on every department and station assignment.</p>
            </div>
            {!readOnly ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleAutoTranslate(
                    [
                      { key: "experienceHi", text: experienceEn },
                      { key: "qualificationHi", text: qualificationEn },
                      { key: "detailContentHi", text: detailContentEn, format: "html" },
                    ],
                    (t) => {
                      if (t.experienceHi) setExperienceHi(t.experienceHi);
                      if (t.qualificationHi) setQualificationHi(t.qualificationHi);
                      if (t.detailContentHi) setDetailContentHi(t.detailContentHi);
                    },
                  )
                }
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                {isTranslating ? "Translating…" : "Auto-translate profile"}
              </button>
            ) : null}
          </div>
          <div className="grid gap-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Experience</span>
              <input name="experienceEn" value={experienceEn} onChange={(e) => setExperienceEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Experience (Hindi)</span>
              <input name="experienceHi" value={experienceHi} onChange={(e) => setExperienceHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Qualification</span>
              <input name="qualificationEn" value={qualificationEn} onChange={(e) => setQualificationEn(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Qualification (Hindi)</span>
              <input name="qualificationHi" value={qualificationHi} onChange={(e) => setQualificationHi(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
            </label>
            <AdminHtmlField
              name="detailContentEn"
              label="Full profile (English)"
              value={detailContentEn}
              onChange={setDetailContentEn}
              rows={12}
              disabled={disabled}
            />
            <AdminHtmlField
              name="detailContentHi"
              label="Full profile (Hindi)"
              value={detailContentHi}
              onChange={setDetailContentHi}
              rows={6}
              disabled={disabled}
              hindi
            />
          </div>
        </section>
      </fieldset>

      {!readOnly && (
        <button type="submit" disabled={isPending} className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60">
          {isPending ? "Saving…" : "Save shared profile"}
        </button>
      )}
    </form>
  );
}
