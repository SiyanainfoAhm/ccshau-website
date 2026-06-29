import { DesignShell } from "@/components/design/design-shell";
import { HeroCarousel } from "@/components/design/shared/hero-carousel";
import {
  AboutSection,
  CollegesGrid,
  DignitariesStrip,
  FlagshipsSection,
  HeritageNotificationsSection,
  MediaGallerySection,
  NewsSection,
  NewsTicker,
  PartnersSection,
  QuickLinksStrip,
  SpotlightSection,
  StatsBar,
} from "@/components/design/shared/home-sections";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";

export const metadata = { title: "Layout A — Heritage Premium" };

export default function OptionAPage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <SiteHeader variant="heritage" homeHref="/design/option-a" />
      <NewsTicker variant="heritage" />
      <main id="main-content" className="flex-1">
        <HeroCarousel variant="heritage" />
        <StatsBar variant="heritage" />
        <DignitariesStrip variant="heritage" />
        <AboutSection variant="heritage" />
        <SpotlightSection variant="heritage" />
        <NewsSection variant="heritage" />
        <HeritageNotificationsSection />
        <CollegesGrid variant="heritage" />
        <MediaGallerySection variant="heritage" />
        <FlagshipsSection variant="heritage" />
        <QuickLinksStrip variant="heritage" />
        <PartnersSection variant="heritage" />
      </main>
      <SiteFooter variant="heritage" />
    </DesignShell>
  );
}
