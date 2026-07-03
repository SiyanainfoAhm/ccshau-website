import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicConfigurablePage } from "@/components/site/public-configurable-page";
import { getHomepageContent } from "@/lib/data/homepage";
import {
  getOfficePortalDataByPageId,
  getPublishedCollegeSubsection,
} from "@/lib/data/public";
import { needsOfficeDataLoad } from "@/lib/pages/layout-config";

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
  const homepage = layoutConfig.farmersCta ? await getHomepageContent() : null;

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={`/college/${slug}`}
        college={data.college}
        pageLayoutConfig={layoutConfig}
      />
      <main id="main-content" className="flex-1 bg-slate-50">
        <PublicConfigurablePage
          college={data.college}
          layoutConfig={layoutConfig}
          office={office}
          section={data.section}
          subsection={data.subsection}
          cta={layoutConfig.farmersCta && office?.officeCtaEnabled ? homepage?.cta ?? null : null}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
