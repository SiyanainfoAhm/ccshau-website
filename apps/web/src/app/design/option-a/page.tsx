import Link from "next/link";
import { ArrowRight, FileText, Gavel, Mail, ScrollText } from "lucide-react";

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
import { OPTION_A_BASE, optionANavItems } from "@/lib/design/option-a-demo";

export const metadata = { title: "Layout A — Heritage Premium" };

const demoPages = [
  {
    href: `${OPTION_A_BASE}/news`,
    label: "News & Notices",
    labelHi: "समाचार",
    icon: FileText,
    tone: "from-rose-100 to-pink-50 border-rose-200 text-rose-700",
  },
  {
    href: `${OPTION_A_BASE}/circulars`,
    label: "Circulars",
    labelHi: "परिपत्र",
    icon: ScrollText,
    tone: "from-violet-100 to-fuchsia-50 border-violet-200 text-violet-700",
  },
  {
    href: `${OPTION_A_BASE}/tenders`,
    label: "Tenders",
    labelHi: "निविदाएं",
    icon: Gavel,
    tone: "from-amber-100 to-orange-50 border-amber-200 text-amber-800",
  },
  {
    href: `${OPTION_A_BASE}/contact`,
    label: "Contact",
    labelHi: "संपर्क",
    icon: Mail,
    tone: "from-sky-100 to-cyan-50 border-sky-200 text-sky-800",
  },
];

export default function OptionAPage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <SiteHeader
        variant="heritage"
        homeHref={OPTION_A_BASE}
        navItems={optionANavItems}
        showMainNav
      />
      <NewsTicker variant="heritage" />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <HeroCarousel
          variant="heritage"
          primaryCtaHref={`${OPTION_A_BASE}/news`}
          secondaryCtaHref={`${OPTION_A_BASE}/contact`}
        />

        <StatsBar variant="heritage" />

        <section className="border-b border-rose-100 bg-white/70 py-8">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                  Client demo pages
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                  Explore Heritage inner pages
                </h2>
              </div>
              <p className="text-sm text-slate-500">Built only for Option A — not Option B</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {demoPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className={`group flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${page.tone}`}
                >
                  <page.icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">{page.label}</span>
                    <span className="block font-hindi text-xs opacity-80">{page.labelHi}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <DignitariesStrip variant="heritage" />
        <AboutSection variant="heritage" />
        <SpotlightSection variant="heritage" />
        <NewsSection variant="heritage" newsPath={`${OPTION_A_BASE}/news`} />
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
