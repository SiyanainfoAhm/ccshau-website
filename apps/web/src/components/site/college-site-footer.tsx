import { SiteFooter } from "@/components/design/shared/site-footer";
import { loadPublicMicrositeFooter } from "@/lib/data/microsite-footer";

export async function CollegeSiteFooter({ slug }: { slug: string }) {
  const microsite = await loadPublicMicrositeFooter(slug);
  return <SiteFooter variant="future" microsite={microsite} />;
}
