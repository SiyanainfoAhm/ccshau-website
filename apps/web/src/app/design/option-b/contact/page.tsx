"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Phone, Send } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { university } from "@/lib/mock/site-content";

const offices = [
  { name: "Registrar Office", phone: "01662-255200", email: "registrar@hau.ac.in" },
  { name: "Computer Section", phone: "01662-255201", email: "computer@hau.ac.in" },
  { name: "Public Relations", phone: "01662-255202", email: "pro@hau.ac.in" },
];

export default function ContactPage() {
  return (
    <DesignShell>
      <SiteHeader variant="future" homeHref="/design/option-b" />
      <main id="main-content" className="flex-1">
        <div className="gradient-hero pattern-dots px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/design/option-b"
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">Contact Us</h1>
            <p className="mt-2 font-hindi text-emerald-100">संपर्क करें</p>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Get in Touch</h2>
            <div className="mt-6 space-y-4">
              {offices.map((o) => (
                <div
                  key={o.name}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-emerald-900">{o.name}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-emerald-600" /> {o.phone}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-emerald-600" /> {o.email}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-5">
              <MapPin className="mt-1 h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-semibold text-emerald-900">{university.nameEn}</p>
                <p className="text-sm text-slate-600">{university.location}</p>
                <p className="mt-1 text-sm font-medium text-emerald-700">{university.phone}</p>
              </div>
            </div>
          </div>

          <form className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
            <h2 className="font-display text-2xl font-bold text-slate-900">Send Feedback</h2>
            <p className="mt-1 text-sm text-slate-500">Department-wise enquiry form</p>
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              <select className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500">
                <option>Select department</option>
                <option>Computer Section</option>
                <option>Registrar</option>
                <option>Admissions</option>
              </select>
              <textarea
                rows={4}
                placeholder="Your message"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl gradient-gold py-4 font-bold text-emerald-950 shadow-lg transition hover:scale-[1.02]"
              >
                <Send className="h-5 w-5" /> Submit Feedback
              </button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter variant="future" />
    </DesignShell>
  );
}
