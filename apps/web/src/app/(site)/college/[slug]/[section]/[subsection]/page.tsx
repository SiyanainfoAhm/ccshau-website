import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCollegeSubsectionView } from "@/components/site/public-college-page";
import { getPublishedCollegeSubsection } from "@/lib/data/public";

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

  return (
    <>
      <SiteHeader
        variant="future"
        homeHref={`/college/${slug}`}
        college={data.college}
        showMainNav={false}
      />
      <main id="main-content" className="flex-1 bg-white">
        <PublicCollegeSubsectionView
          college={data.college}
          section={data.section}
          subsection={data.subsection}
        />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
