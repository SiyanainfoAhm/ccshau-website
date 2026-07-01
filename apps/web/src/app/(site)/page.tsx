import { HeroCarousel } from "@/components/design/shared/hero-carousel";
import {
  AboutSection,
  CollegesGrid,
  DignitariesStrip,
  FarmersPortalSection,
  FlagshipsSection,
  MediaGallerySection,
  NewsSection,
  NewsTicker,
  NotificationsSection,
  PartnersSection,
  QuotesSection,
} from "@/components/design/shared/home-sections";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { getHomepageContent, resolveHomepageColleges } from "@/lib/data/homepage";
import {
  getActiveBanners,
  getActiveRelatedLinks,
  getPublishedChildPagesByParentSlug,
  getPublishedMediaAlbums,
  getPublishedNews,
  getPublishedPageBySlug,
  getPublicSiteChrome,
  getPublicTenders,
} from "@/lib/data/public";

export const metadata = {
  title: "CCSHAU Hisar — Chaudhary Charan Singh Haryana Agricultural University",
  description:
    "Official website of Chaudhary Charan Singh Haryana Agricultural University, Hisar — news, tenders, admissions, and research",
};

export default async function HomePage() {
  const [
    banners,
    news,
    recruitmentNews,
    tenders,
    mediaAlbums,
    relatedLinks,
    aboutPage,
    collegePages,
    chrome,
    homepage,
  ] = await Promise.all([
    getActiveBanners(),
    getPublishedNews({ limit: 8 }),
    getPublishedNews({ limit: 5, category: "recruitment" }),
    getPublicTenders({ status: "open", limit: 5 }),
    getPublishedMediaAlbums({ limit: 4 }),
    getActiveRelatedLinks(),
    getPublishedPageBySlug("about"),
    getPublishedChildPagesByParentSlug("colleges"),
    getPublicSiteChrome(),
    getHomepageContent(),
  ]);

  const tickerHeadlines = news.map((item) => ({
    titleEn: item.titleEn,
    titleHi: item.titleHi ?? item.titleEn,
  }));

  const notificationNews = news
    .filter((item) => item.category !== "recruitment")
    .slice(0, 5);

  const homepageColleges = resolveHomepageColleges(collegePages);

  return (
    <>
      <SiteHeader variant="future" />
      <NewsTicker variant="future" headlines={tickerHeadlines} />
      <main id="main-content" className="flex-1">
        <HeroCarousel variant="future" slides={banners.length > 0 ? banners : undefined} />
        <QuotesSection variant="future" quotes={homepage.quotes} />
        <AboutSection variant="future" page={aboutPage} />
        <NewsSection variant="future" items={news} />
        <DignitariesStrip variant="future" dignitaries={homepage.dignitaries} />
        <CollegesGrid variant="future" colleges={homepageColleges} />
        <MediaGallerySection albums={mediaAlbums.length > 0 ? mediaAlbums : undefined} />
        <NotificationsSection
          variant="future"
          newsItems={notificationNews}
          recruitmentItems={recruitmentNews}
          tenderItems={tenders}
        />
        <FlagshipsSection variant="future" items={homepage.flagships} />
        <PartnersSection links={relatedLinks.length > 0 ? relatedLinks : undefined} />
        <FarmersPortalSection variant="future" cta={homepage.cta} />
      </main>
      <SiteFooter variant="future" quickLinks={chrome.quickLinks} />
    </>
  );
}
