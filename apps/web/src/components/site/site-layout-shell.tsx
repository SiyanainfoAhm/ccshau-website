import { DesignShell } from "@/components/design/design-shell";
import { PublicSiteProvider } from "@/components/site/public-site-context";
import { getPublicSiteChrome } from "@/lib/data/public";

export async function SiteLayoutShell({ children }: { children: React.ReactNode }) {
  const chrome = await getPublicSiteChrome();

  return (
    <DesignShell>
      <PublicSiteProvider chrome={chrome}>{children}</PublicSiteProvider>
    </DesignShell>
  );
}
