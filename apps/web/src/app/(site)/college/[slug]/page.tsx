import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCollegeHome } from "@/components/site/public-college-page";
import { getPublishedCollegeBySlug } from "@/lib/data/public";

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

  return (
    <>
      <SiteHeader variant="future" homeHref={`/college/${slug}`} college={college} showMainNav={false} />
      <main id="main-content" className="flex-1 bg-white">
        <PublicCollegeHome college={college} />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
