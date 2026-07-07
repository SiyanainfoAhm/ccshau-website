import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCollegeContactPage } from "@/components/site/public-college-contact-page";
import { PublicPgSeminarRegistrationForm } from "@/components/site/public-pg-seminar-registration-form";
import { PublicPgStudiesSectionContent } from "@/components/site/public-pg-studies-section-content";
import {
  getOfficePortalDataByPageId,
  getPageGalleryItemsByPageId,
  getPublishedPgStudiesSection,
} from "@/lib/data/public";
import type { PublicCollegePage } from "@/lib/data/public-types";
import { getPgStudiesHubPath } from "@/lib/pages/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const data = await getPublishedPgStudiesSection(section);
  if (!data) return { title: "Page not found" };
  return {
    title: `${data.section.titleEn} — ${data.hub.titleEn}`,
    description: data.section.excerptEn ?? data.section.titleEn,
  };
}

export default async function PgStudiesSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const data = await getPublishedPgStudiesSection(section);
  if (!data) notFound();

  const { hub, section: sectionPage } = data;
  const office = await getOfficePortalDataByPageId(hub.pageId);
  const galleryImages =
    sectionPage.layoutConfig.gallery
      ? await getPageGalleryItemsByPageId(sectionPage.pageId)
      : [];

  const collegeShim: PublicCollegePage = {
    ...hub,
    pageId: hub.pageId,
    pageType: "college",
    collegeSlug: hub.hubSlug,
    layoutTemplate: hub.layoutTemplate,
    layoutConfig: hub.layoutConfig,
    mapLat: null,
    mapLng: null,
    sections: [],
  };

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={getPgStudiesHubPath()}
        pgStudiesHub={hub}
        pageLayoutConfig={hub.layoutConfig}
      />
      <main id="main-content" className="flex-1 bg-slate-50">
        {sectionPage.urlSegment === "contact" ? (
          <PublicCollegeContactPage
            college={collegeShim}
            contactLines={office?.contactLines ?? []}
          />
        ) : sectionPage.urlSegment === "seminar-registration" ? (
          <PublicPgSeminarRegistrationForm hub={hub} />
        ) : (
          <PublicPgStudiesSectionContent
            hub={hub}
            section={sectionPage}
            galleryImages={galleryImages}
            heroImageUrl={hub.featuredImageUrl}
          />
        )}
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
