import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCollegeHome } from "@/components/site/public-college-page";
import { PublicOfficePortal } from "@/components/site/public-office-portal";
import { getHomepageContent } from "@/lib/data/homepage";
import {
  getOfficePortalDataByPageId,
  getPublishedCollegeBySlug,
} from "@/lib/data/public";

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
  const college = await getPublishedCollegeBySlug(slug);
  if (!college) notFound();

  const isOfficePortal = college.layoutTemplate === "office_portal";
  const office = isOfficePortal ? await getOfficePortalDataByPageId(college.pageId) : null;
  const homepage = isOfficePortal ? await getHomepageContent() : null;

  return (
    <>
      <SiteHeader variant="future" homeHref={`/college/${slug}`} college={college} />
      <main id="main-content" className="flex-1 bg-slate-50">
        {isOfficePortal && office ? (
          <PublicOfficePortal
            college={college}
            office={office}
            cta={office.officeCtaEnabled ? homepage?.cta ?? null : null}
          />
        ) : (
          <PublicCollegeHome college={college} />
        )}
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
