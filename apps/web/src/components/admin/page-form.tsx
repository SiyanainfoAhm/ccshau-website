"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createPageAction, updatePageAction, type AdminParentPageOption } from "@/actions/pages";
import { translateFieldsEnToHiAction } from "@/actions/translate";
import { AdminFileUploadField } from "@/components/admin/admin-file-upload-field";
import { LayoutConfigAdminPanel } from "@/components/admin/layout-config-admin-panel";
import { LazyOfficePortalAdminPanel } from "@/components/admin/lazy-office-portal-admin-panel";
import { ParentPagePicker } from "@/components/admin/parent-page-picker";
import type { Page, PageContactLine } from "@/lib/database/types";
import { contentStatusOptions } from "@/lib/auth/content-status-options";
import {
  applyLayoutConfigToFormData,
  LAYOUT_CONFIG_KEYS,
  departmentHodHiddenLayoutKeys,
  isCollegeLayoutPage,
  readStoredLayoutConfig,
  presetForLayoutTemplate,
  type PageLayoutConfig,
} from "@/lib/pages/layout-config";
import { parseCollegeContactFromLines } from "@/lib/pages/college-contact-seed";
import {
  ancestorsForChildPage,
  isCollegesContainerSlug,
  isParentUnderCollege,
  resolvePublicPagePath,
} from "@/lib/pages/resolve-public-path";
import { slugify } from "@/lib/utils/slug";
import { getStoredFileUrl } from "@/lib/storage/urls";

interface Department {
  id: string;
  slug: string;
  name_en: string;
}

export function PageForm({
  departments,
  initialParentOption = null,
  page,
  allowCollegeRoot = true,
  canEdit = true,
  canPublish = true,
  initialSuccess = null,
  lockPageStructure = false,
}: {
  departments: Department[];
  /** Current parent option only — picker searches the rest on demand (P1). */
  initialParentOption?: AdminParentPageOption | null;
  page?: Page;
  allowCollegeRoot?: boolean;
  canEdit?: boolean;
  canPublish?: boolean;
  /** Shown once after create redirect (?saved=1). */
  initialSuccess?: string | null;
  /** Department HOD: Template / Layout / Parent cannot be changed. */
  lockPageStructure?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(initialSuccess);
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
  // Use stored template as-is. Do not coerce standard pages to college_home.
  const initialLayoutTemplate = (page?.layout_template ?? "standard") as Page["layout_template"];

  const [pageType, setPageType] = useState<Page["page_type"]>(page?.page_type ?? "standard");
  const [layoutTemplate, setLayoutTemplate] = useState<Page["layout_template"]>(
    initialLayoutTemplate,
  );
  const [layoutConfig, setLayoutConfig] = useState<PageLayoutConfig>(() =>
    page
      ? readStoredLayoutConfig(page.layout_config, initialLayoutTemplate)
      : presetForLayoutTemplate("standard"),
  );
  const [selectedParent, setSelectedParent] = useState<AdminParentPageOption | null>(
    initialParentOption,
  );
  const parentId = selectedParent?.id ?? "";
  const [collegeContactLines, setCollegeContactLines] = useState<PageContactLine[]>([]);
  const collegeContact = parseCollegeContactFromLines(collegeContactLines);
  const [contactLocationEnabled, setContactLocationEnabled] = useState(false);
  const [contactSeedKey, setContactSeedKey] = useState(0);

  useEffect(() => {
    if (!initialSuccess || typeof window === "undefined") return;
    // Drop ?saved=1 so a refresh does not re-show the create banner.
    const url = new URL(window.location.href);
    if (url.searchParams.has("saved")) {
      url.searchParams.delete("saved");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [initialSuccess]);

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

  function handleContactLocationToggle(enabled: boolean) {
    setContactLocationEnabled(enabled);
    setLayoutConfig((prev) => ({ ...prev, contacts: enabled }));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const selected = selectedParent;
    const isCollegeRoot =
      pageType === "college" && (!parentId || isCollegesContainerSlug(selected?.slug));
    const submittedPageType = isCollegeRoot ? "college" : parentId ? "standard" : pageType;

    formData.set("pageType", submittedPageType);
    formData.set("contactLocationEnabled", contactLocationEnabled ? "on" : "off");
    if (showLayoutTemplate) {
      const template =
        layoutTemplate === "standard" ? "college_home" : layoutTemplate;
      formData.set("layoutTemplate", template);
      const configForSave = isCollegeRoot
        ? { ...layoutConfig, contacts: contactLocationEnabled }
        : layoutConfig;
      applyLayoutConfigToFormData(formData, configForSave);
    } else {
      // Preserve stored template for standard CMS pages (do not force college_home → standard wipe).
      formData.set("layoutTemplate", page?.layout_template ?? "standard");
    }

    startTransition(async () => {
      const result = page
        ? await updatePageAction(page.id, formData)
        : await createPageAction(formData);

      if (!result.success) {
        setError(result.error);
        setSuccess(null);
        return;
      }

      if (page) {
        setSuccess("Page updated successfully.");
        router.refresh();
        return;
      }

      router.push(`/admin/pages/${result.data.id}?saved=1`);
      router.refresh();
    });
  }

  const selectedParentForPath = selectedParent;
  const isCollegesContainerParent = isCollegesContainerSlug(selectedParentForPath?.slug);
  const isCollegeRoot = pageType === "college" && (!parentId || isCollegesContainerParent);
  const isCollegeHierarchyChild = Boolean(
    selectedParentForPath && isParentUnderCollege(selectedParentForPath),
  );
  const effectivePageType = isCollegeRoot ? "college" : parentId ? "standard" : pageType;
  const previewPath = slug
    ? selectedParentForPath
      ? resolvePublicPagePath(slug, effectivePageType, ancestorsForChildPage(selectedParentForPath))
      : resolvePublicPagePath(slug, effectivePageType)
    : null;

  const showLayoutTemplate =
    pageType === "college" ||
    isCollegeHierarchyChild ||
    layoutTemplate === "office_portal" ||
    layoutTemplate === "college_home" ||
    Boolean(page && isCollegeLayoutPage(page));
  const showCollegeLayout = showLayoutTemplate;
  const showHeadOfficerFields = showCollegeLayout && layoutConfig.headOfficer;
  const showOfficeDataPanel =
    showCollegeLayout &&
    (layoutConfig.contacts ||
      layoutConfig.staff ||
      layoutConfig.gallery ||
      layoutConfig.newsTicker ||
      layoutConfig.studentCorner ||
      layoutConfig.leftSidebar ||
      layoutConfig.rightSidebar);
  const showFarmersCtaField = showCollegeLayout && layoutConfig.farmersCta;
  const showHeroBannerFields = showCollegeLayout && layoutConfig.hero;
  const heroPreviewUrl =
    page?.featured_image_path && page.featured_image_path !== "pending"
      ? getStoredFileUrl(page.featured_image_path)
      : null;
  const logoPreviewUrl =
    page?.logo_image_path && page.logo_image_path !== "pending"
      ? getStoredFileUrl(page.logo_image_path)
      : null;

  return (
    <div className="space-y-6">
    <form action={handleSubmit} noValidate className="mx-auto max-w-3xl space-y-6">
      <input type="hidden" name="pageType" value={isCollegeRoot ? "college" : parentId ? "standard" : pageType} />
      <input
        type="hidden"
        name="layoutTemplate"
        value={
          showLayoutTemplate
            ? layoutTemplate === "standard"
              ? "college_home"
              : layoutTemplate
            : (page?.layout_template ?? "standard")
        }
      />
      {lockPageStructure ? <input type="hidden" name="parentId" value={parentId} /> : null}
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
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Page type</h2>
        {lockPageStructure && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Department HOD cannot change Template, Layout template, or Parent page. You can toggle
            Hero banner, Hero contact button, Head officer / Dean, Left sidebar, Right sidebar, and News section below.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Template</span>
            <select
              value={
                parentId && !isCollegesContainerParent ? "standard" : pageType
              }
              disabled={
                !canEdit ||
                lockPageStructure ||
                Boolean(parentId && !isCollegesContainerParent)
              }
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="standard">
                {isCollegeHierarchyChild
                  ? "Nested page (URL follows parent)"
                  : "Standard page (/pages/slug)"}
              </option>
              {(allowCollegeRoot || page?.page_type === "college" || isCollegeRoot) && (
                <option value="college">College landing (/college/slug)</option>
              )}
            </select>
            {parentId && !isCollegesContainerParent ? (
              <span className="mt-1 block text-xs text-slate-500">
                Nested under a parent — Template stays Standard. Public URL is built from the
                parent chain (see below). Use <span className="font-medium">Layout template</span>{" "}
                for Office portal / College home.
              </span>
            ) : null}
          </label>
          {showLayoutTemplate && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Layout template</span>
              <select
                value={layoutTemplate}
                disabled={lockPageStructure}
                onChange={(e) => {
                  const next = e.target.value as Page["layout_template"];
                  setLayoutTemplate(next);
                  setLayoutConfig(presetForLayoutTemplate(next));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="college_home">College home (hero + content)</option>
                <option value="office_portal">Office portal (sidebars + contacts)</option>
              </select>
            </label>
          )}
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Parent page</span>
            <ParentPagePicker
              name="parentId"
              value={selectedParent}
              excludePageId={page?.id ?? null}
              disabled={lockPageStructure || !canEdit}
              onChange={(next) => {
                setSelectedParent(next);
                const underCollegesContainer = isCollegesContainerSlug(next?.slug);
                if (next && !underCollegesContainer && pageType === "college") {
                  setPageType("standard");
                }
              }}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Search by title or slug. Child of a college → college tab (or dropdown if it has
              sub-pages). Child of a section (e.g. Department) → item inside that section&apos;s
              dropdown menu.
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
        <LayoutConfigAdminPanel
          layoutConfig={layoutConfig}
          onChange={setLayoutConfig}
          hiddenKeys={[
            "showInDepartmentsMenu",
            ...(isCollegeRoot ? (["contacts"] as const) : []),
            ...(lockPageStructure ? departmentHodHiddenLayoutKeys() : []),
          ]}
          readOnly={!canEdit}
        />
      )}

      {showHeroBannerFields && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Hero banner images</h2>
          <p className="mb-4 text-sm text-slate-600">
            Upload or paste a URL for the large banner at the top of the public page. If you leave
            this empty, the college banner image is used instead.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Banner background image</span>
                <input
                  name="featuredImagePath"
                  defaultValue={page?.featured_image_path ?? ""}
                  placeholder="https://... or bucket/path"
                  disabled={!canEdit}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-slate-50"
                />
              </label>
              {canEdit && (
                <AdminFileUploadField
                  name="featuredImageFile"
                  kind="image"
                  accept="image/*"
                  label="Upload banner image"
                  hint="JPG, PNG or WebP. Recommended width 1600px or wider."
                  chooseLabel="Choose banner image"
                />
              )}
              {heroPreviewUrl && (
                <img
                  src={heroPreviewUrl}
                  alt="Current hero banner preview"
                  className="h-28 w-full rounded-lg border border-emerald-100 object-cover"
                />
              )}
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Logo on banner (optional)</span>
                <input
                  name="logoImagePath"
                  defaultValue={page?.logo_image_path ?? ""}
                  placeholder="https://... or bucket/path"
                  disabled={!canEdit}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-slate-50"
                />
              </label>
              {canEdit && (
                <AdminFileUploadField
                  name="logoImageFile"
                  kind="image"
                  accept="image/*"
                  label="Upload logo"
                  hint="Shown centered on the hero banner."
                  chooseLabel="Choose logo"
                />
              )}
              {logoPreviewUrl && (
                <img
                  src={logoPreviewUrl}
                  alt="Current hero logo preview"
                  className="h-28 w-28 rounded-lg border border-emerald-100 bg-white object-contain p-2"
                />
              )}
            </div>
          </div>
        </div>
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
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
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
              disabled={lockPageStructure}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
            {lockPageStructure ? <input type="hidden" name="slug" value={slug} /> : null}
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

      {isCollegeRoot && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Contact & location</h2>
              <p className="mt-1 text-sm text-slate-600">
                Optional. Used on the college contact page and home contact block.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={contactLocationEnabled}
                onChange={(e) => handleContactLocationToggle(e.target.checked)}
              />
              <span className="font-medium text-slate-700">Enable contact & location</span>
            </label>
          </div>
          <input
            type="hidden"
            name="contactLocationEnabled"
            value={contactLocationEnabled ? "on" : "off"}
          />
          {contactLocationEnabled && (
          <div key={contactSeedKey} className="grid gap-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Mailing address (English)</span>
              <textarea
                name="addressEn"
                required
                rows={3}
                defaultValue={collegeContact.addressEn}
                placeholder="College name, CCS HAU, Hisar - 125004, Haryana, India"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Mailing address (Hindi, optional)</span>
              <textarea
                name="addressHi"
                rows={2}
                defaultValue={collegeContact.addressHi}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <input
                  name="phone"
                  required
                  defaultValue={collegeContact.phone}
                  placeholder="+91 01662255401"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Email</span>
                <input
                  name="email"
                  type="text"
                  required={contactLocationEnabled}
                  defaultValue={collegeContact.email}
                  placeholder="college@hau.ac.in, second@hau.ac.in"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Free text — multiple emails allowed (comma or semicolon separated). No format check.
                </span>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Latitude (optional)</span>
                <input
                  name="mapLat"
                  type="number"
                  step="any"
                  defaultValue={page?.map_lat ?? ""}
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
                  defaultValue={page?.map_lng ?? ""}
                  placeholder="75.7217"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
          </div>
          )}
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
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
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
            <div className="space-y-3 md:col-span-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Photo URL</span>
                <input
                  name="headImagePath"
                  defaultValue={page?.head_image_path ?? ""}
                  placeholder="https://... or upload a photo below"
                  disabled={!canEdit}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                />
              </label>
              {canEdit && (
                <AdminFileUploadField
                  name="headImageFile"
                  kind="image"
                  accept="image/*"
                  label="Upload photo"
                  hint="JPG, PNG or WebP. Uploaded file replaces the URL above."
                  chooseLabel="Choose photo"
                />
              )}
              {page?.head_image_path &&
                page.head_image_path !== "pending" &&
                getStoredFileUrl(page.head_image_path) && (
                  <img
                    src={getStoredFileUrl(page.head_image_path)!}
                    alt="Current head officer photo"
                    className="h-28 w-28 rounded-lg border border-emerald-100 object-cover"
                  />
                )}
            </div>
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
              {contentStatusOptions(canPublish).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
        {canEdit && (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
          >
            {isPending ? "Saving…" : page ? "Update page" : "Create page"}
          </button>
        )}
        {!canEdit && (
          <p className="text-sm text-slate-500">View-only access — you cannot save changes.</p>
        )}
        <Link href="/admin/pages" className="text-sm text-slate-600 hover:text-emerald-800">
          Cancel
        </Link>
      </div>
    </form>

    {showOfficeDataPanel && page ? (
      <LazyOfficePortalAdminPanel
        pageId={page.id}
        showContacts={layoutConfig.contacts && !isCollegeRoot}
        showStaff={layoutConfig.staff && !lockPageStructure}
        showGallery={layoutConfig.gallery}
        showNewsTicker={layoutConfig.newsTicker}
        showStudentCorner={layoutConfig.studentCorner}
        showLeftSidebar={layoutConfig.leftSidebar}
        showRightSidebar={layoutConfig.rightSidebar}
        canEdit={canEdit}
        onContactLinesLoaded={(lines) => {
          setCollegeContactLines(lines);
          const parsed = parseCollegeContactFromLines(lines);
          if (parsed.addressEn || parsed.phone || parsed.email) {
            setContactLocationEnabled(true);
          }
          setContactSeedKey((key) => key + 1);
        }}
      />
    ) : null}

    {showOfficeDataPanel && !page && (
      <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900">
        <p className="font-medium">Office portal sections</p>
        <p className="mt-1 text-emerald-800">
          Contact lines, staff directory, photo gallery, news ticker, student corner, and sidebar quick links will appear here after you create
          and save this page.
        </p>
      </div>
    )}
    </div>
  );
}
