import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicTenderDetail } from "@/components/site/public-tender-detail";
import { getPublicTenderBySlug } from "@/lib/data/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tender = await getPublicTenderBySlug(slug);
  if (!tender) return { title: "Tender not found" };
  return { title: tender.titleEn, description: tender.descriptionEn?.slice(0, 160) ?? tender.titleEn };
}

export default async function TenderDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tender = await getPublicTenderBySlug(slug);
  if (!tender) notFound();

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-slate-50">
        <PublicTenderDetail tender={tender} />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
