import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCollegeContactPage } from "@/components/site/public-college-contact-page";
import {
  getOfficePortalDataByPageId,
  getPublishedCollegeBySlug,
} from "@/lib/data/public";
import { getPgStudiesSectionPath, PG_STUDIES_HUB_SLUG } from "@/lib/pages/routes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === PG_STUDIES_HUB_SLUG) {
    return { title: "Contact Us — PG Studies" };
  }
  const college = await getPublishedCollegeBySlug(slug);
  if (!college) return { title: "College not found" };
  return {
    title: `Contact Us — ${college.metaTitle ?? college.titleEn}`,
    description: `Contact information for ${college.titleEn}`,
  };
}

export default async function CollegeContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === PG_STUDIES_HUB_SLUG) {
    redirect(getPgStudiesSectionPath("contact"));
  }

  const college = await getPublishedCollegeBySlug(slug);
  if (!college) notFound();

  const office = await getOfficePortalDataByPageId(college.pageId);

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={`/college/${slug}`}
        college={college}
        pageLayoutConfig={college.layoutConfig}
      />
      <main id="main-content" className="flex-1 bg-slate-50">
        <PublicCollegeContactPage
          college={college}
          contactLines={office?.contactLines ?? []}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
