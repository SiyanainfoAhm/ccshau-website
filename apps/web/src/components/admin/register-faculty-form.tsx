"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { registerFacultyAction } from "@/actions/college-register";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import { slugify } from "@/lib/utils/slug";
import type { PageStaff } from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/urls";

type DepartmentOption = {
  id: string;
  slug: string;
  title_en: string;
  college_title: string;
};

export function RegisterFacultyForm({
  departments,
  faculty,
  returnHref,
  inDialog = false,
  onCancel,
  onSuccess,
  readOnly = false,
}: {
  departments: DepartmentOption[];
  faculty?: PageStaff;
  returnHref?: string;
  inDialog?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [memberType, setMemberType] = useState<"hod" | "faculty">(faculty?.member_type ?? "faculty");
  const [nameEn, setNameEn] = useState(faculty?.name_en ?? "");
  const [nameHi, setNameHi] = useState(faculty?.name_hi ?? "");
  const [designationEn, setDesignationEn] = useState(faculty?.designation_en ?? "");
  const [designationHi, setDesignationHi] = useState(faculty?.designation_hi ?? "");
  const [specializationEn, setSpecializationEn] = useState(faculty?.specialization_en ?? "");
  const [specializationHi, setSpecializationHi] = useState(faculty?.specialization_hi ?? "");
  const [experienceEn, setExperienceEn] = useState(faculty?.experience_en ?? "");
  const [experienceHi, setExperienceHi] = useState(faculty?.experience_hi ?? "");
  const [qualificationEn, setQualificationEn] = useState(faculty?.qualification_en ?? "");
  const [qualificationHi, setQualificationHi] = useState(faculty?.qualification_hi ?? "");
  const [detailContentEn, setDetailContentEn] = useState(faculty?.detail_content_en ?? "");
  const [detailContentHi, setDetailContentHi] = useState(faculty?.detail_content_hi ?? "");
  const [staffSlug, setStaffSlug] = useState(faculty?.staff_slug ?? "");
  const isEdit = Boolean(faculty);
  const previewUrl =
    faculty?.image_path && faculty.image_path !== "pending"
      ? getStoredFileUrl(faculty.image_path)
      : null;
  const externalImageUrl =
    faculty?.image_path?.startsWith("http://") || faculty?.image_path?.startsWith("https://")
      ? faculty.image_path
      : "";

  function handleNameBlur() {
    if (!staffSlug && nameEn) setStaffSlug(slugify(nameEn));
  }

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
      if (result.data.warnings.length > 0) {
        setError(result.data.warnings.join(" "));
      } else if (Object.keys(result.data.translations).length === 0) {
        setError("Nothing was translated. Enter English text first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  }

  function handleTranslateListRow() {
    return handleAutoTranslate(
      [
        { key: "nameHi", text: nameEn },
        { key: "designationHi", text: designationEn },
        { key: "specializationHi", text: specializationEn },
      ],
      (translated) => {
        if (translated.nameHi) setNameHi(translated.nameHi);
        if (translated.designationHi) setDesignationHi(translated.designationHi);
        if (translated.specializationHi) setSpecializationHi(translated.specializationHi);
      },
    );
  }

  function handleTranslateProfile() {
    return handleAutoTranslate(
      [
        { key: "experienceHi", text: experienceEn },
        { key: "qualificationHi", text: qualificationEn },
        { key: "detailContentHi", text: detailContentEn, format: "html" },
      ],
      (translated) => {
        if (translated.experienceHi) setExperienceHi(translated.experienceHi);
        if (translated.qualificationHi) setQualificationHi(translated.qualificationHi);
        if (translated.detailContentHi) setDetailContentHi(translated.detailContentHi);
      },
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const { updateFacultyAction } = await import("@/actions/college-register");
      const result = isEdit
        ? await updateFacultyAction(faculty!.id, formData)
        : await registerFacultyAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (inDialog && onSuccess) {
        onSuccess();
        if (result.data.detailPath) {
          window.open(result.data.detailPath, "_blank");
        }
        return;
      }
      router.push(returnHref ?? "/admin/register");
      router.refresh();
      if (!isEdit && result.data.detailPath) {
        window.open(result.data.detailPath, "_blank");
      }
    });
  }

  const sectionClass = inDialog
    ? "space-y-4 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0"
    : "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
  const translateDisabled = readOnly || isPending || isTranslating;

  return (
    <form action={readOnly ? undefined : handleSubmit} className={inDialog ? "space-y-4" : "mx-auto max-w-3xl space-y-6"}>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <fieldset disabled={readOnly} className={readOnly ? "contents" : undefined}>
      <section className={`${sectionClass} ${readOnly ? "pointer-events-none opacity-90" : ""}`}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Department & role</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Department</span>
            <select
              name="departmentPageId"
              required
              defaultValue={faculty?.page_id ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.college_title} → {d.title_en}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium text-slate-700">Member type</legend>
            <div className="mt-2 flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="memberType"
                  value="hod"
                  checked={memberType === "hod"}
                  onChange={() => setMemberType("hod")}
                />
                Head of Department (HOD)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="memberType"
                  value="faculty"
                  checked={memberType === "faculty"}
                  onChange={() => setMemberType("faculty")}
                />
                Faculty
              </label>
            </div>
            {memberType === "hod" && (
              <p className="mt-2 text-xs text-amber-700">
                HOD is stored once in the faculty list. It appears on Head of Department and Faculty pages on the public site.
              </p>
            )}
          </fieldset>
        </div>
      </section>

      <section className={`${sectionClass} ${readOnly ? "pointer-events-none opacity-90" : ""}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Faculty list row</h2>
            <p className="mt-1 text-xs text-slate-500">
              Shown in the department Faculty table (name, photo, designation, specialization).
            </p>
          </div>
          {!readOnly ? (
            <button
              type="button"
              onClick={handleTranslateListRow}
              disabled={translateDisabled}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Name (English)</span>
            <input
              name="nameEn"
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              onBlur={handleNameBlur}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Name (Hindi)</span>
            <input
              name="nameHi"
              value={nameHi}
              onChange={(e) => setNameHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Designation</span>
            <input
              name="designationEn"
              required
              value={designationEn}
              onChange={(e) => setDesignationEn(e.target.value)}
              placeholder={memberType === "hod" ? "Professor and Head" : "Assistant Professor"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Designation (Hindi)</span>
            <input
              name="designationHi"
              value={designationHi}
              onChange={(e) => setDesignationHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Specialization</span>
            <textarea
              name="specializationEn"
              rows={2}
              value={specializationEn}
              onChange={(e) => setSpecializationEn(e.target.value)}
              placeholder="Molecular Genetics, Genomics and Plant Biotechnology"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Specialization (Hindi)</span>
            <textarea
              name="specializationHi"
              rows={2}
              value={specializationHi}
              onChange={(e) => setSpecializationHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Display order</span>
            <input
              name="sortOrder"
              type="number"
              min={0}
              step={1}
              defaultValue={
                faculty?.sort_order ?? (memberType === "hod" ? 0 : 1)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Lower numbers appear first on the public Faculty list (e.g. 1, 2, 3…).
            </span>
          </label>
          <div className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Photo</span>
            {previewUrl ? (
              <div className="relative h-40 w-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <Image src={previewUrl} alt="" fill className="object-cover object-top" unoptimized />
              </div>
            ) : null}
            {!readOnly ? (
              <AdminFileUploadField
                name="image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                kind="image"
                label={previewUrl ? "Replace photo" : "Upload photo"}
                hint="JPEG, PNG, WebP or GIF"
              />
            ) : null}
            <p className="text-xs text-slate-500">Or paste an external image URL:</p>
            <input
              name="imagePath"
              type="url"
              defaultValue={externalImageUrl}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className={`${sectionClass} ${readOnly ? "pointer-events-none opacity-90" : ""}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Profile detail page</h2>
            <p className="mt-1 text-xs text-slate-500">
              Full CV-style content (education, publications, awards). Paste HTML or plain sections.
            </p>
          </div>
          {!readOnly ? (
            <button
              type="button"
              onClick={handleTranslateProfile}
              disabled={translateDisabled}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
            </button>
          ) : null}
        </div>
        <div className="grid gap-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Profile URL slug</span>
            <input
              name="staffSlug"
              required
              value={staffSlug}
              onChange={(e) => setStaffSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Mobile</span>
              <input name="mobile" defaultValue={faculty?.mobile ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input name="email" type="email" defaultValue={faculty?.email ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Experience</span>
            <input
              name="experienceEn"
              value={experienceEn}
              onChange={(e) => setExperienceEn(e.target.value)}
              placeholder="e.g. 15 years"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Experience (Hindi)</span>
            <input
              name="experienceHi"
              value={experienceHi}
              onChange={(e) => setExperienceHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Qualification</span>
            <input
              name="qualificationEn"
              value={qualificationEn}
              onChange={(e) => setQualificationEn(e.target.value)}
              placeholder="e.g. Ph.D. (Agricultural Economics)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Qualification (Hindi)</span>
            <input
              name="qualificationHi"
              value={qualificationHi}
              onChange={(e) => setQualificationHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Full profile (English HTML)</span>
            <textarea
              name="detailContentEn"
              rows={12}
              value={detailContentEn}
              onChange={(e) => setDetailContentEn(e.target.value)}
              placeholder="<h3>Educational Qualifications</h3><table>...</table>"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Full profile (Hindi HTML)</span>
            <textarea
              name="detailContentHi"
              rows={6}
              value={detailContentHi}
              onChange={(e) => setDetailContentHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-hindi"
            />
          </label>
        </div>
      </section>
      </fieldset>

      <div className="flex gap-3">
        {!readOnly && (
        <button
          type="submit"
          disabled={isPending || departments.length === 0}
          className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add faculty"}
        </button>
        )}
        {inDialog ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm"
          >
            Cancel
          </button>
        ) : isEdit ? (
          <Link
            href={returnHref ?? "/admin/register"}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm"
          >
            Back
          </Link>
        ) : (
          <Link
            href={returnHref ?? "/admin/register"}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm"
          >
            Back
          </Link>
        )}
      </div>
      {!inDialog && departments.length === 0 && (
        <p className="text-sm text-amber-700">
          Register a department first — there are no department pages yet.
        </p>
      )}
    </form>
  );
}
