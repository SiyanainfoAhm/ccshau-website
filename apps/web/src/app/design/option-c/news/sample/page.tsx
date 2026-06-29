"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Download, Share2, Tag } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { latestNews } from "@/lib/mock/site-content";

const article = latestNews[0];

export default function OptionCNewsSamplePage() {
  return (
    <DesignShell className="bg-white">
      <SiteHeader variant="ministry" homeHref="/design/option-c" />
      <main id="main-content" className="flex-1">
        <div className="goi-tricolor-bar" />
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/design/option-c/news"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146c43] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to news
            </Link>
            <span className="rounded bg-[#e8850c] px-2 py-0.5 text-xs font-bold uppercase text-white">
              {article.category}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold text-slate-900 md:text-4xl">
              {article.titleEn}
            </h1>
            <p className="mt-2 font-hindi text-lg text-slate-600">{article.titleHi}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" aria-hidden /> {article.date}
              </span>
              <span className="inline-flex items-center gap-1">
                <Tag className="h-4 w-4" aria-hidden /> Notice
              </span>
            </div>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-10 prose prose-slate">
          <p className="text-lg leading-relaxed text-slate-700">
            Chaudhary Charan Singh Haryana Agricultural University invites applications under the
            Prime Minister Internship Scheme (PMIS). Eligible students and graduates may apply
            through the official portal before the closing date.
          </p>
          <p className="leading-relaxed text-slate-600">
            For full details, download the official notification or contact the Directorate of
            Students Welfare, CCSHAU Hisar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 not-prose">
            <button
              type="button"
              className="ministry-focus inline-flex items-center gap-2 rounded-md bg-[#146c43] px-5 py-2.5 font-semibold text-white hover:bg-[#0b3d2e]"
            >
              <Download className="h-4 w-4" aria-hidden /> Download PDF
            </button>
            <button
              type="button"
              className="ministry-focus inline-flex items-center gap-2 rounded-md border-2 border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:border-[#146c43]"
            >
              <Share2 className="h-4 w-4" aria-hidden /> Share
            </button>
          </div>
        </article>
      </main>
      <SiteFooter variant="ministry" />
    </DesignShell>
  );
}
