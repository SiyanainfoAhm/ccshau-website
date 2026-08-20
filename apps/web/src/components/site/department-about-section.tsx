"use client";

import { useState } from "react";
import { Mail, Phone } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { FacultyProfileDialog } from "@/components/site/faculty-profile-dialog";
import { staffPhotoAlt } from "@/lib/a11y/image-alt";
import { StaffPhoto } from "@/components/site/staff-photo";
import type { PublicOfficeContactLine, PublicOfficeStaffMember } from "@/lib/data/public-types";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import { officerContactLines } from "@/lib/pages/college-contact-display";

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

export function DepartmentAboutSection({
  sectionTitle,
  member,
  contactLines = [],
  aboutHtml,
  detailHref,
}: {
  sectionTitle: string;
  member?: PublicOfficeStaffMember | null;
  contactLines?: PublicOfficeContactLine[];
  aboutHtml?: string | null;
  detailHref?: string | null;
}) {
  const { lang, t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);

  const officerLines = officerContactLines(contactLines);

  const addressLine = findContactLine(officerLines, "mailing", "address");
  const officeLine = findContactLine(officerLines, "office", "phone", "telephone");
  const faxLine = findContactLine(officerLines, "fax");
  const emailLine = findContactLine(officerLines, "email", "e-mail");

  const mailingAddress = addressLine
    ? pickBilingual(lang, addressLine.valueEn, addressLine.valueHi)
    : null;

  const officeRaw = officeLine ? pickBilingual(lang, officeLine.valueEn, officeLine.valueHi) : "";
  const officePhones = splitContactValues(officeRaw.replace(/^office\s*:\s*/i, ""));
  const faxRaw = faxLine ? pickBilingual(lang, faxLine.valueEn, faxLine.valueHi) : "";
  const faxNumbers = splitContactValues(faxRaw.replace(/^fax\s*(no)?\s*:\s*/i, ""));

  const emailRaw = emailLine ? pickBilingual(lang, emailLine.valueEn, emailLine.valueHi) : "";
  const contactEmails = splitContactValues(emailRaw.replace(/^e-?mail\s*(id)?\s*:\s*/i, ""));

  const phones = member?.mobile
    ? [member.mobile, ...officePhones.filter((p) => p !== member.mobile)]
    : officePhones;

  const emails = member?.email
    ? [member.email, ...contactEmails.filter((e) => e !== member.email)]
    : contactEmails;

  const profileLink = detailHref ?? member?.detailHref ?? null;
  const canOpenProfile = Boolean(
    member &&
      (profileLink ||
        member.detailContentEn ||
        member.detailContentHi ||
        member.experienceEn ||
        member.qualificationEn),
  );

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-emerald-100 bg-[#eef5e8] shadow-sm">
      <div className="border-b-2 border-[#6b9b37] bg-[#eef5e8] px-6 py-5">
        <h2
          className={`font-display text-2xl font-semibold text-[#1f4d2e] md:text-[1.65rem] ${lang === "hi" ? "font-hindi" : ""}`}
        >
          {sectionTitle}
        </h2>
      </div>

      <div className="px-6 py-6">
        {member ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <StaffPhoto
              src={member.imageUrl}
              alt={staffPhotoAlt(member, lang)}
              size="xl"
              rounded="lg"
              className="mx-auto sm:mx-0"
            />

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p
                className={`text-xl font-bold leading-snug text-slate-800 md:text-[1.35rem] ${lang === "hi" ? "font-hindi" : ""}`}
              >
                {pickBilingual(lang, member.nameEn, member.nameHi)}
              </p>
              <p
                className={`mt-1 text-sm font-medium text-slate-500 ${lang === "hi" ? "font-hindi" : ""}`}
              >
                {pickBilingual(lang, member.designationEn, member.designationHi)}
              </p>

              {mailingAddress && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-blue-600">
                    {t("Mailing Address", "डाक पता")}
                  </p>
                  <p className={`mt-1 text-sm leading-relaxed text-slate-700 ${lang === "hi" ? "font-hindi" : ""}`}>
                    {mailingAddress}
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {phones.length > 0 && (
                  <p className="flex items-start justify-center gap-2 sm:justify-start">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span>
                      <span className="font-medium">{t("Office", "कार्यालय")} : </span>
                      {phones.map((phone, index) => (
                        <span key={phone}>
                          {index > 0 ? ", " : null}
                          <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-emerald-800 hover:underline">
                            {phone}
                          </a>
                        </span>
                      ))}
                    </span>
                  </p>
                )}
                {faxNumbers.length > 0 && (
                  <p className="flex items-start justify-center gap-2 sm:justify-start">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span>
                      <span className="font-medium">{t("Fax No", "फैक्स नंबर")} : </span>
                      {faxNumbers.map((fax, index) => (
                        <span key={fax}>
                          {index > 0 ? ", " : null}
                          {fax}
                        </span>
                      ))}
                    </span>
                  </p>
                )}
                {emails.length > 0 && (
                  <p className="flex items-start justify-center gap-2 sm:justify-start">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span>
                      <span className="font-medium">{t("Email Id", "ईमेल आईडी")} : </span>
                      {emails.map((email, index) => (
                        <span key={email}>
                          {index > 0 ? ", " : null}
                          <a href={`mailto:${email}`} className="hover:text-emerald-800 hover:underline">
                            {email}
                          </a>
                        </span>
                      ))}
                    </span>
                  </p>
                )}
              </div>

              {canOpenProfile && member && (
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="mt-4 inline-flex text-sm font-semibold text-emerald-800 hover:underline"
                >
                  {t("View full profile", "पूर्ण प्रोफ़ाइल देखें")} →
                </button>
              )}
            </div>
          </div>
        ) : null}

        {aboutHtml ? (
          <CmsHtmlContent
            html={aboutHtml}
            className={`${member ? "mt-8 border-t border-emerald-200/80 pt-6" : ""} prose prose-sm max-w-none text-justify leading-relaxed text-slate-800 prose-p:font-serif prose-headings:font-display ${lang === "hi" ? "font-hindi" : ""}`}
          />
        ) : null}
      </div>
      </section>

      {member && (
        <FacultyProfileDialog member={member} open={profileOpen} onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
}
