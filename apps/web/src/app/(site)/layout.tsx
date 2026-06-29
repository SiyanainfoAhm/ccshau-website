import { SiteLayoutShell } from "@/components/site/site-layout-shell";

export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayoutShell>{children}</SiteLayoutShell>;
}
