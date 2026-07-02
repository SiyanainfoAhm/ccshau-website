"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPageAction, updatePageAction } from "@/actions/pages";
import type { Page } from "@/lib/database/types";
import type { PagePathAncestors } from "@/lib/pages/resolve-public-path";
import { resolvePublicPagePath } from "@/lib/pages/resolve-public-path";
import { slugify } from "@/lib/utils/slug";

interface Department {
  id: string;
  slug: string;
  name_en: string;
}

interface ParentOption {
  id: string;
  slug: string;
  title_en: string;
  page_type: Page["page_type"];
  publicPath: string;
  ancestors: PagePathAncestors;
}

export function PageForm({
  departments,
  parentPages,
  page,
}: {
  departments: Department[];
  parentPages: ParentOption[];
  page?: Page;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(page?.title_en ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [pageType, setPageType] = useState<Page["page_type"]>(page?.page_type ?? "standard");
  const [layoutTemplate, setLayoutTemplate] = useState<Page["layout_template"]>(
    page?.layout_template ?? "college_home",
  );
  const [parentId, setParentId] = useState(page?.parent_id ?? "");

  function handleTitleBlur() {
    if (!page && titleEn && !slug) {
      setSlug(slugify(titleEn));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = page
        ? await updatePageAction(page.id, formData)
        : await createPageAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(page ? `/admin/pages/${page.id}` : `/admin/pages/${result.data.id}`);
      router.refresh();
    });
  }

  const selectedParent = parentPages.find((p) => p.id === parentId);
  const previewPath = slug
    ? selectedParent
      ? resolvePublicPagePath(slug, pageType, {
          parentSlug: selectedParent.slug,
          parentPageType: selectedParent.page_type,
          grandparentSlug: selectedParent.ancestors.grandparentSlug,
          grandparentPageType: selectedParent.ancestors.grandparentPageType,
        })
      : resolvePublicPagePath(slug, pageType)
    : null;

  return (
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Page type</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Template</span>
            <select
              name="pageType"
              value={pageType}
              onChange={(e) => {
                const next = e.target.value as Page["page_type"];
                setPageType(next);
                if (next === "standard") setLayoutTemplate("standard");
                else if (layoutTemplate === "standard") setLayoutTemplate("college_home");
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="standard">Standard page (/pages/slug)</option>
              <option value="college">College landing (/college/slug)</option>
            </select>
          </label>
          {pageType === "college" && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Layout template</span>
              <select
                name="layoutTemplate"
                value={layoutTemplate}
                onChange={(e) =>
                  setLayoutTemplate(e.target.value as Page["layout_template"])
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="college_home">College home (hero + content)</option>
                <option value="office_portal">Office portal (sidebars + contacts)</option>
              </select>
            </label>
          )}
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Parent page</span>
            <select
              name="parentId"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">— None (top level) —</option>
              {parentPages
                .filter((p) => p.id !== page?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title_en} ({p.publicPath})
                  </option>
                ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              Child of a college → college tab (or dropdown if it has sub-pages). Child of a
              section (e.g. Department) → item inside that section&apos;s dropdown menu.
            </span>
          </label>
        </div>
        {previewPath && (
          <p className="mt-3 text-sm text-emerald-800">
            Public URL: <code className="rounded bg-emerald-50 px-2 py-0.5">{previewPath}</code>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Page content</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title (English)</label>
            <input
              name="titleEn"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title (Hindi)</label>
            <input
              name="titleHi"
              defaultValue={page?.title_hi ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">URL slug</label>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Excerpt (English)</label>
            <textarea
              name="excerptEn"
              rows={2}
              defaultValue={page?.excerpt_en ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Excerpt (Hindi)</label>
            <textarea
              name="excerptHi"
              rows={2}
              defaultValue={page?.excerpt_hi ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Content (English)</label>
            <textarea
              name="contentEn"
              rows={8}
              defaultValue={page?.content_en ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Content (Hindi)</label>
            <textarea
              name="contentHi"
              rows={8}
              defaultValue={page?.content_hi ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
        </div>
      </div>

      {pageType === "college" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">College images</h2>
          <p className="mb-4 text-sm text-slate-600">
            Paste a Supabase storage path or a full https:// image URL.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Hero background image</span>
              <input
                name="featuredImagePath"
                defaultValue={page?.featured_image_path ?? ""}
                placeholder="https://... or bucket/path"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">College logo</span>
              <input
                name="logoImagePath"
                defaultValue={page?.logo_image_path ?? ""}
                placeholder="https://... or bucket/path"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>
        </div>
      )}

      {pageType === "college" && layoutTemplate === "office_portal" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Office portal — head officer</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name (English)</span>
              <input
                name="headNameEn"
                defaultValue={page?.head_name_en ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name (Hindi)</span>
              <input
                name="headNameHi"
                defaultValue={page?.head_name_hi ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Role / titles (English, one per line)</span>
              <textarea
                name="headRoleEn"
                rows={2}
                defaultValue={page?.head_role_en ?? ""}
                placeholder={"Registrar\nChief Vigilance Officer"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Role / titles (Hindi)</span>
              <textarea
                name="headRoleHi"
                rows={2}
                defaultValue={page?.head_role_hi ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Photo URL</span>
              <input
                name="headImagePath"
                defaultValue={page?.head_image_path ?? ""}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                name="officeCtaEnabled"
                type="checkbox"
                defaultChecked={page?.office_cta_enabled ?? true}
              />
              Show farmers&apos; portal band on this office page
            </label>
          </div>
          {page && (
            <p className="mt-4 text-sm text-emerald-800">
              Manage contact lines, staff table, and left/right quick links in the panel below after saving.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Publishing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select
              name="departmentId"
              defaultValue={page?.department_id ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              name="status"
              defaultValue={page?.status ?? "draft"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Meta title</label>
            <input
              name="metaTitle"
              defaultValue={page?.meta_title ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Meta description</label>
            <input
              name="metaDescription"
              defaultValue={page?.meta_description ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 font-semibold text-white hover:bg-[#0d4a38] disabled:opacity-60"
        >
          {isPending ? "Saving…" : page ? "Update page" : "Create page"}
        </button>
        <Link href="/admin/pages" className="text-sm text-slate-600 hover:text-emerald-800">
          Cancel
        </Link>
      </div>
    </form>
  );
}
