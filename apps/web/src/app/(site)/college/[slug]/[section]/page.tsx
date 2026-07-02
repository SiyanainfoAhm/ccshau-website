import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCollegeSectionView } from "@/components/site/public-college-page";
import { PublicOfficePortal } from "@/components/site/public-office-portal";
import { getHomepageContent } from "@/lib/data/homepage";
import {
  getOfficePortalDataByPageId,
  getPublishedCollegeSection,
} from "@/lib/data/public";
import { getCollegeSubsectionPath } from "@/lib/pages/routes";

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
  const data = await getPublishedCollegeSection(slug, section);
  if (!data) notFound();

  if (data.section.subsections.length > 0) {
    const first = data.section.subsections[0];
    redirect(getCollegeSubsectionPath(slug, section, first.slug));
  }

  const useOfficeLayout =
    data.college.layoutTemplate === "office_portal" ||
    data.section.layoutTemplate === "office_portal";

  const office = useOfficeLayout
    ? await getOfficePortalDataByPageId(data.section.pageId)
    : null;
  const homepage = useOfficeLayout ? await getHomepageContent() : null;

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={`/college/${slug}`}
        college={data.college}
        showMainNav={false}
      />
      <main id="main-content" className="flex-1 bg-white">
        {useOfficeLayout && office ? (
          <PublicOfficePortal
            college={data.college}
            office={office}
            section={data.section}
            cta={office.officeCtaEnabled ? homepage?.cta ?? null : null}
          />
        ) : (
          <PublicCollegeSectionView college={data.college} section={data.section} />
        )}
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
