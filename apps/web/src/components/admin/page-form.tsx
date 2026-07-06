"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPageAction, updatePageAction } from "@/actions/pages";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { LayoutConfigAdminPanel } from "@/components/admin/layout-config-admin-panel";
import { OfficePortalAdminPanel } from "@/components/admin/office-portal-admin-panel";
import type { Page, PageContactLine, PageGalleryItem, PageSidebarItem, PageStaff } from "@/lib/database/types";
import {
  applyLayoutConfigToFormData,
  isCollegeLayoutPage,
  LAYOUT_CONFIG_KEYS,
  readStoredLayoutConfig,
  presetForLayoutTemplate,
  type PageLayoutConfig,
} from "@/lib/pages/layout-config";
import type { PagePathAncestors } from "@/lib/pages/resolve-public-path";
import {
  ancestorsForChildPage,
  isParentUnderCollege,
  resolvePublicPagePath,
} from "@/lib/pages/resolve-public-path";
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
  officePortalData,
}: {
  departments: Department[];
  parentPages: ParentOption[];
  page?: Page;
  officePortalData?: {
    contactLines: PageContactLine[];
    staff: PageStaff[];
    galleryItems: PageGalleryItem[];
    sidebarItems: PageSidebarItem[];
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(page?.title_en ?? "");
  const [titleHi, setTitleHi] = useState(page?.title_hi ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [excerptEn, setExcerptEn] = useState(page?.excerpt_en ?? "");
  const [excerptHi, setExcerptHi] = useState(page?.excerpt_hi ?? "");
  const [contentEn, setContentEn] = useState(page?.content_en ?? "");
  const [contentHi, setContentHi] = useState(page?.content_hi ?? "");
  const [headNameEn, setHeadNameEn] = useState(page?.head_name_en ?? "");
  const [headNameHi, setHeadNameHi] = useState(page?.head_name_hi ?? "");
  const [headRoleEn, setHeadRoleEn] = useState(page?.head_role_en ?? "");
  const [headRoleHi, setHeadRoleHi] = useState(page?.head_role_hi ?? "");
  const [isTranslating, setIsTranslating] = useState(false);
  const initialLayoutTemplate =
    page?.layout_template && page.layout_template !== "standard"
      ? page.layout_template
      : "college_home";

  const [pageType, setPageType] = useState<Page["page_type"]>(() =>
    page ? (isCollegeLayoutPage(page) ? "college" : page.page_type ?? "standard") : "standard",
  );
  const [layoutTemplate, setLayoutTemplate] = useState<Page["layout_template"]>(
    initialLayoutTemplate,
  );
  const [layoutConfig, setLayoutConfig] = useState<PageLayoutConfig>(() =>
    page
      ? readStoredLayoutConfig(page.layout_config, initialLayoutTemplate)
      : presetForLayoutTemplate("college_home"),
  );
  const [parentId, setParentId] = useState(page?.parent_id ?? "");

  function handleTitleBlur() {
    if (!page && titleEn && !slug) {
      setSlug(slugify(titleEn));
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
      apply(result.data);
    } finally {
      setIsTranslating(false);
    }
  }

  function handleTranslatePageContent() {
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

  function handleSubmit(formData: FormData) {
    setError(null);

    formData.set("pageType", parentId ? "standard" : pageType);
    if (showLayoutTemplate) {
      const template =
        layoutTemplate === "standard" ? "college_home" : layoutTemplate;
      formData.set("layoutTemplate", template);
      applyLayoutConfigToFormData(formData, layoutConfig);
    }

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
  const isCollegeHierarchyChild = Boolean(
    selectedParent && isParentUnderCollege(selectedParent),
  );
  const effectivePageType = parentId ? "standard" : pageType;
  const previewPath = slug
    ? selectedParent
      ? resolvePublicPagePath(slug, effectivePageType, ancestorsForChildPage(selectedParent))
      : resolvePublicPagePath(slug, effectivePageType)
    : null;

  const showLayoutTemplate = pageType === "college" || isCollegeHierarchyChild;
  const showCollegeLayout = showLayoutTemplate;
  const showHeadOfficerFields = showCollegeLayout && layoutConfig.headOfficer;
  const showOfficeDataPanel =
    showCollegeLayout &&
    (layoutConfig.contacts ||
      layoutConfig.staff ||
      layoutConfig.gallery ||
      layoutConfig.leftSidebar ||
      layoutConfig.rightSidebar);
  const showFarmersCtaField = showCollegeLayout && layoutConfig.farmersCta;

  return (
    <div className="space-y-6">
    <form action={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <input type="hidden" name="pageType" value={parentId ? "standard" : pageType} />
      <input
        type="hidden"
        name="layoutTemplate"
        value={
          showLayoutTemplate
            ? layoutTemplate === "standard"
              ? "college_home"
              : layoutTemplate
            : "standard"
        }
      />
      <input type="hidden" name="layoutConfigJson" value={JSON.stringify(layoutConfig)} />
      {LAYOUT_CONFIG_KEYS.map((key) => (
        <input
          key={key}
          type="hidden"
          name={`layout_${key}`}
          value={layoutConfig[key] ? "true" : "false"}
        />
      ))}
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
              value={pageType}
              onChange={(e) => {
                const next = e.target.value as Page["page_type"];
                setPageType(next);
                if (next === "standard") {
                  setLayoutTemplate("standard");
                  setLayoutConfig(presetForLayoutTemplate("standard"));
                } else if (layoutTemplate === "standard") {
                  setLayoutTemplate("college_home");
                  setLayoutConfig(presetForLayoutTemplate("college_home"));
                }
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="standard">Standard page (/pages/slug)</option>
              <option value="college">College landing (/college/slug)</option>
            </select>
          </label>
          {showLayoutTemplate && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Layout template</span>
              <select
                value={layoutTemplate}
                onChange={(e) => {
                  const next = e.target.value as Page["layout_template"];
                  setLayoutTemplate(next);
                  setLayoutConfig(presetForLayoutTemplate(next));
                }}
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

      {showCollegeLayout && (
        <LayoutConfigAdminPanel layoutConfig={layoutConfig} onChange={setLayoutConfig} />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Page content</h2>
          <button
            type="button"
            onClick={handleTranslatePageContent}
            disabled={isPending || isTranslating}
            className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
          </button>
        </div>
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
              value={titleHi}
              onChange={(e) => setTitleHi(e.target.value)}
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
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Excerpt (Hindi)</label>
            <textarea
              name="excerptHi"
              rows={2}
              value={excerptHi}
              onChange={(e) => setExcerptHi(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Content (English)</label>
            <textarea
              name="contentEn"
              rows={8}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Content (Hindi)</label>
            <textarea
              name="contentHi"
              rows={8}
              value={contentHi}
              onChange={(e) => setContentHi(e.target.value)}
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

      {showHeadOfficerFields && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Head officer / Dean</h2>
            <button
              type="button"
              onClick={handleTranslateHeadOfficer}
              disabled={isPending || isTranslating}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              {isTranslating ? "Translating…" : "Auto-translate to Hindi"}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name (English)</span>
              <input
                name="headNameEn"
                value={headNameEn}
                onChange={(e) => setHeadNameEn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name (Hindi)</span>
              <input
                name="headNameHi"
                value={headNameHi}
                onChange={(e) => setHeadNameHi(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Role / titles (English, one per line)</span>
              <textarea
                name="headRoleEn"
                rows={2}
                value={headRoleEn}
                onChange={(e) => setHeadRoleEn(e.target.value)}
                placeholder={"Registrar\nChief Vigilance Officer"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Role / titles (Hindi)</span>
              <textarea
                name="headRoleHi"
                rows={2}
                value={headRoleHi}
                onChange={(e) => setHeadRoleHi(e.target.value)}
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
              Enable farmers&apos; portal band (shown when &quot;Farmers portal band&quot; is on above)
            </label>
          </div>
          {showOfficeDataPanel && page ? (
            <p className="mt-4 text-sm text-emerald-800">
              Manage the enabled sections below (contact lines, staff, sidebars) using the layout
              toggles above.
            </p>
          ) : showOfficeDataPanel ? (
            <p className="mt-4 text-sm text-emerald-800">
              Save the page first, then manage contact lines, staff, and sidebar links below.
            </p>
          ) : null}
        </div>
      )}

      {showFarmersCtaField && !showHeadOfficerFields && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Farmers portal</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              name="officeCtaEnabled"
              type="checkbox"
              defaultChecked={page?.office_cta_enabled ?? true}
            />
            Enable farmers&apos; portal band on this page
          </label>
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

    {showOfficeDataPanel && page && officePortalData && (
      <OfficePortalAdminPanel
        pageId={page.id}
        contactLines={officePortalData.contactLines}
        staff={officePortalData.staff}
        galleryItems={officePortalData.galleryItems}
        sidebarItems={officePortalData.sidebarItems}
        showContacts={layoutConfig.contacts}
        showStaff={layoutConfig.staff}
        showGallery={layoutConfig.gallery}
        showLeftSidebar={layoutConfig.leftSidebar}
        showRightSidebar={layoutConfig.rightSidebar}
      />
    )}

    {showOfficeDataPanel && !page && (
      <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900">
        <p className="font-medium">Office portal sections</p>
        <p className="mt-1 text-emerald-800">
          Contact lines, staff directory, photo gallery, and sidebar quick links will appear here after you create
          and save this page.
        </p>
      </div>
    )}
    </div>
  );
}
