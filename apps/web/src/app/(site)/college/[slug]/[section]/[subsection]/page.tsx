import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicConfigurablePage } from "@/components/site/public-configurable-page";
import { getHomepageContent } from "@/lib/data/homepage";
import {
  getOfficePortalDataByPageId,
  getPageNewsTickerItemsByPageId,
  getPageStudentCornerItemsByPageId,
  getPublishedCollegeSubsection,
  getKvkCards,
  getRegionalResearchStationCards,
} from "@/lib/data/public";
import { needsOfficeDataLoad } from "@/lib/pages/layout-config";
import { KRISHI_VIGYAN_KENDRAS_HUB_SLUG } from "@/lib/pages/krishi-vigyan-kendras";
import { REGIONAL_RESEARCH_STATIONS_HUB_SLUG } from "@/lib/pages/regional-research-stations";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; section: string; subsection: string }>;
}) {
  const { slug, section, subsection } = await params;
  const data = await getPublishedCollegeSubsection(slug, section, subsection);
  if (!data) return { title: "Page not found" };
  return {
    title: `${data.subsection.titleEn} — ${data.section.titleEn} — ${data.college.titleEn}`,
  };
}

export default async function CollegeSubsectionPage({
  params,
}: {
  params: Promise<{ slug: string; section: string; subsection: string }>;
}) {
  const { slug, section, subsection } = await params;
  const data = await getPublishedCollegeSubsection(slug, section, subsection);
  if (!data) notFound();

  const { layoutConfig } = data.subsection;
  const office = needsOfficeDataLoad(layoutConfig)
    ? await getOfficePortalDataByPageId(data.subsection.pageId)
    : null;
  const newsTickerItems = layoutConfig.newsTicker
    ? await getPageNewsTickerItemsByPageId(data.subsection.pageId)
    : [];
  const studentCornerItems = layoutConfig.studentCorner
    ? await getPageStudentCornerItemsByPageId(data.subsection.pageId)
    : [];
  const homepage = layoutConfig.farmersCta ? await getHomepageContent() : null;
  const researchStations =
    subsection === REGIONAL_RESEARCH_STATIONS_HUB_SLUG
      ? await getRegionalResearchStationCards()
      : subsection === KRISHI_VIGYAN_KENDRAS_HUB_SLUG
        ? await getKvkCards()
        : [];

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
          subsection={data.subsection}
          newsTickerItems={newsTickerItems}
          studentCornerItems={studentCornerItems}
          researchStations={researchStations}
          cta={layoutConfig.farmersCta && office?.officeCtaEnabled ? homepage?.cta ?? null : null}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
