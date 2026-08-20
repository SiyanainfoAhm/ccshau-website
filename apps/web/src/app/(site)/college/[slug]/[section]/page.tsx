import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicConfigurablePage } from "@/components/site/public-configurable-page";
import { getHomepageContent } from "@/lib/data/homepage";
import {
  getOfficePortalDataByPageId,
  getPageGalleryItemsByPageId,
  getPageNewsTickerItemsByPageId,
  getPageStudentCornerItemsByPageId,
  getPublishedCollegeSection,
} from "@/lib/data/public";
import { needsOfficeDataLoad } from "@/lib/pages/layout-config";
import { isCollegeDepartmentMenuSubsection } from "@/lib/pages/college-nav";
import {
  getCollegeSubsectionPath,
  getPgStudiesSectionPath,
  PG_STUDIES_HUB_SLUG,
  pgStudiesSectionUrlSegment,
} from "@/lib/pages/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
  const data = await getPublishedCollegeSection(slug, section);
  if (!data) return { title: "Page not found" };
  return { title: `${data.section.titleEn} — ${data.college.titleEn}` };
}

export default async function CollegeSectionPage({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
  if (slug === PG_STUDIES_HUB_SLUG) {
    redirect(getPgStudiesSectionPath(pgStudiesSectionUrlSegment(section)));
  }

  const data = await getPublishedCollegeSection(slug, section);
  if (!data) notFound();

  if (data.section.subsections.length > 0) {
    const first =
      data.section.subsections.find(isCollegeDepartmentMenuSubsection) ??
      data.section.subsections[0];
    redirect(getCollegeSubsectionPath(slug, section, first.slug));
  }

  const { layoutConfig } = data.section;
  const office = needsOfficeDataLoad(layoutConfig)
    ? await getOfficePortalDataByPageId(data.section.pageId)
    : null;
  const galleryImages = await getPageGalleryItemsByPageId(data.section.pageId);
  const newsTickerItems = layoutConfig.newsTicker
    ? await getPageNewsTickerItemsByPageId(data.section.pageId)
    : [];
  const studentCornerItems = layoutConfig.studentCorner
    ? await getPageStudentCornerItemsByPageId(data.section.pageId)
    : [];
  const homepage = layoutConfig.farmersCta ? await getHomepageContent() : null;

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={`/college/${slug}`}
        college={data.college}
        pageLayoutConfig={data.college.layoutConfig}
      />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-slate-50">
        <PublicConfigurablePage
          college={data.college}
          layoutConfig={layoutConfig}
          office={office}
          section={data.section}
          galleryImages={galleryImages}
          newsTickerItems={newsTickerItems}
          studentCornerItems={studentCornerItems}
          cta={layoutConfig.farmersCta && office?.officeCtaEnabled ? homepage?.cta ?? null : null}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
