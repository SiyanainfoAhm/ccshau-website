"use client";

import Image from "next/image";
import { useEffect, useId } from "react";
import { X } from "lucide-react";

import { staffPhotoAlt } from "@/lib/a11y/image-alt";
import { useLanguage } from "@/components/design/shared/language-context";
import { FacultyProfileContent } from "@/components/site/faculty-profile-content";
import type { PublicOfficeStaffMember } from "@/lib/data/public-types";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";

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

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const detailHtml =
    lang === "hi" && member.detailContentHi ? member.detailContentHi : member.detailContentEn;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-6 py-4">
          <h2 id={titleId} className={`font-display text-lg font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}>
            {pickBilingual(lang, member.nameEn, member.nameHi)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/80 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="border-b border-slate-100 bg-white px-6 py-6 md:flex md:items-center md:gap-6">
            {member.imageUrl ? (
              <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-emerald-50 md:mx-0">
                <Image src={member.imageUrl} alt={staffPhotoAlt(member, lang)} fill className="object-cover" sizes="112px" />
              </div>
            ) : null}
            <div className="mt-4 text-center md:mt-0 md:text-left">
              <p className={`text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}>
                {pickBilingual(lang, member.designationEn, member.designationHi)}
              </p>
              {member.specializationEn && (
                <p className={`mt-2 text-sm text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>
                  {pickBilingual(lang, member.specializationEn, member.specializationHi)}
                </p>
              )}
              <dl className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-slate-600 md:justify-start">
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
