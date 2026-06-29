import { DesignShell } from "@/components/design/design-shell";
import { HeroCarousel } from "@/components/design/shared/hero-carousel";
import {
  AboutSection,
  CollegesGrid,
  DignitariesStrip,
  FlagshipsSection,
  MediaGallerySection,
  MinistryNotificationsSection,
  NewsSection,
  NewsTicker,
  PartnersSection,
  QuickLinksStrip,
  SpotlightSection,
  StatsBar,
} from "@/components/design/shared/home-sections";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";

export const metadata = { title: "Layout C — Clean Ministry (GOI)" };

export default function OptionCPage() {
  return (
    <DesignShell className="bg-white">
      <SiteHeader variant="ministry" homeHref="/design/option-c" />
      <NewsTicker variant="ministry" />
      <main id="main-content" className="flex-1">
        <HeroCarousel variant="ministry" />
        <StatsBar variant="ministry" />
        <DignitariesStrip variant="ministry" />
        <AboutSection variant="ministry" />
        <QuickLinksStrip variant="ministry" />
        <NewsSection variant="ministry" />
        <MinistryNotificationsSection />
        <CollegesGrid variant="ministry" />
        <SpotlightSection variant="ministry" />
        <MediaGallerySection variant="ministry" />
        <FlagshipsSection variant="ministry" />
        <PartnersSection variant="ministry" />
      </main>
      <SiteFooter variant="ministry" />
    </DesignShell>
  );
}
