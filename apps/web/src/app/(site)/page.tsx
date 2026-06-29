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
import {
  getActiveBanners,
  getActiveRelatedLinks,
  getPublishedChildPagesByParentSlug,
  getPublishedMediaAlbums,
  getPublishedNews,
  getPublishedPageBySlug,
  getPublicSiteChrome,
} from "@/lib/data/public";

export const metadata = {
  title: "CCSHAU Hisar — Chaudhary Charan Singh Haryana Agricultural University",
  description:
    "Official website of Chaudhary Charan Singh Haryana Agricultural University, Hisar — news, tenders, admissions, and research",
};

export default async function HomePage() {
  const [banners, news, mediaAlbums, relatedLinks, aboutPage, collegePages, chrome] =
    await Promise.all([
      getActiveBanners(),
      getPublishedNews({ limit: 6 }),
      getPublishedMediaAlbums({ limit: 4 }),
      getActiveRelatedLinks(),
      getPublishedPageBySlug("about"),
      getPublishedChildPagesByParentSlug("colleges"),
      getPublicSiteChrome(),
    ]);

  const tickerHeadlines = news.map((item) => ({
    titleEn: item.titleEn,
    titleHi: item.titleHi ?? item.titleEn,
  }));

  return (
    <>
      <SiteHeader variant="future" />
      <NewsTicker variant="future" headlines={tickerHeadlines} />
      <main id="main-content" className="flex-1">
        <HeroCarousel variant="future" slides={banners.length > 0 ? banners : undefined} />
        <StatsBar variant="future" />
        <DignitariesStrip />
        <AboutSection variant="future" page={aboutPage} />
        <QuickLinksStrip variant="future" links={chrome.quickLinks} />
        <NewsSection variant="future" items={news} />
        <CollegesGrid
          variant="future"
          colleges={collegePages.length > 0 ? collegePages : undefined}
        />
        <SpotlightSection variant="future" />
        <MediaGallerySection albums={mediaAlbums.length > 0 ? mediaAlbums : undefined} />
        <FlagshipsSection />
        <PartnersSection links={relatedLinks.length > 0 ? relatedLinks : undefined} />
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
