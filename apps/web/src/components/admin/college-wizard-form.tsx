"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { registerCollegeAction } from "@/actions/college-wizard";
import { suggestSlugAction } from "@/actions/pages";
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
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [shortPrefix, setShortPrefix] = useState("");
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

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <input type="hidden" name="micrositeBlueprint" value={defaultBlueprint} />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {isDirectorate ? "Directorate identity" : "College identity"}
        </h2>
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
            <textarea name="excerptEn" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">About content (English HTML)</span>
            <textarea name="contentEn" rows={6} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">About content (Hindi HTML)</span>
            <textarea name="contentHi" rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Branding & head officer</h2>
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
            <input name="headNameEn" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Head role (EN)</span>
            <input name="headRoleEn" placeholder="Dean" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Head photo URL</span>
            <input name="headImagePath" type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Contact & location</h2>
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
              placeholder="College name, CCS HAU, Hisar - 125004, Haryana, India"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Mailing address (Hindi, optional)</span>
            <textarea name="addressHi" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
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
                type="email"
                required
                placeholder="college@hau.ac.in"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
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
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-60"
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
