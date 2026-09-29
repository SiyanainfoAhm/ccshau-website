import { SiteHeader } from "@/components/design/shared/site-header";
import { loadPublicMicrositeHeader } from "@/lib/data/microsite-header";
import type { PublicCollegePage } from "@/lib/data/public-types";

export async function CollegeSiteHeader({
  slug,
  college,
  homeHref,
  pageLayoutConfig,
}: {
  slug: string;
  college?: PublicCollegePage;
  homeHref?: string;
  pageLayoutConfig?: { collegeTopMenu?: boolean };
}) {
  const micrositeHeader = await loadPublicMicrositeHeader(slug);
  return (
    <SiteHeader
      variant="future"
      homeHref={homeHref}
      college={college}
      pageLayoutConfig={pageLayoutConfig}
      micrositeHeader={micrositeHeader}
    />
  );
}
