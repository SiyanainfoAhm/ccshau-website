"use client";

import { Mail, MapPin, Phone, Send } from "lucide-react";

import { DesignShell } from "@/components/design/design-shell";
import { HeritageInnerHero } from "@/components/design/shared/heritage-inner-hero";
import { useLanguage } from "@/components/design/shared/language-context";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import {
  OPTION_A_BASE,
  optionADemoOffices,
  optionANavItems,
  university,
} from "@/lib/design/option-a-demo";

export default function OptionAContactPage() {
  return (
    <DesignShell className="gradient-heritage-light min-h-screen">
      <ContactContent />
    </DesignShell>
  );
}

function ContactContent() {
  const { t } = useLanguage();

  return (
    <>
      <SiteHeader
        variant="heritage"
        homeHref={OPTION_A_BASE}
        navItems={optionANavItems}
        showMainNav
      />
      <main id="main-content" className="flex-1">
        <HeritageInnerHero
          title="Contact Us"
          titleHi="संपर्क करें"
          subtitle="Soft pastel cards and a heritage-styled feedback form for client demos."
          subtitleHi="क्लाइंट डेमो के लिए पेस्टल कार्ड और विरासत शैली फीडबैक फॉर्म।"
        />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {t("Get in Touch", "हमसे जुड़ें")}
            </h2>
            <div className="mt-6 space-y-4">
              {optionADemoOffices.map((office, i) => {
                const cards = [
                  "from-rose-50 to-pink-50 border-rose-200",
                  "from-amber-50 to-orange-50 border-amber-200",
                  "from-sky-50 to-cyan-50 border-sky-200",
                ];
                const icons = ["text-rose-600", "text-amber-600", "text-sky-600"];
                return (
                  <div
                    key={office.name}
                    className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${cards[i]}`}
                  >
                    <h3 className={`font-bold ${icons[i]}`}>{office.name}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <Phone className={`h-4 w-4 ${icons[i]}`} aria-hidden />
                      {office.phone}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <Mail className={`h-4 w-4 ${icons[i]}`} aria-hidden />
                      {office.email}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-violet-600" aria-hidden />
              <div>
                <p className="font-bold text-slate-900">{t(university.nameEn, university.nameHi)}</p>
                <p className="text-sm text-slate-600">{university.location}</p>
                <p className="mt-1 text-sm font-semibold text-violet-700">{university.phone}</p>
              </div>
            </div>
          </div>

          <form className="rounded-3xl border border-rose-200 bg-white/90 p-8 shadow-xl shadow-rose-100/50">
            <h2 className="font-display text-2xl font-bold">
              <span className="text-gradient-heritage">{t("Send Feedback", "फीडबैक भेजें")}</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("Demo form — heritage styling for client review", "डेमो फॉर्म — क्लाइंट समीक्षा हेतु")}
            </p>
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder={t("Your name", "आपका नाम")}
                className="w-full rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none ring-rose-200 focus:ring-2"
              />
              <input
                type="email"
                placeholder={t("Email address", "ईमेल पता")}
                className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 outline-none ring-amber-200 focus:ring-2"
              />
              <select className="w-full rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3 outline-none ring-sky-200 focus:ring-2">
                <option>{t("Select department", "विभाग चुनें")}</option>
                <option>Registrar</option>
                <option>Admissions</option>
                <option>Public Relations</option>
              </select>
              <textarea
                rows={4}
                placeholder={t("Your message", "आपका संदेश")}
                className="w-full rounded-xl border border-violet-200 bg-violet-50/40 px-4 py-3 outline-none ring-violet-200 focus:ring-2"
              />
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-rose-200"
              >
                <Send className="h-5 w-5" aria-hidden />
                {t("Submit Feedback", "फीडबैक जमा करें")}
              </button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter variant="heritage" />
    </>
  );
}
