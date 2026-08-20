import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCmsOfficePageContent } from "@/components/site/public-cms-office-page-content";
import {
  getOfficePortalDataByPageId,
  getPublishedPgStudiesHub,
} from "@/lib/data/public";
import { getPgStudiesHubPath, getPgStudiesSectionPath } from "@/lib/pages/routes";

export async function generateMetadata() {
  const hub = await getPublishedPgStudiesHub();
  if (!hub) return { title: "Page not found" };
  return {
    title: hub.metaTitle ?? hub.titleEn,
    description: hub.metaDescription ?? hub.excerptEn ?? hub.titleEn,
  };
}

export default async function PgStudiesHomePage() {
  const hub = await getPublishedPgStudiesHub();
  if (!hub) notFound();

  const office = await getOfficePortalDataByPageId(hub.pageId);
  if (!office) notFound();

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={getPgStudiesHubPath()}
        pgStudiesHub={hub}
        pageLayoutConfig={hub.layoutConfig}
      />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <PublicCmsOfficePageContent
          page={hub}
          office={office}
          showHeroContactButton={hub.layoutConfig.heroContactButton}
          heroContactHref={getPgStudiesSectionPath("contact")}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
