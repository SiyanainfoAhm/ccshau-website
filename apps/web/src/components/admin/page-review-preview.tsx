import { StatusBadge } from "@/components/admin/status-badge";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import type { Page } from "@/lib/database/types";
import type { ReactNode } from "react";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {children}
      </div>
    </div>
  );
}

function displayOrDash(value: ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400">—</span>;
  }
  return value;
}

export function PageReviewPreview({
  page,
  publicPath,
}: {
  page: Page;
  publicPath: string;
}) {
  const hasEnglishContent = Boolean(page.content_en?.trim());
  const hasHindiContent = Boolean(page.content_hi?.trim());
  const hasHeadOfficer = Boolean(
    page.head_name_en || page.head_name_hi || page.head_role_en || page.head_role_hi,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Page content</h2>
          <StatusBadge status={page.status} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title (English)">{displayOrDash(page.title_en)}</Field>
          <Field label="Title (Hindi)">
            <span className="font-hindi">{displayOrDash(page.title_hi)}</span>
          </Field>

          <Field label="URL slug" className="md:col-span-2">
            <code className="font-mono text-xs">/{page.slug}</code>
            <p className="mt-1 text-xs text-slate-500">
              Public path: <span className="font-mono">{publicPath}</span>
            </p>
          </Field>

          <Field label="Excerpt (English)" className="md:col-span-2">
            {displayOrDash(
              page.excerpt_en ? (
                <p className="whitespace-pre-wrap">{page.excerpt_en}</p>
              ) : null,
            )}
          </Field>
          <Field label="Excerpt (Hindi)" className="md:col-span-2">
            {displayOrDash(
              page.excerpt_hi ? (
                <p className="font-hindi whitespace-pre-wrap">{page.excerpt_hi}</p>
              ) : null,
            )}
          </Field>

          <Field label="Content (English)" className="md:col-span-2">
            {hasEnglishContent && page.content_en ? (
              <CmsHtmlContent html={page.content_en} className="max-w-none" />
            ) : (
              displayOrDash(null)
            )}
          </Field>
          <Field label="Content (Hindi)" className="md:col-span-2">
            {hasHindiContent && page.content_hi ? (
              <CmsHtmlContent html={page.content_hi} className="font-hindi max-w-none" />
            ) : (
              displayOrDash(null)
            )}
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Page type & publishing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Template">{displayOrDash(page.page_type)}</Field>
          <Field label="Layout template">{displayOrDash(page.layout_template)}</Field>
          <Field label="Meta title">{displayOrDash(page.meta_title)}</Field>
          <Field label="Meta description">{displayOrDash(page.meta_description)}</Field>
        </div>
      </div>

      {hasHeadOfficer ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Head officer</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name (English)">{displayOrDash(page.head_name_en)}</Field>
            <Field label="Name (Hindi)">
              <span className="font-hindi">{displayOrDash(page.head_name_hi)}</span>
            </Field>
            <Field label="Role / titles (English)" className="md:col-span-2">
              {displayOrDash(
                page.head_role_en ? (
                  <p className="whitespace-pre-line">{page.head_role_en}</p>
                ) : null,
              )}
            </Field>
            <Field label="Role / titles (Hindi)" className="md:col-span-2">
              {displayOrDash(
                page.head_role_hi ? (
                  <p className="font-hindi whitespace-pre-line">{page.head_role_hi}</p>
                ) : null,
              )}
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}
