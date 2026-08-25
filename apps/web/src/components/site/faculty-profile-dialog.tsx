"use client";

import { useId, useRef } from "react";
import { X } from "lucide-react";

import { staffPhotoAlt } from "@/lib/a11y/image-alt";
import { useModalA11y } from "@/lib/a11y/use-modal-a11y";
import { useLanguage } from "@/components/design/shared/language-context";
import { FacultyProfileContent } from "@/components/site/faculty-profile-content";
import { FacultyProfilePrintButton } from "@/components/site/faculty-profile-print-button";
import { StaffPhoto } from "@/components/site/staff-photo";
import type { PublicOfficeStaffMember } from "@/lib/data/public-types";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import { typeSubsectionTitleClass } from "@/lib/design/public-page-classes";

export function FacultyProfileDialog({
  member,
  open,
  onClose,
}: {
  member: PublicOfficeStaffMember;
  open: boolean;
  onClose: () => void;
}) {
  const { lang, t } = useLanguage();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useModalA11y({ open, onClose, panelRef });

  if (!open) return null;

  const detailHtml =
    lang === "hi" && member.detailContentHi ? member.detailContentHi : member.detailContentEn;

  return (
    <div className="faculty-profile-dialog-root fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="faculty-profile-no-print absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="faculty-profile-print-root relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl outline-none"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-6 py-4">
          <h2 id={titleId} className={`${typeSubsectionTitleClass} ${lang === "hi" ? "font-hindi" : ""}`}>
            {pickBilingual(lang, member.nameEn, member.nameHi)}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <FacultyProfilePrintButton />
            <button
              type="button"
              onClick={onClose}
              className="faculty-profile-no-print rounded-lg p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="faculty-profile-print-body overflow-y-auto">
          <div className="border-b border-slate-100 bg-white px-6 py-6 md:flex md:items-center md:gap-6">
            <StaffPhoto
              src={member.imageUrl}
              alt={staffPhotoAlt(member, lang)}
              size="md"
              className="mx-auto border-4 border-emerald-50 md:mx-0"
            />
            <div className="mt-4 text-center md:mt-0 md:text-left">
              <p className={`text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}>
                {pickBilingual(lang, member.designationEn, member.designationHi)}
              </p>
              {member.specializationEn && (
                <p className={`mt-2 text-sm text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>
                  {pickBilingual(lang, member.specializationEn, member.specializationHi)}
                </p>
              )}
              {member.alsoAt && member.alsoAt.length > 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  {t("Also affiliated with", "संबद्ध")}:{" "}
                  {member.alsoAt.map((item, index) => (
                    <span key={`${item.titleEn}-${index}`}>
                      {index > 0 ? ", " : null}
                      {item.href ? (
                        <a href={item.href} className="text-emerald-800 hover:underline">
                          {item.titleEn}
                        </a>
                      ) : (
                        item.titleEn
                      )}
                    </span>
                  ))}
                </p>
              ) : null}
              <dl className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-slate-600 md:justify-start">
                {member.qualificationEn && (
                  <div>
                    {t("Qualification", "योग्यता")}:{" "}
                    {pickBilingual(lang, member.qualificationEn, member.qualificationHi)}
                  </div>
                )}
                {member.experienceEn && (
                  <div>
                    {t("Experience", "अनुभव")}: {pickBilingual(lang, member.experienceEn, member.experienceHi)}
                  </div>
                )}
                {member.mobile && <div>{t("Mobile", "मोबाइल")}: {member.mobile}</div>}
                {member.email && (
                  <div>
                    <a href={`mailto:${member.email}`} className="text-emerald-700 hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {detailHtml ? (
            <FacultyProfileContent html={detailHtml} className={`px-6 py-6 ${lang === "hi" ? "font-hindi" : ""}`} />
          ) : (
            <p className="px-6 py-8 text-sm text-slate-500">
              {t("Full profile content is not available yet.", "पूर्ण प्रोफ़ाइल सामग्री अभी उपलब्ध नहीं है।")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
