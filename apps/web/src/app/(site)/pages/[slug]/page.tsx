import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCmsOfficePageContent } from "@/components/site/public-cms-office-page-content";
import { PublicCmsPageContent } from "@/components/site/public-cms-page-content";
import {
  getOfficePortalDataByPageId,
  getPageNewsTickerItemsByPageId,
  getPublishedCollegeBySlug,
  getPublishedPageBySlug,
  getPublishedPagePublicPath,
} from "@/lib/data/public";
import { Tables } from "@/lib/database/names";
import type { Page } from "@/lib/database/types";
import { getCollegePublicHomePath, getCollegeSlugForCmsPage, getPublicPagePath } from "@/lib/pages/routes";
import { createAdminClient } from "@/lib/supabase/admin";

function usesOfficeAboutLayout(page: Page) {
  return page.layout_template === "office_portal" && page.page_type === "standard";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.metaTitle ?? page.titleEn,
    description: page.metaDescription ?? page.excerptEn ?? page.titleEn,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();

  if (page.pageType === "college") {
    redirect(getPublicPagePath(page.slug, "college"));
  }

  const canonicalPath = await getPublishedPagePublicPath(slug);
  if (canonicalPath && canonicalPath !== `/pages/${slug}`) {
    redirect(canonicalPath);
  }

  const admin = createAdminClient();
  const { data: pageRow } = admin
    ? await admin
        .from(Tables.pages)
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle()
    : { data: null };

  const office =
    pageRow && usesOfficeAboutLayout(pageRow as Page)
      ? await getOfficePortalDataByPageId(pageRow.id)
      : null;
  const collegeSlug = getCollegeSlugForCmsPage(slug);
  const college = collegeSlug ? await getPublishedCollegeBySlug(collegeSlug) : null;
  const newsTickerItems =
    page.layoutConfig?.newsTicker && pageRow
      ? await getPageNewsTickerItemsByPageId(pageRow.id)
      : [];

  return (
    <>
      <SiteHeader
        variant="future"
        college={college ?? undefined}
        homeHref={college ? getCollegePublicHomePath(college.collegeSlug) : undefined}
        pageLayoutConfig={college?.layoutConfig ?? page.layoutConfig}
      />
      <main id="main-content" className="flex-1">
        {office ? (
          <PublicCmsOfficePageContent
            page={page}
            office={office}
            newsTickerItems={newsTickerItems}
          />
        ) : (
          <PublicCmsPageContent page={page} />
        )}
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
