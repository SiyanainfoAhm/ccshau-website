import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicNewsDetail } from "@/components/site/public-news-detail";
import { getPublishedNewsBySlug } from "@/lib/data/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedNewsBySlug(slug);
  if (!item) return { title: "News not found" };
  return {
    title: item.titleEn,
    description: item.bodyEn?.slice(0, 160) ?? item.titleEn,
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedNewsBySlug(slug);
  if (!item) notFound();

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1">
        <PublicNewsDetail item={item} />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
