"use client";

import { Building2, Mail, MapPin, Phone } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PublicCollegePage, PublicOfficeContactLine } from "@/lib/data/public-types";
import { publicCardClass, publicMutedTextClass } from "@/lib/design/public-page-classes";

function findContactLine(lines: PublicOfficeContactLine[], ...keywords: string[]) {
  const lower = keywords.map((k) => k.toLowerCase());
  return lines.find((line) =>
    lower.some((keyword) => line.labelEn.toLowerCase().includes(keyword)),
  );
}

function splitContactValues(value: string) {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildMapEmbedSrc(
  collegeName: string,
  address: string | null,
  mapLat: number | null,
  mapLng: number | null,
) {
  // Use www.google.com (allowed by CSP frame-src), not maps.google.com.
  if (mapLat != null && mapLng != null) {
    return `https://www.google.com/maps?q=${mapLat},${mapLng}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;
  }

  const mapQuery = encodeURIComponent(
    [collegeName, address].filter(Boolean).join(", ") || `${collegeName}, Hisar, Haryana`,
  );
  return `https://www.google.com/maps?q=${mapQuery}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;
}

export function PublicCollegeContactPage({
  college,
  contactLines,
}: {
  college: PublicCollegePage;
  contactLines: PublicOfficeContactLine[];
}) {
  const { lang, t } = useLanguage();

  const collegeName = pickBilingual(lang, college.titleEn, college.titleHi);
  const addressLine = findContactLine(contactLines, "mailing", "address");
  const officeLine = findContactLine(contactLines, "office", "phone", "telephone");
  const emailLine = findContactLine(contactLines, "email", "e-mail");

  const address = addressLine
    ? pickBilingual(lang, addressLine.valueEn, addressLine.valueHi)
    : null;

  const officeRaw = officeLine
    ? pickBilingual(lang, officeLine.valueEn, officeLine.valueHi)
    : "";
  const phones = splitContactValues(officeRaw.replace(/^office\s*:\s*/i, ""));

  const emailRaw = emailLine
    ? pickBilingual(lang, emailLine.valueEn, emailLine.valueHi)
    : "";
  const emails = splitContactValues(emailRaw.replace(/^e-?mail\s*(id)?\s*:\s*/i, ""));

  const mapSrc = buildMapEmbedSrc(collegeName, address, college.mapLat, college.mapLng);

  return (
    <div className="flex flex-col">
      <section className="relative h-[min(520px,70vh)] w-full bg-slate-200 dark:bg-emerald-950/40">
        <iframe
          title={t(`Map — ${collegeName}`, `मानचित्र — ${collegeName}`)}
          src={mapSrc}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </section>

      <section className="bg-emerald-50/80 px-4 py-10 dark:bg-[#0a1210]">
        <div className={`mx-auto max-w-6xl ${publicCardClass} p-6 md:p-8`}>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center md:text-left">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 md:mx-0">
                <Building2 className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {t("College", "महाविद्यालय")}
              </h2>
              <p className={`mt-2 text-sm font-semibold text-slate-800 dark:text-emerald-50 ${lang === "hi" ? "font-hindi" : ""}`}>
                {collegeName}
              </p>
            </div>

            <div className="text-center md:text-left">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 md:mx-0">
                <MapPin className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {t("Address", "पता")}
              </h2>
              <p className={`mt-2 text-sm ${publicMutedTextClass} ${lang === "hi" ? "font-hindi" : ""}`}>
                {address ?? t("Address not available.", "पता उपलब्ध नहीं है।")}
              </p>
            </div>

            <div className="text-center md:text-left">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 md:mx-0">
                <Phone className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {t("Contact Info", "संपर्क जानकारी")}
              </h2>
              <div className={`mt-2 space-y-2 text-sm ${publicMutedTextClass}`}>
                {phones.length > 0 ? (
                  phones.map((phone) => (
                    <p key={phone} className="flex items-center justify-center gap-2 md:justify-start">
                      <Phone className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                      <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-emerald-800 hover:underline">
                        {phone}
                      </a>
                    </p>
                  ))
                ) : (
                  <p>{t("Phone not available.", "फोन उपलब्ध नहीं है।")}</p>
                )}
                {emails.map((email) => (
                  <p key={email} className="flex items-center justify-center gap-2 md:justify-start">
                    <Mail className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                    <a href={`mailto:${email}`} className="hover:text-emerald-800 hover:underline">
                      {email}
                    </a>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
