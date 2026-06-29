import { DesignShell } from "@/components/design/design-shell";
import { HeroCarousel } from "@/components/design/shared/hero-carousel";
import {
  AboutSection,
  CollegesGrid,
  DignitariesStrip,
  FlagshipsSection,
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

export const metadata = {
  title: "CCSHAU Hisar — Agri Future (Approved Layout)",
  description:
    "Approved Phase 1 homepage — Chaudhary Charan Singh Haryana Agricultural University, Hisar",
};

export default function OptionBPage() {
  return (
    <DesignShell>
      <SiteHeader variant="future" homeHref="/design/option-b" />
      <NewsTicker />
      <main id="main-content" className="flex-1">
        <HeroCarousel variant="future" />
        <StatsBar variant="future" />
        <DignitariesStrip />
        <AboutSection variant="future" />
        <QuickLinksStrip variant="future" />
        <NewsSection variant="future" />
        <CollegesGrid variant="future" />
        <SpotlightSection variant="future" />
        <MediaGallerySection />
        <FlagshipsSection />
        <PartnersSection />
      </main>
      <SiteFooter variant="future" />
    </DesignShell>
  );
}
