import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicConfigurablePage } from "@/components/site/public-configurable-page";
import { getHomepageContent } from "@/lib/data/homepage";
import {
  getOfficePortalDataByPageId,
  getPageNewsTickerItemsByPageId,
  getPageStudentCornerItemsByPageId,
  getPublishedCollegeBySlug,
} from "@/lib/data/public";
import { needsOfficeDataLoad } from "@/lib/pages/layout-config";
import { getPgStudiesHubPath, PG_STUDIES_HUB_SLUG } from "@/lib/pages/routes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = await getPublishedCollegeBySlug(slug);
  if (!college) return { title: "College not found" };
  return {
    title: college.metaTitle ?? college.titleEn,
    description: college.metaDescription ?? college.excerptEn ?? college.titleEn,
  };
}

export default async function CollegePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === PG_STUDIES_HUB_SLUG) {
    redirect(getPgStudiesHubPath());
  }

  const college = await getPublishedCollegeBySlug(slug);
  if (!college) notFound();

  const { layoutConfig } = college;
  const office = needsOfficeDataLoad(layoutConfig)
    ? await getOfficePortalDataByPageId(college.pageId)
    : null;
  const newsTickerItems = layoutConfig.newsTicker
    ? await getPageNewsTickerItemsByPageId(college.pageId)
    : [];
  const studentCornerItems = layoutConfig.studentCorner
    ? await getPageStudentCornerItemsByPageId(college.pageId)
    : [];
  const homepage = layoutConfig.farmersCta ? await getHomepageContent() : null;

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={`/college/${slug}`}
        college={college}
        pageLayoutConfig={layoutConfig}
      />
      <main id="main-content" className="flex-1 bg-slate-50">
        <PublicConfigurablePage
          college={college}
          layoutConfig={layoutConfig}
          office={office}
          newsTickerItems={newsTickerItems}
          studentCornerItems={studentCornerItems}
          cta={layoutConfig.farmersCta && office?.officeCtaEnabled ? homepage?.cta ?? null : null}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
