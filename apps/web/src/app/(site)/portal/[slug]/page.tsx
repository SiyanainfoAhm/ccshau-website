import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicEventPortalContent } from "@/components/site/public-event-portal-content";
import { getPublishedEventPortalBySlug } from "@/lib/data/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedEventPortalBySlug(slug);
  if (!page) return { title: "Event portal not found" };
  return {
    title: page.titleEn,
    description: page.excerptEn ?? page.metaDescription ?? page.titleEn,
  };
}

export default async function EventPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedEventPortalBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-white">
        <PublicEventPortalContent page={page} />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
