"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GraduationCap } from "lucide-react";

import { registerDepartmentAction } from "@/actions/college-register";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import type { CollegeOption } from "@/lib/pages/college-register-helpers";
import { slugify } from "@/lib/utils/slug";

type DepartmentEditData = {
  id: string;
  collegePageId: string;
  collegeTitle: string;
  titleEn: string;
  titleHi: string | null;
  slug: string;
  excerptEn: string | null;
  contentEn: string | null;
};

export function RegisterDepartmentForm({
  colleges,
  department,
  defaultCollegeId,
  returnHref,
  inDialog = false,
  onCancel,
  onSuccess,
  readOnly = false,
}: {
  colleges: CollegeOption[];
  department?: DepartmentEditData;
  defaultCollegeId?: string;
  returnHref?: string;
  inDialog?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(department?.titleEn ?? "");
  const [titleHi, setTitleHi] = useState(department?.titleHi ?? "");
  const [slug, setSlug] = useState(department?.slug ?? "");
  const isEdit = Boolean(department);

  function handleTitleBlur() {
    if (!isEdit && !slug && titleEn) setSlug(slugify(titleEn));
  }

  async function handleAutoTranslate() {
    setError(null);
    setIsTranslating(true);
    try {
      const result = await translateFieldsEnToHiAction([{ key: "titleHi", text: titleEn }]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data.translations.titleHi) {
        setTitleHi(result.data.translations.titleHi);
      }
      if (result.data.warnings.length > 0) {
        setError(result.data.warnings.join(" "));
      } else if (Object.keys(result.data.translations).length === 0) {
        setError("Nothing was translated. Enter English department name first.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const { updateDepartmentAction } = await import("@/actions/college-register");
      const result = isEdit
        ? await updateDepartmentAction(department!.id, formData)
        : await registerDepartmentAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (inDialog && onSuccess) {
        onSuccess();
        return;
      }
      router.push(returnHref ?? "/admin/register");
      router.refresh();
    });
  }

  const translateDisabled = readOnly || isPending || isTranslating;

  return (
    <form action={readOnly ? undefined : handleSubmit} className={inDialog ? "space-y-6" : "mx-auto max-w-2xl space-y-6"}>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <fieldset disabled={readOnly} className={readOnly ? "contents" : undefined}>
      <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${inDialog ? "border-0 p-0 shadow-none" : ""} ${readOnly ? "pointer-events-none opacity-90" : ""}`}>
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${inDialog ? "mb-0" : ""}`}>
          {!inDialog && (
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <GraduationCap className="h-5 w-5 text-emerald-700" aria-hidden />
              Department details
            </h2>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={translateDisabled}
              className={`rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 ${inDialog ? "ml-auto" : ""}`}
            >
              {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
            </button>
          )}
        </div>
        <div className={`grid gap-4 ${inDialog ? "mt-4" : ""}`}>
          {!isEdit && defaultCollegeId ? (
            <input type="hidden" name="collegePageId" value={defaultCollegeId} />
          ) : !isEdit ? (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">College</span>
              <select
                name="collegePageId"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select college</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title_en}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!isEdit && defaultCollegeId && (
            <p className="text-sm text-slate-600">
              College:{" "}
              <span className="font-medium text-slate-900">
                {colleges.find((c) => c.id === defaultCollegeId)?.title_en ?? "Selected college"}
              </span>
            </p>
          )}
          {isEdit && (
            <p className="text-sm text-slate-600">
              College: <span className="font-medium text-slate-900">{department!.collegeTitle}</span>
            </p>
          )}
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Department name (English)</span>
            <input
              name="titleEn"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="e.g. Agricultural Economics"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Department name (Hindi)</span>
            <input
              name="titleHi"
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">URL slug</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Short description</span>
            <textarea
              name="excerptEn"
              rows={2}
              defaultValue={department?.excerptEn ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">About (HTML, optional)</span>
            <textarea
              name="contentEn"
              rows={4}
              defaultValue={department?.contentEn ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Creates an office-portal department page with Faculty sidebar and staff directory enabled.
        </p>
      </section>
      </fieldset>

      <div className="flex gap-3">
        {!readOnly && (
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-60"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add department"}
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
            href={
              returnHref ??
              (department?.collegePageId
                ? `/admin/register/${department.collegePageId}/department`
                : "/admin/register")
            }
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
    </form>
  );
}
