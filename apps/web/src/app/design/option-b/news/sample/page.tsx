"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Download, Share2, Tag } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";

export default function NewsDetailPage() {
  return (
    <DesignShell>
      <SiteHeader variant="future" homeHref="/design/option-b" />
      <main id="main-content" className="flex-1">
        <div className="gradient-hero pattern-dots px-4 py-12 text-white">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/design/option-b/news"
              className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to news
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 font-semibold text-amber-200">
                <Tag className="h-3.5 w-3.5" /> Admissions
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-200">
                <Calendar className="h-3.5 w-3.5" /> 20 June 2026
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
              Online Admission 2026-27
            </h1>
            <p className="mt-3 font-hindi text-lg text-emerald-100">ऑनलाइन प्रवेश 2026-27</p>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-12">
          <div className="prose prose-emerald max-w-none prose-headings:font-display">
            <p className="text-lg leading-relaxed text-slate-600">
              Applications are invited for undergraduate and postgraduate programmes for the
              academic session 2026-27. Candidates may apply through the university online portal.
              Please read the prospectus and eligibility criteria carefully before submitting your
              application.
            </p>

            <h2>Important Dates</h2>
            <ul>
              <li>Application window opens: 1 July 2026</li>
              <li>Last date to apply: 31 July 2026</li>
              <li>Merit list publication: 15 August 2026</li>
            </ul>

            <h2>How to Apply</h2>
            <ol>
              <li>Register on the admission portal with a valid email and mobile number.</li>
              <li>Complete the application form and upload required documents.</li>
              <li>Pay the application fee online and submit.</li>
              <li>Download and retain the confirmation receipt.</li>
            </ol>

            <div className="not-prose mt-10 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl gradient-gold px-6 py-3 font-bold text-emerald-950 shadow-lg"
              >
                <Download className="h-4 w-4" /> Download Prospectus
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-3 font-semibold text-emerald-800"
              >
                <Share2 className="h-4 w-4" /> Share notice
              </button>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter variant="future" />
    </DesignShell>
  );
}
