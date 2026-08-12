"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { registerCollegeAction } from "@/actions/college-wizard";
import { suggestSlugAction } from "@/actions/pages";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { COLLEGE_ROLE_LABELS } from "@/lib/validations/users";
import { slugify } from "@/lib/utils/slug";

type UserOption = { id: string; display_name: string; email: string };
type MicrositeBlueprint = "academic_college" | "directorate";

export function CollegeWizardForm({
  users,
  defaultBlueprint = "academic_college",
}: {
  users: UserOption[];
  defaultBlueprint?: MicrositeBlueprint;
}) {
  const isDirectorate = defaultBlueprint === "directorate";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [slug, setSlug] = useState("");
  const [shortPrefix, setShortPrefix] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [excerptHi, setExcerptHi] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [contentHi, setContentHi] = useState("");
  const [headNameEn, setHeadNameEn] = useState("");
  const [headNameHi, setHeadNameHi] = useState("");
  const [headRoleEn, setHeadRoleEn] = useState("");
  const [headRoleHi, setHeadRoleHi] = useState("");
  const [addressEn, setAddressEn] = useState("");
  const [addressHi, setAddressHi] = useState("");
  const [assignUser, setAssignUser] = useState("");

  function handleTitleBlur() {
    if (!slug && titleEn) {
      const next = slugify(titleEn);
      setSlug(next);
      if (!shortPrefix) {
        const parts = next.split("-").filter(Boolean);
        setShortPrefix(parts[parts.length - 1] ?? parts[0] ?? "");
      }
    }
  }

  async function handleSuggestSlug() {
    if (!titleEn) return;
    const next = await suggestSlugAction(titleEn);
    setSlug(next);
    if (!shortPrefix) {
      const parts = next.split("-").filter(Boolean);
      setShortPrefix(parts[parts.length - 1] ?? parts[0] ?? "");
    }
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

  function handleTranslateIdentityAndContent() {
    return handleAutoTranslate(
      [
        { key: "titleHi", text: titleEn },
        { key: "excerptHi", text: excerptEn },
        { key: "contentHi", text: contentEn, format: "html" },
      ],
      (translated) => {
        if (translated.titleHi) setTitleHi(translated.titleHi);
        if (translated.excerptHi) setExcerptHi(translated.excerptHi);
        if (translated.contentHi) setContentHi(translated.contentHi);
      },
    );
  }

  function handleTranslateHeadOfficer() {
    return handleAutoTranslate(
      [
        { key: "headNameHi", text: headNameEn },
        { key: "headRoleHi", text: headRoleEn },
      ],
      (translated) => {
        if (translated.headNameHi) setHeadNameHi(translated.headNameHi);
        if (translated.headRoleHi) setHeadRoleHi(translated.headRoleHi);
      },
    );
  }

  function handleTranslateAddress() {
    return handleAutoTranslate(
      [{ key: "addressHi", text: addressEn }],
      (translated) => {
        if (translated.addressHi) setAddressHi(translated.addressHi);
      },
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await registerCollegeAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/admin/register/${result.data.collegePageId}`);
      router.refresh();
    });
  }

  const translateDisabled = isPending || isTranslating;

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <input type="hidden" name="micrositeBlueprint" value={defaultBlueprint} />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {isDirectorate ? "Directorate identity" : "College identity"}
          </h2>
          <button
            type="button"
            onClick={handleTranslateIdentityAndContent}
            disabled={translateDisabled}
            className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">English title</span>
            <input
              name="titleEn"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              onBlur={handleTitleBlur}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Hindi title</span>
            <input
              name="titleHi"
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">URL slug</span>
            <div className="mt-1 flex gap-2">
              <input
                name="slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSuggestSlug}
                className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm"
              >
                Suggest
              </button>
            </div>
            <span className="mt-1 block text-xs text-slate-500">Public URL: /college/{slug || "…"}</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Section slug prefix</span>
            <input
              name="shortPrefix"
              required
              value={shortPrefix}
              onChange={(e) => setShortPrefix(e.target.value)}
              placeholder="coaet"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Creates {shortPrefix || "prefix"}-department and {shortPrefix || "prefix"}-gallery
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Landing content</h2>
        <div className="grid gap-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Excerpt (English)</span>
            <textarea
              name="excerptEn"
              rows={2}
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Excerpt (Hindi)</span>
            <textarea
              name="excerptHi"
              rows={2}
              value={excerptHi}
              onChange={(e) => setExcerptHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">About content (English HTML)</span>
            <textarea
              name="contentEn"
              rows={6}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">About content (Hindi HTML)</span>
            <textarea
              name="contentHi"
              rows={4}
              value={contentHi}
              onChange={(e) => setContentHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-hindi"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Branding & head officer</h2>
          <button
            type="button"
            onClick={handleTranslateHeadOfficer}
            disabled={translateDisabled}
            className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Featured image URL</span>
            <input name="featuredImagePath" type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Logo image URL</span>
            <input name="logoImagePath" type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Head name (EN)</span>
            <input
              name="headNameEn"
              value={headNameEn}
              onChange={(e) => setHeadNameEn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Head name (HI)</span>
            <input
              name="headNameHi"
              value={headNameHi}
              onChange={(e) => setHeadNameHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Head role (EN)</span>
            <input
              name="headRoleEn"
              value={headRoleEn}
              onChange={(e) => setHeadRoleEn(e.target.value)}
              placeholder="Dean"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Head role (HI)</span>
            <input
              name="headRoleHi"
              value={headRoleHi}
              onChange={(e) => setHeadRoleHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Head photo URL</span>
            <input name="headImagePath" type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Contact & location</h2>
          <button
            type="button"
            onClick={handleTranslateAddress}
            disabled={translateDisabled}
            className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Shown on the college contact page and home contact block.
        </p>
        <div className="grid gap-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Mailing address (English)</span>
            <textarea
              name="addressEn"
              required
              rows={3}
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
              placeholder="College name, CCS HAU, Hisar - 125004, Haryana, India"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Mailing address (Hindi, optional)</span>
            <textarea
              name="addressHi"
              rows={2}
              value={addressHi}
              onChange={(e) => setAddressHi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Phone</span>
              <input
                name="phone"
                required
                placeholder="+91 01662255401"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input
                name="email"
                type="text"
                inputMode="email"
                required
                placeholder="college@hau.ac.in, second@hau.ac.in"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Up to 2 emails, separated by a comma
              </span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Latitude (optional)</span>
              <input
                name="mapLat"
                type="number"
                step="any"
                placeholder="29.1492"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Longitude (optional)</span>
              <input
                name="mapLng"
                type="number"
                step="any"
                placeholder="75.7217"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Default microsite structure</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="seedDefaultSections" value="on" defaultChecked className="rounded" />
          <span>Create Department and Gallery section pages</span>
        </label>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Department names (one per line, optional)</span>
          <textarea
            name="departmentNames"
            rows={6}
            placeholder={"Basic Engineering\nFarm Machinery & Power Engineering\nProcessing and Food Engineering"}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Each line becomes a department sub-page under the Department section.
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Publish & assign staff</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select name="status" defaultValue="draft" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="draft">Draft</option>
              <option value="published">
                {isDirectorate
                  ? "Published (live at /college/slug; header menu entry unchanged)"
                  : "Published (adds to Academics → Colleges menu)"}
              </option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Assign college admin (optional)</span>
            <select
              name="assignUserId"
              value={assignUser}
              onChange={(e) => setAssignUser(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">— None —</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name} ({user.email})
                </option>
              ))}
            </select>
          </label>
          {assignUser && (
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">College role</span>
              <select name="collegeRole" required defaultValue="college_admin" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                {Object.entries(COLLEGE_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
        >
          {isPending
            ? isDirectorate
              ? "Creating directorate…"
              : "Creating college…"
            : isDirectorate
              ? "Register directorate"
              : "Register college"}
        </button>
        <Link
          href="/admin/register"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
