"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Calendar,
  Download,
  ExternalLink,
  GraduationCap,
  Landmark,
  Microscope,
  Play,
  Users,
} from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { ScrollReveal } from "@/components/design/shared/scroll-reveal";
import { usePublicSiteChrome } from "@/components/site/public-site-context";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import type { PublicMediaAlbumItem, PublicNewsItem, PublicPage, PublicPageSummary, PublicQuickLink, PublicRelatedLink } from "@/lib/data/public-types";
import { getPublicPagePath } from "@/lib/pages/routes";
import { MINISTRY_STAT_ACCENTS } from "@/lib/design/ministry-theme";
import {
  HERITAGE_COLLEGE_PASTELS,
  HERITAGE_NEWS_PASTELS,
  HERITAGE_NOTIF_THEMES,
  HERITAGE_QUICK_LINK_PASTELS,
  HERITAGE_QUOTE_BACKGROUNDS,
  HERITAGE_STAT_PASTELS,
} from "@/lib/design/heritage-theme";
import {
  aboutHau,
  colleges,
  dignitaries,
  heritageNotifications,
  heritageQuotes,
  flagships,
  latestNews,
  mediaItems,
  partners,
  quickLinks,
  stats,
} from "@/lib/mock/site-content";

const quickLinkIcons = [GraduationCap, ExternalLink, Download, Users, Landmark, Microscope, Bell, Download];

const categoryIcons: Record<string, typeof Bell> = {
  Admissions: GraduationCap,
  Notice: Bell,
  Event: Calendar,
  Recruitment: Bell,
};

export function StatsBar({ variant = "future" }: { variant?: "heritage" | "future" | "ministry" }) {
  const { t } = useLanguage();

  if (variant === "ministry") {
    return (
      <section className="border-y-2 border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.labelEn}
              className={`border-l-4 bg-slate-50 px-6 py-8 text-center ${MINISTRY_STAT_ACCENTS[i % MINISTRY_STAT_ACCENTS.length]}`}
            >
              <p className="text-3xl font-bold text-[#146c43]">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{t(s.labelEn, s.labelHi)}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-10 -mt-10 mx-4 md:mx-auto md:max-w-6xl">
      <div
        className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${variant === "heritage" ? "" : "gap-px overflow-hidden rounded-sm shadow-2xl bg-gradient-to-r from-amber-400 to-amber-500"}`}
      >
        {stats.map((s, i) => {
          const pastel = HERITAGE_STAT_PASTELS[i % HERITAGE_STAT_PASTELS.length];
          return (
          <div
            key={s.labelEn}
            className={`animate-fade-up px-6 py-8 text-center ${
              variant === "heritage"
                ? `rounded-2xl border shadow-md ${pastel.card}`
                : "bg-[#0b3d2e]/95 text-white backdrop-blur"
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <p className={`font-display text-4xl font-bold ${variant === "heritage" ? pastel.value : "text-amber-300"}`}>{s.value}</p>
            <p className={`mt-1 text-sm font-medium ${variant === "heritage" ? "text-slate-600" : "text-emerald-100"}`}>{t(s.labelEn, s.labelHi)}</p>
          </div>
        );})}
      </div>
    </section>
  );
}

export function NewsSection({
  variant = "future",
  items: itemsProp,
  newsPath = SELECTED_LAYOUT.routes.news,
}: {
  variant?: "heritage" | "future" | "ministry";
  items?: PublicNewsItem[];
  newsPath?: string;
}) {
  const { t } = useLanguage();
  const newsHref =
    variant === "ministry"
      ? "/design/option-c/news"
      : variant === "heritage"
        ? "/design/option-b/news"
        : newsPath;

  const displayItems =
    itemsProp && itemsProp.length > 0
      ? itemsProp.map((item) => ({
          id: item.id,
          slug: item.slug,
          titleEn: item.titleEn,
          titleHi: item.titleHi ?? item.titleEn,
          category: item.category ?? item.noticeType,
          date: item.publishedAt
            ? new Date(item.publishedAt).toLocaleDateString("en-IN")
            : "",
        }))
      : latestNews;

  const sliceCount = variant === "heritage" ? displayItems.length : variant === "ministry" ? 6 : 4;

  return (
    <section
      className={`mx-auto max-w-7xl px-4 py-16 ${
        variant === "heritage"
          ? "heritage-section-glow bg-gradient-to-b from-sky-50/40 to-white"
          : variant === "ministry"
            ? "bg-white"
            : ""
      }`}
      id="news"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-sm font-bold uppercase tracking-widest ${variant === "heritage" ? "text-violet-600" : variant === "ministry" ? "text-[#e8850c]" : "text-emerald-600"}`}>
            {t("Stay Updated", "अपडेट रहें")}
          </p>
          <h2 className={`font-display text-3xl font-bold md:text-4xl ${variant === "heritage" ? "text-gradient-heritage" : "text-slate-900 dark:text-white"}`}>
            {t("Latest News & Notices", "नवीनतम समाचार और सूचनाएं")}
          </h2>
        </div>
        <Link href={newsHref} className={`inline-flex items-center gap-1 font-semibold ${variant === "heritage" ? "text-[#b45368] hover:text-[#9e4a5a]" : variant === "ministry" ? "text-[#146c43] hover:underline" : "text-emerald-700 hover:text-emerald-900"}`}>
          {t("View all", "सभी देखें")}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {displayItems.slice(0, sliceCount).map((item, i) => {
          const Icon = categoryIcons[item.category] ?? Bell;
          const pastel = variant === "heritage" ? HERITAGE_NEWS_PASTELS[i % HERITAGE_NEWS_PASTELS.length] : null;
          const detailHref =
            "slug" in item && item.slug
              ? `${newsHref}/${item.slug}`
              : item.id === 1
                ? variant === "ministry"
                  ? "/design/option-c/news/sample"
                  : "/design/option-b/news/sample"
                : "#";
          return (
            <article
              key={item.id}
              className={`group flex gap-4 rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-xl ${
                variant === "future"
                  ? "border-emerald-100 bg-white hover:border-emerald-300 hover:shadow-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                  : variant === "heritage" && pastel
                    ? `border-l-4 ${pastel.border} bg-gradient-to-r ${pastel.bg} border border-slate-100 shadow-sm`
                    : variant === "ministry"
                      ? "ministry-card border-l-4 border-l-[#146c43]"
                      : "border-slate-200 bg-white"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  variant === "future"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    : variant === "heritage" && pastel
                      ? pastel.icon
                      : variant === "ministry"
                        ? "bg-[#146c43] text-white"
                        : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${variant === "heritage" && pastel ? pastel.badge : variant === "heritage" ? "text-rose-600" : "text-emerald-600"}`}>
                  {item.category}
                </span>
                <h3 className={`mt-1 font-semibold leading-snug text-slate-900 group-hover:underline dark:text-emerald-50 ${variant === "heritage" ? "group-hover:text-[#9e4a5a]" : "group-hover:text-emerald-800"}`}>
                  <Link href={detailHref} className="hover:underline">
                    {t(item.titleEn, item.titleHi)}
                  </Link>
                </h3>
                <time className="mt-2 block text-sm text-slate-500">{item.date}</time>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CollegesGrid({
  variant = "future",
  colleges: collegesProp,
}: {
  variant?: "heritage" | "future" | "ministry";
  colleges?: PublicPageSummary[];
}) {
  const { t } = useLanguage();

  const heritageColors = HERITAGE_COLLEGE_PASTELS;
  const displayColleges =
    collegesProp && collegesProp.length > 0
      ? collegesProp.map((c) => ({
          nameEn: c.titleEn,
          nameHi: c.titleHi ?? c.titleEn,
          href: getPublicPagePath(c.slug, c.pageType ?? "college"),
          color: "from-emerald-600 to-teal-700",
        }))
      : colleges.map((c) => ({ ...c, href: "#" as string }));

  return (
    <section
      className={`py-16 ${
        variant === "heritage"
          ? "bg-gradient-to-br from-violet-50/50 via-white to-amber-50/50"
          : variant === "ministry"
            ? "border-y border-slate-200 bg-slate-50"
            : "bg-gradient-to-b from-emerald-50/80 to-transparent dark:from-emerald-950/20"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <h2 className={`text-center font-display text-3xl font-bold md:text-4xl ${variant === "heritage" ? "text-gradient-heritage" : "text-slate-900 dark:text-white"}`}>
          {t("Education at University", "विश्वविद्यालय में शिक्षा")}
        </h2>
        <p className={`mx-auto mt-3 max-w-2xl text-center ${variant === "heritage" ? "text-slate-600" : "text-slate-600 dark:text-emerald-100/80"}`}>
          {t(
            "Nine colleges offering world-class agricultural education and research",
            "विश्व स्तरीय कृषि शिक्षा और अनुसंधान प्रदान करने वाले नौ महाविद्यालय",
          )}
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayColleges.map((college, i) => (
            <Link
              key={college.nameEn}
              href={college.href}
              className={`group relative overflow-hidden rounded-2xl p-6 transition hover:-translate-y-1 ${
                variant === "heritage"
                  ? `bg-gradient-to-br ${heritageColors[i % heritageColors.length]} text-slate-800 shadow-md ring-2 ring-white/70 hover:-translate-y-2 hover:shadow-xl`
                  : variant === "ministry"
                    ? "ministry-card border-l-4 border-l-[#146c43] bg-white text-slate-800"
                    : `text-white bg-gradient-to-br ${college.color} shadow-lg hover:-translate-y-2 hover:shadow-2xl`
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 transition group-hover:scale-150" />
              <h3 className="relative font-display text-xl font-bold leading-tight">
                {t(college.nameEn, college.nameHi)}
              </h3>
              <span className={`relative mt-4 inline-flex items-center gap-1 text-sm font-semibold ${variant === "heritage" || variant === "ministry" ? "text-[#146c43]" : "text-white/90"}`}>
                {t("Explore", "अन्वेषण")}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuickLinksStrip({
  variant = "future",
  links: linksProp,
}: {
  variant?: "heritage" | "future" | "ministry";
  links?: PublicQuickLink[];
}) {
  const { t } = useLanguage();
  const chrome = usePublicSiteChrome();
  const linkItems =
    linksProp ??
    chrome?.quickLinks ??
    quickLinks.map((label) => ({ labelEn: label, labelHi: null, href: "#" }));

  if (variant === "ministry") {
    return (
      <section className="border-y-2 border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 text-center font-display text-2xl font-bold text-slate-900">
            {t("Quick Links", "त्वरित लिंक")}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {linkItems.slice(0, 12).map((link) => (
              <Link
                key={link.labelEn}
                href={link.href}
                className="ministry-focus rounded-md border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 hover:border-[#146c43] hover:bg-emerald-50 hover:text-[#146c43]"
              >
                {t(link.labelEn, link.labelHi ?? link.labelEn)}
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-8 text-center">
        <p className={`text-sm font-bold uppercase tracking-widest ${variant === "heritage" ? "text-orange-600" : "text-emerald-600"}`}>
          {t("Quick Access", "त्वरित पहुंच")}
        </p>
        <h2 className={`font-display text-3xl font-bold ${variant === "heritage" ? "text-gradient-heritage" : "text-slate-900 dark:text-white"}`}>
          {t("Everything You Need, One Click Away", "आपकी जरूरत, एक क्लिक दूर")}
        </h2>
      </div>

      <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {linkItems.map((link, i) => {
          const Icon = quickLinkIcons[i] ?? ExternalLink;
          const pastel = variant === "heritage" ? HERITAGE_QUICK_LINK_PASTELS[i % HERITAGE_QUICK_LINK_PASTELS.length] : "";
          return (
            <Link
              key={link.labelEn}
              href={link.href}
              className={`group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition hover:-translate-y-1 hover:shadow-lg ${
                variant === "heritage"
                  ? `bg-gradient-to-br ${pastel}`
                  : "bento-card"
              } ${i === 0 && variant !== "heritage" ? "sm:col-span-2 sm:flex-row sm:text-left animate-pulse-glow" : ""} ${
                i === 0 && variant === "heritage" ? "sm:col-span-2 sm:flex-row sm:text-left ring-2 ring-amber-300/50" : ""
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-110 ${
                  variant === "heritage"
                    ? "bg-white/80 text-violet-600 shadow-sm"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold leading-snug text-slate-800 dark:text-emerald-50">
                {t(link.labelEn, link.labelHi ?? link.labelEn)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SpotlightSection({ variant = "future" }: { variant?: "heritage" | "future" | "ministry" }) {
  const { t } = useLanguage();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (variant !== "heritage") return;
    const id = setInterval(() => setQuoteIndex((i) => (i + 1) % heritageQuotes.length), 8000);
    return () => clearInterval(id);
  }, [variant]);

  if (variant === "heritage") {
    const quote = heritageQuotes[quoteIndex];
    const quoteBg = HERITAGE_QUOTE_BACKGROUNDS[quoteIndex % HERITAGE_QUOTE_BACKGROUNDS.length];
    return (
      <ScrollReveal>
        <section className={`relative overflow-hidden bg-gradient-to-br ${quoteBg} py-16`}>
          <div className="pattern-heritage-light absolute inset-0" />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <p className="inline-block rounded-full bg-white/70 px-5 py-1.5 font-display text-sm font-semibold uppercase tracking-wider text-violet-700 shadow-sm ring-1 ring-violet-100">
              {t(quote.authorEn, quote.authorHi)}
            </p>
            <blockquote className="mt-8 font-display text-2xl font-medium leading-relaxed text-slate-700 md:text-3xl">
              &ldquo;{t(quote.quoteEn, quote.quoteHi)}&rdquo;
            </blockquote>
            <div className="mt-8 flex justify-center gap-2">
              {heritageQuotes.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuoteIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === quoteIndex ? "w-8 bg-gradient-to-r from-rose-400 to-violet-400" : "w-2 bg-white/80 ring-1 ring-rose-200"}`}
                  aria-label={`Quote ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>
    );
  }

  if (variant === "ministry") {
    return (
      <ScrollReveal>
        <section className="border-y-4 border-[#146c43] bg-white py-14">
          <div className="mx-auto max-w-4xl px-4">
            <div className="rounded-md border-2 border-slate-200 bg-slate-50 p-8">
              <p className="text-sm font-bold uppercase tracking-widest text-[#e8850c]">
                {t("Accessibility & Digital India", "पहुंच और डिजिटल इंडिया")}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 md:text-3xl">
                {t("Built for Every Citizen", "हर नागरिक के लिए")}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-700">
                {t(
                  "This layout follows Government of India web guidelines — high contrast, keyboard navigation, screen-reader support, font resizing, and bilingual content for inclusive access.",
                  "यह लेआउट भारत सरकार के वेब दिशानिर्देशों का पालन करता है — उच्च कंट्रास्ट, कीबोर्ड नेविगेशन, स्क्रीन-रीडर समर्थन, फ़ॉन्ट आकार और समावेशी पहुंच के लिए द्विभाषी सामग्री।",
                )}
              </p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {["WCAG 2.1 AA contrast", "Skip to content", "हिंदी / English", "Font size controls"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-[#146c43]">
                    <span className="h-2 w-2 rounded-full bg-[#e8850c]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </ScrollReveal>
    );
  }

  if (variant !== "future") return null;

  return (
    <section className="relative overflow-hidden py-16">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b3d2e] via-[#146c43] to-[#0d4a38]" />
      <div className="pattern-dots absolute inset-0 opacity-60" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-2 lg:items-center">
        <div className="animate-fade-up">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-300">
            {t("From the Vice-Chancellor", "कुलपति का संदेश")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white md:text-4xl">
            {t(
              "Nurturing Agripreneurs for a Sustainable Tomorrow",
              "सतत कल के लिए कृषि उद्यमियों का पोषण",
            )}
          </h2>
          <p className="mt-5 leading-relaxed text-emerald-100/90">
            {t(
              "CCSHAU Hisar stands at the intersection of tradition and innovation — empowering farmers, students and researchers to shape India's agricultural future.",
              "सीसीएसएचएयू हिसार परंपरा और नवाचार के संगम पर खड़ा है — किसानों, छात्रों और शोधकर्ताओं को भारत के कृषि भविष्य को आकार देने के लिए सशक्त बनाता है।",
            )}
          </p>
          <Link
            href="#"
            className="mt-6 inline-flex items-center gap-2 font-semibold text-amber-300 hover:text-amber-200"
          >
            {t("Read full message", "पूरा संदेश पढ़ें")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative animate-fade-up">
          <div className="overflow-hidden rounded-3xl border-2 border-amber-400/40 shadow-2xl shadow-black/30">
            <div className="relative aspect-[4/3]">
              <Image
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80"
                alt=""
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b3d2e]/90 via-transparent to-transparent" />
              <div className="absolute bottom-0 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                  {t("Research Spotlight", "अनुसंधान स्पॉटलाइट")}
                </p>
                <p className="mt-2 font-display text-xl font-bold text-white">
                  {t("Climate-Resilient Wheat Varieties", "जलवायु-सहनशील गेहूं किस्में")}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 rounded-2xl gradient-gold px-5 py-3 font-bold text-emerald-950 shadow-xl">
            50+ {t("Research Projects", "अनुसंधान परियोजनाएं")}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DignitariesStrip({ variant = "future" }: { variant?: "heritage" | "future" | "ministry" }) {
  const { t } = useLanguage();

  return (
    <section className={`border-y py-6 ${
      variant === "heritage"
        ? "border-y border-white/60 bg-gradient-to-r from-rose-100/80 via-amber-50/80 to-sky-100/80"
        : variant === "ministry"
          ? "border-y-2 border-slate-200 bg-white"
          : "border-emerald-100 bg-white/80 dark:border-emerald-900/40 dark:bg-emerald-950/20"
    }`}>
      <div className="mx-auto max-w-7xl px-4 text-center">
        {(variant === "heritage" || variant === "ministry") && (
          <p className={`mb-3 text-xs font-bold uppercase tracking-[0.2em] ${variant === "ministry" ? "text-[#146c43]" : "text-violet-600"}`}>
            {t("Dignitaries", "गणमान्य व्यक्ति")}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {dignitaries.map((name) => (
          <span
            key={name}
            className={`text-center text-xs font-semibold ${variant === "heritage" || variant === "ministry" ? "text-slate-600" : "uppercase tracking-wide text-slate-500 dark:text-emerald-200/70"}`}
          >
            {t(name, name)}
          </span>
        ))}
        </div>
      </div>
    </section>
  );
}

export function NewsTicker({
  variant = "future",
  headlines: headlinesProp,
}: {
  variant?: "heritage" | "future" | "ministry";
  headlines?: { titleEn: string; titleHi: string }[];
}) {
  const { t } = useLanguage();
  const items =
    headlinesProp && headlinesProp.length > 0
      ? headlinesProp.map((h) => t(h.titleEn, h.titleHi))
      : latestNews.map((n) => t(n.titleEn, n.titleHi));

  if (variant === "ministry") {
    return (
      <div className="border-b-2 border-[#146c43] bg-[#146c43] py-2.5 text-sm font-semibold text-white">
        <div className="flex animate-marquee gap-12 whitespace-nowrap px-4">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="rounded bg-[#e8850c] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                {t("Notice", "सूचना")}
              </span>
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "heritage") {
    return (
      <div className="relative overflow-hidden border-b border-rose-100 bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 py-2.5 text-sm font-semibold text-slate-700">
        <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-rose-50 to-transparent" />
        <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-sky-50 to-transparent" />
        <div className="flex animate-marquee gap-12 whitespace-nowrap">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="rounded-full bg-gradient-to-r from-rose-400 to-violet-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                {t("Latest", "नवीनतम")}
              </span>
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#d4a012] via-[#f0c14b] to-[#d4a012] py-2.5 text-sm font-bold text-emerald-950 shadow-inner">
      <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#d4a012] to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#d4a012] to-transparent" />
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200">
              New
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AboutSection({
  variant = "future",
  page,
}: {
  variant?: "heritage" | "future" | "ministry";
  page?: PublicPage | null;
}) {
  const { t } = useLanguage();

  const titleEn = page?.titleEn ?? aboutHau.titleEn;
  const titleHi = page?.titleHi ?? aboutHau.titleHi;
  const headingEn = page
    ? page.titleEn
    : "One of Asia's Biggest Agricultural Universities";
  const headingHi = page
    ? page.titleHi ?? page.titleEn
    : "एशिया के सबसे बड़े कृषि विश्वविद्यालयों में से एक";
  const bodyEn = page?.excerptEn ?? page?.contentEn?.slice(0, 400) ?? aboutHau.textEn;
  const bodyHi = page?.excerptHi ?? page?.contentHi?.slice(0, 400) ?? aboutHau.textHi;
  const readMoreHref = page ? `/pages/${page.slug}` : "#";

  return (
    <ScrollReveal>
      <section className={`mx-auto max-w-7xl px-4 py-16 ${variant === "heritage" ? "bg-gradient-to-br from-amber-50/40 via-white to-rose-50/40" : variant === "ministry" ? "bg-slate-50" : ""}`}>
        <div
          className={`grid gap-10 overflow-hidden p-8 md:grid-cols-2 md:p-12 ${
            variant === "future"
              ? "rounded-3xl bg-gradient-to-br from-white to-emerald-50/80 shadow-xl shadow-emerald-100/50 ring-1 ring-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:ring-emerald-800/50"
              : variant === "heritage"
                ? "rounded-3xl border-2 border-transparent bg-white shadow-xl [border-image:linear-gradient(135deg,#fda4af,#fcd34d,#7dd3fc,#c4b5fd)_1]"
                : "rounded-md border-2 border-[#146c43] bg-white shadow-md"
          }`}
        >
          <div>
            <p className={`text-sm font-bold uppercase tracking-widest ${variant === "heritage" ? "text-rose-500" : variant === "ministry" ? "text-[#e8850c]" : "text-emerald-600"}`}>
              {t(titleEn, titleHi)}
            </p>
            <h2 className={`mt-3 font-display text-3xl font-bold md:text-4xl ${variant === "heritage" ? "text-gradient-heritage" : "text-slate-900 dark:text-white"}`}>
              {t(headingEn, headingHi)}
            </h2>
            <p className="mt-5 leading-relaxed text-slate-600 dark:text-emerald-100/80">
              {t(bodyEn, bodyHi)}
            </p>
            <Link
              href={readMoreHref}
              className={`mt-6 inline-flex items-center gap-2 px-6 py-3 font-semibold text-white transition ${
                variant === "heritage"
                  ? "rounded-xl bg-gradient-to-r from-rose-500 via-violet-500 to-sky-500 shadow-lg hover:opacity-90"
                  : variant === "ministry"
                    ? "ministry-focus rounded-md bg-[#146c43] hover:bg-[#0b3d2e]"
                    : "rounded-xl bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {t("Read more", "और पढ़ें")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className={`relative min-h-[240px] overflow-hidden ${variant === "ministry" ? "rounded-md border-2 border-slate-300" : "rounded-2xl ring-2 ring-amber-200/50"}`}>
            <Image
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80"
              alt=""
              fill
              className="object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-t to-transparent ${variant === "heritage" ? "from-slate-800/50" : variant === "ministry" ? "from-slate-800/40" : "from-[#0b3d2e]/80"}`} />
            <div className={`absolute bottom-4 left-4 right-4 rounded-xl p-4 ${variant === "heritage" ? "bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 shadow-lg ring-1 ring-white" : variant === "ministry" ? "bg-white/95 border border-slate-200 shadow-md" : "glass-panel"}`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${variant === "heritage" ? "text-violet-600" : variant === "ministry" ? "text-[#146c43]" : "text-amber-200"}`}>
                {t("Since 1970", "1970 से")}
              </p>
              <p className={`mt-1 font-display text-lg font-bold ${variant === "heritage" || variant === "ministry" ? "text-slate-800" : "text-white"}`}>
                {t("Hisar, Haryana, India", "हिसार, हरियाणा, भारत")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

export function MinistryNotificationsSection() {
  const { t } = useLanguage();

  const columns = [
    { key: "news" as const, titleEn: "News", titleHi: "समाचार", accent: "bg-[#146c43]" },
    { key: "recruitment" as const, titleEn: "Recruitment", titleHi: "भर्ती", accent: "bg-[#e8850c]" },
    { key: "tenders" as const, titleEn: "Tenders / Auctions", titleHi: "निविदा / नीलामी", accent: "bg-slate-700" },
  ];

  return (
    <ScrollReveal>
      <section className="border-y-2 border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-slate-900">
            {t("Notifications", "सूचनाएं")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {columns.map((col) => (
              <div key={col.key} className="ministry-card overflow-hidden rounded-md">
                <h3 className={`${col.accent} px-5 py-3 font-display text-lg font-bold text-white`}>
                  {t(col.titleEn, col.titleHi)}
                </h3>
                <ul className="space-y-3 p-5">
                  {heritageNotifications[col.key].map((item) => (
                    <li key={item}>
                      <Link href="#" className="text-sm leading-snug text-slate-700 hover:text-[#146c43] hover:underline">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-100 px-5 py-3">
                  <Link href="#" className="text-sm font-bold text-[#146c43] hover:underline">
                    {t("Read more", "और पढ़ें")} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

export function HeritageNotificationsSection() {
  const { t } = useLanguage();

  const columns = [
    { key: "news" as const, titleEn: "News", titleHi: "समाचार" },
    { key: "recruitment" as const, titleEn: "Recruitment", titleHi: "भर्ती" },
    { key: "tenders" as const, titleEn: "Tenders / Auctions", titleHi: "निविदा / नीलामी" },
  ];

  return (
    <ScrollReveal>
      <section className="bg-gradient-to-br from-teal-50/30 via-white to-orange-50/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-gradient-heritage md:text-4xl">
            {t("Notifications", "सूचनाएं")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {columns.map((col, i) => {
              const theme = HERITAGE_NOTIF_THEMES[i];
              return (
              <div key={col.key} className={`overflow-hidden rounded-2xl border bg-white shadow-md ${theme.border}`}>
                <h3 className={`bg-gradient-to-r ${theme.header} px-6 py-4 font-display text-lg font-bold text-white`}>
                  {t(col.titleEn, col.titleHi)}
                </h3>
                <div className="p-6">
                <ul className="space-y-3">
                  {heritageNotifications[col.key].map((item) => (
                    <li key={item}>
                      <Link href="#" className={`text-sm leading-snug text-slate-600 hover:underline ${theme.link}`}>
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="#" className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:underline ${theme.link}`}>
                  {t("Read more", "और पढ़ें")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                </div>
              </div>
            );})}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

export function MediaGallerySection({
  variant = "future",
  albums,
}: {
  variant?: "heritage" | "future" | "ministry";
  albums?: PublicMediaAlbumItem[];
}) {
  const { t } = useLanguage();
  const isHeritage = variant === "heritage";
  const isMinistry = variant === "ministry";

  const galleryItems =
    albums && albums.length > 0
      ? albums.slice(0, 4).map((album) => ({
          titleEn: album.titleEn,
          titleHi: album.titleHi,
          image: album.coverUrl ?? mediaItems[0]?.image ?? "",
          href: `${SELECTED_LAYOUT.routes.media}/${album.slug}`,
          type: album.albumType === "video" ? ("video" as const) : ("photo" as const),
        }))
      : mediaItems.map((item) => ({
          titleEn: item.titleEn,
          titleHi: item.titleHi,
          image: item.image,
          href: SELECTED_LAYOUT.routes.media,
          type: item.type,
        }));

  return (
    <ScrollReveal>
      <section
        className={
          isMinistry
            ? "border-y border-slate-200 bg-slate-50 py-16"
            : isHeritage
              ? "bg-gradient-to-br from-fuchsia-50/40 via-white to-cyan-50/40 py-16"
              : "bg-slate-900 py-16 text-white"
        }
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`text-sm font-bold uppercase tracking-widest ${isHeritage ? "text-fuchsia-600" : isMinistry ? "text-[#e8850c]" : "text-amber-400"}`}>
                {t("Media Gallery", "मीडिया गैलरी")}
              </p>
              <h2 className={`font-display text-3xl font-bold md:text-4xl ${isHeritage ? "text-gradient-heritage" : isMinistry ? "text-slate-900" : ""}`}>
                {t("Photo & Video Gallery", "फोटो और वीडियो गैलरी")}
              </h2>
            </div>
            <Link
              href={SELECTED_LAYOUT.routes.media}
              className={`inline-flex items-center gap-1 font-semibold ${isHeritage ? "text-[#b45368] hover:text-[#9e4a5a]" : isMinistry ? "text-[#146c43] hover:underline" : "text-amber-300 hover:text-amber-200"}`}
            >
              {t("Full gallery", "पूरी गैलरी")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {galleryItems.map((item, i) => (
              <Link
                key={`${item.titleEn}-${i}`}
                href={item.href}
                className={`card-shine group relative overflow-hidden rounded-2xl ${isHeritage ? `ring-2 ${["ring-rose-200", "ring-amber-200", "ring-sky-200", "ring-violet-200"][i % 4]}` : isMinistry ? "ministry-card rounded-md" : ""} ${i === 0 ? "sm:row-span-2 sm:min-h-[320px]" : "aspect-[4/3]"}`}
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {item.type === "video" && (
                  <div className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-xl transition group-hover:scale-110 ${isHeritage ? "bg-[#b45368] text-white" : isMinistry ? "bg-[#146c43] text-white" : "bg-amber-400 text-emerald-950"}`}>
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                )}
                <p className="absolute bottom-4 left-4 right-4 text-sm font-bold">
                  {t(item.titleEn, item.titleHi ?? item.titleEn)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}

export function FlagshipsSection({ variant = "future" }: { variant?: "heritage" | "future" | "ministry" }) {
  const { t } = useLanguage();
  const isHeritage = variant === "heritage";
  const isMinistry = variant === "ministry";
  const items = isHeritage ? flagships : isMinistry ? flagships.slice(0, 4) : flagships.slice(0, 3);

  return (
    <ScrollReveal>
      <section className={`mx-auto max-w-7xl px-4 py-16 ${isHeritage ? "bg-gradient-to-br from-lime-50/40 via-white to-indigo-50/40" : isMinistry ? "bg-white" : ""}`}>
        <div className="text-center">
          <p className={`text-sm font-bold uppercase tracking-widest ${isHeritage ? "text-lime-600" : isMinistry ? "text-[#e8850c]" : "text-emerald-600"}`}>
            {t("Flagships", "प्रमुख पहल")}
          </p>
          <h2 className={`font-display text-3xl font-bold md:text-4xl ${isHeritage ? "text-gradient-heritage" : "text-slate-900 dark:text-white"}`}>
            {t("University Initiatives", "विश्वविद्यालय की पहल")}
          </h2>
        </div>

        <div className={`mt-12 grid gap-6 ${isHeritage ? "sm:grid-cols-2 lg:grid-cols-3" : isMinistry ? "sm:grid-cols-2" : "md:grid-cols-3"}`}>
          {items.map((item) => (
            <Link
              key={item.titleEn}
              href="#"
              className={`card-shine group overflow-hidden transition hover:-translate-y-1 ${
                isMinistry ? "ministry-card rounded-md" : "rounded-2xl border-2 border-white bg-white shadow-lg hover:-translate-y-2 hover:shadow-xl"
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-t to-transparent ${isMinistry ? "from-slate-900/60" : isHeritage ? "from-slate-800/70" : "from-[#0b3d2e]/90"}`} />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {t(item.titleEn, item.titleHi)}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.descEn}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

export function PartnersSection({
  variant = "future",
  links,
}: {
  variant?: "heritage" | "future" | "ministry";
  links?: PublicRelatedLink[];
}) {
  const { t } = useLanguage();
  const displayLinks =
    links && links.length > 0
      ? links.map((link) => ({
          name: t(link.titleEn, link.titleHi ?? link.titleEn),
          href: link.url,
          external: link.isExternal,
        }))
      : partners.map((name) => ({ name, href: "#", external: false }));

  return (
    <section className={`border-y py-10 ${
      variant === "heritage"
        ? "border-rose-100/80 bg-gradient-to-r from-rose-50 via-amber-50 to-violet-50"
        : variant === "ministry"
          ? "border-t-2 border-slate-200 bg-slate-50"
          : "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
    }`}>
      <div className="mx-auto max-w-7xl px-4">
        <p className={`mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] ${
          variant === "heritage" ? "text-violet-600" : variant === "ministry" ? "text-[#146c43]" : "text-emerald-700"
        }`}>
          {t("Our Partners", "हमारे साझेदार")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {displayLinks.map((item) =>
            item.external || item.href.startsWith("http") ? (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-display text-lg font-bold transition ${
                  variant === "heritage"
                    ? "text-slate-500 hover:text-violet-600"
                    : variant === "ministry"
                      ? "text-slate-500 hover:text-[#146c43]"
                      : "text-slate-400 hover:text-emerald-700 dark:text-emerald-600/60 dark:hover:text-emerald-400"
                }`}
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={`font-display text-lg font-bold transition ${
                  variant === "heritage"
                    ? "text-slate-500 hover:text-violet-600"
                    : variant === "ministry"
                      ? "text-slate-500 hover:text-[#146c43]"
                      : "text-slate-400 hover:text-emerald-700 dark:text-emerald-600/60 dark:hover:text-emerald-400"
                }`}
              >
                {item.name}
              </Link>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
