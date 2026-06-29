import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicCmsPageContent } from "@/components/site/public-cms-page-content";
import { getPublishedPageBySlug, getPublishedPagePublicPath } from "@/lib/data/public";
import { getPublicPagePath } from "@/lib/pages/routes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.metaTitle ?? page.titleEn,
    description: page.metaDescription ?? page.excerptEn ?? page.titleEn,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) notFound();

  if (page.pageType === "college") {
    redirect(getPublicPagePath(page.slug, "college"));
  }

  const canonicalPath = await getPublishedPagePublicPath(slug);
  if (canonicalPath && canonicalPath !== `/pages/${slug}`) {
    redirect(canonicalPath);
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1">
        <PublicCmsPageContent page={page} />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
