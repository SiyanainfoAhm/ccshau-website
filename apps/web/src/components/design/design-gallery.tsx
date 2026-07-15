"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers, Leaf, Sparkles } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { FloatingOrbs } from "@/components/design/shared/floating-orbs";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

const options = [
  {
    id: "a",
    name: "Heritage Premium",
    nameHi: "विरासत प्रीमियम",
    href: "/design/option-a",
    icon: Leaf,
    gradient: "from-rose-200 to-amber-100",
    accent: "border-amber-300",
    tag: "Colorful light heritage · demo pages ready",
    description:
      "Vibrant pastel UI — rose, amber, sky & violet — with dedicated demo pages for News, Circulars, Tenders and Contact.",
    selected: false,
    demoLinks: [
      { label: "News", href: "/design/option-a/news" },
      { label: "Circulars", href: "/design/option-a/circulars" },
      { label: "Tenders", href: "/design/option-a/tenders" },
      { label: "Contact", href: "/design/option-a/contact" },
    ],
  },
  {
    id: "b",
    name: "Agri Future",
    nameHi: "कृषि भविष्य",
    href: "/design/option-b",
    icon: Sparkles,
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    accent: "border-amber-400 ring-4 ring-amber-400/30",
    tag: "✓ Approved for development",
    description:
      "Immersive hero, glass panels, gradient cards, animated stats, and a vibrant modern feel that energizes visitors.",
    selected: true,
  },
  {
    id: "c",
    name: "Clean Ministry",
    nameHi: "स्वच्छ मंत्रालय",
    href: "/design/option-c",
    icon: Layers,
    gradient: "from-white via-slate-50 to-emerald-50",
    accent: "border-[#0c3b6e]",
    tag: "GOI accessibility reference",
    description:
      "GOI-style layout with tricolor bar, high contrast, and accessible forms — kept as an alternate reference.",
    selected: false,
  },
];

export function DesignGallery() {
  return (
    <DesignShell className="bg-[#faf8f2] dark:bg-[#0a1210]">
      <div className="gradient-hero pattern-dots animate-gradient-bg relative overflow-hidden px-4 py-20 text-white">
        <FloatingOrbs />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">
            Phase 1 — Deliverable D2
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold md:text-6xl">
            <span className="text-gradient-gold">{SELECTED_LAYOUT.name}</span> Selected
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100">
            Layout <strong>Option B — Agri Future</strong> is approved for Phase 3 public site
            development. Options A and C remain available for reference.
          </p>
          <Link
            href={SELECTED_LAYOUT.homePath}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl gradient-gold px-8 py-4 font-bold text-emerald-950 shadow-xl transition hover:scale-105"
          >
            Open approved homepage
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
        {options.map((opt) => (
          <div
            key={opt.id}
            className={`group relative flex flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-xl transition hover:-translate-y-2 hover:shadow-2xl ${opt.accent} ${opt.selected ? "md:scale-105 md:-translate-y-2" : "opacity-95"}`}
          >
            {opt.selected && (
              <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full gradient-gold px-3 py-1 text-xs font-bold text-emerald-950">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Approved
              </span>
            )}
            <Link href={opt.href} className={`bg-gradient-to-br ${opt.gradient} block p-8 text-white`}>
              <opt.icon className="h-10 w-10 text-amber-300" />
              <h2 className="mt-4 font-display text-2xl font-bold">{opt.name}</h2>
              <p className="font-hindi text-sm text-white/80">{opt.nameHi}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                {opt.tag}
              </p>
            </Link>
            <div className="flex flex-1 flex-col p-6">
              <p className="flex-1 text-sm leading-relaxed text-slate-600">{opt.description}</p>
              {"demoLinks" in opt && opt.demoLinks ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {opt.demoLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              <Link
                href={opt.href}
                className="mt-6 inline-flex items-center gap-2 font-semibold text-emerald-700 group-hover:gap-3"
              >
                {opt.selected ? "View approved layout" : "Preview homepage"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 text-center text-sm text-slate-500">
        <p>
          Heritage Premium demos:{" "}
          <Link href="/design/option-a/news" className="text-rose-700 underline">
            News
          </Link>
          ,{" "}
          <Link href="/design/option-a/circulars" className="text-rose-700 underline">
            Circulars
          </Link>
          ,{" "}
          <Link href="/design/option-a/tenders" className="text-rose-700 underline">
            Tenders
          </Link>
          ,{" "}
          <Link href="/design/option-a/contact" className="text-rose-700 underline">
            Contact
          </Link>
        </p>
        <p className="mt-3">
          Approved site pages:{" "}
          <Link href={SELECTED_LAYOUT.routes.news} className="text-emerald-700 underline">
            News
          </Link>
          ,{" "}
          <Link href={SELECTED_LAYOUT.routes.tenders} className="text-emerald-700 underline">
            Tenders
          </Link>
          ,{" "}
          <Link href={SELECTED_LAYOUT.routes.contact} className="text-emerald-700 underline">
            Contact
          </Link>
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Approved {SELECTED_LAYOUT.approvedDate} · Documented in docs/phase-1/approved-layout.md
        </p>
      </div>
    </DesignShell>
  );
}
