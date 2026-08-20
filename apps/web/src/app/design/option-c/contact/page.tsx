"use client";

import { Mail, MapPin, Phone, Send } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { MinistryInnerHero } from "@/components/design/shared/ministry-inner-hero";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { university } from "@/lib/mock/site-content";

const offices = [
  { name: "Registrar Office", phone: "01662-255200", email: "registrar@hau.ac.in" },
  { name: "Computer Section", phone: "01662-255201", email: "computer@hau.ac.in" },
  { name: "Public Relations", phone: "01662-255202", email: "pro@hau.ac.in" },
];

export default function OptionCContactPage() {
  return (
    <DesignShell className="bg-slate-50">
      <SiteHeader variant="ministry" homeHref="/design/option-c" />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <MinistryInnerHero title="Contact Us" titleHi="संपर्क करें" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Get in Touch</h2>
            <div className="mt-6 space-y-4">
              {offices.map((o) => (
                <div key={o.name} className="ministry-card rounded-md p-5">
                  <h3 className="font-bold text-[#0c3b6e]">{o.name}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="h-4 w-4 text-[#0c3b6e]" aria-hidden /> {o.phone}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="h-4 w-4 text-[#0c3b6e]" aria-hidden /> {o.email}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-md border-2 border-[#0c3b6e] bg-white p-5">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#0c3b6e]" aria-hidden />
              <div>
                <p className="font-bold text-slate-900">{university.nameEn}</p>
                <p className="text-sm text-slate-600">{university.location}</p>
                <p className="mt-1 text-sm font-semibold text-[#0c3b6e]">{university.phone}</p>
              </div>
            </div>
          </div>

          <form className="ministry-card rounded-md p-8">
            <h2 className="font-display text-2xl font-bold text-slate-900">Send Feedback</h2>
            <p className="mt-1 text-sm text-slate-600">Department-wise enquiry (GOI accessible form)</p>
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Your name"
                className="ministry-focus w-full rounded-md border-2 border-slate-300 px-4 py-3 outline-none focus:border-[#0c3b6e]"
              />
              <input
                type="email"
                placeholder="Email address"
                className="ministry-focus w-full rounded-md border-2 border-slate-300 px-4 py-3 outline-none focus:border-[#0c3b6e]"
              />
              <select className="ministry-focus w-full rounded-md border-2 border-slate-300 px-4 py-3 outline-none focus:border-[#0c3b6e]">
                <option>Select department</option>
                <option>Computer Section</option>
                <option>Registrar</option>
                <option>Admissions</option>
              </select>
              <textarea
                rows={4}
                placeholder="Your message"
                className="ministry-focus w-full rounded-md border-2 border-slate-300 px-4 py-3 outline-none focus:border-[#0c3b6e]"
              />
              <button
                type="button"
                className="ministry-focus inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0c3b6e] py-4 font-bold text-white hover:bg-[#082952]"
              >
                <Send className="h-5 w-5" aria-hidden /> Submit Feedback
              </button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter variant="ministry" />
    </DesignShell>
  );
}
