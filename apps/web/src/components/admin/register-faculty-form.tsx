"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { registerFacultyAction } from "@/actions/college-register";
import { slugify } from "@/lib/utils/slug";
import type { PageStaff } from "@/lib/database/types";

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
  const [memberType, setMemberType] = useState<"hod" | "faculty">(faculty?.member_type ?? "faculty");
  const [nameEn, setNameEn] = useState(faculty?.name_en ?? "");
  const [staffSlug, setStaffSlug] = useState(faculty?.staff_slug ?? "");
  const isEdit = Boolean(faculty);

  function handleNameBlur() {
    if (!staffSlug && nameEn) setStaffSlug(slugify(nameEn));
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Faculty list row</h2>
        <p className="mb-4 text-xs text-slate-500">Shown in the department Faculty table (name, photo, designation, specialization).</p>
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
            <input name="nameHi" defaultValue={faculty?.name_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Designation</span>
            <input
              name="designationEn"
              required
              defaultValue={faculty?.designation_en ?? ""}
              placeholder={memberType === "hod" ? "Professor and Head" : "Assistant Professor"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Designation (Hindi)</span>
            <input name="designationHi" defaultValue={faculty?.designation_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Specialization</span>
            <textarea
              name="specializationEn"
              rows={2}
              defaultValue={faculty?.specialization_en ?? ""}
              placeholder="Molecular Genetics, Genomics and Plant Biotechnology"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Photo URL</span>
            <input name="imagePath" type="url" defaultValue={faculty?.image_path ?? ""} placeholder="https://..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </section>

      <section className={`${sectionClass} ${readOnly ? "pointer-events-none opacity-90" : ""}`}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile detail page</h2>
        <p className="mb-4 text-xs text-slate-500">
          Full CV-style content (education, publications, awards). Paste HTML or plain sections.
        </p>
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
              defaultValue={faculty?.experience_en ?? ""}
              placeholder="e.g. 15 years"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Full profile (English HTML)</span>
            <textarea
              name="detailContentEn"
              rows={12}
              defaultValue={faculty?.detail_content_en ?? ""}
              placeholder="<h3>Educational Qualifications</h3><table>...</table>"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Full profile (Hindi HTML)</span>
            <textarea name="detailContentHi" rows={6} defaultValue={faculty?.detail_content_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
          </label>
        </div>
      </section>
      </fieldset>

      <div className="flex gap-3">
        {!readOnly && (
        <button
          type="submit"
          disabled={isPending || departments.length === 0}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-60"
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
