"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FarmersPortalSection } from "@/components/design/shared/home-sections";
import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { StaffPhoto } from "@/components/site/staff-photo";
import type { HomepageCtaItem } from "@/lib/data/homepage";
import type {
  PublicCollegePage,
  PublicCollegeSection,
  PublicOfficePortalData,
  PublicSidebarLink,
} from "@/lib/data/public-types";
import { buildImageAlt, staffPhotoAlt } from "@/lib/a11y/image-alt";
import { publicSectionCardClass, publicSidebarClass } from "@/lib/design/public-page-classes";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";

function SidebarPanel({
  title,
  links,
  activeId,
  onSelectContent,
}: {
  title: string;
  links: PublicSidebarLink[];
  activeId: string | null;
  onSelectContent: (link: PublicSidebarLink) => void;
}) {
  const { lang, t } = useLanguage();
  if (links.length === 0) return null;

  return (
    <aside className={publicSidebarClass}>
      <h2 className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 font-display text-lg font-bold text-emerald-900">
        {title}
      </h2>
      <ul className="divide-y divide-slate-100">
        {links.map((link) => {
          const label = t(link.labelEn, link.labelHi ?? link.labelEn);
          const isActive = activeId === link.id;

          if (link.href) {
            return (
              <li key={link.id}>
                <Link
                  href={link.href}
                  className={`block px-4 py-2.5 text-sm font-medium transition hover:bg-emerald-50 hover:text-emerald-900 ${isActive ? "bg-emerald-50 text-emerald-900" : "text-slate-700"} ${lang === "hi" ? "font-hindi" : ""}`}
                >
                  {label}
                </Link>
              </li>
            );
          }

          return (
            <li key={link.id}>
              <button
                type="button"
                onClick={() => onSelectContent(link)}
                className={`block w-full px-4 py-2.5 text-left text-sm font-medium transition hover:bg-emerald-50 hover:text-emerald-900 ${isActive ? "bg-emerald-50 text-emerald-900" : "text-slate-700"} ${lang === "hi" ? "font-hindi" : ""}`}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function PublicOfficePortal({
  college,
  office,
  section,
  cta,
}: {
  college: PublicCollegePage;
  office: PublicOfficePortalData;
  section?: PublicCollegeSection | null;
  cta?: HomepageCtaItem | null;
}) {
  const { lang, t } = useLanguage();
  const [selectedSidebar, setSelectedSidebar] = useState<PublicSidebarLink | null>(null);

  const title = section
    ? pickBilingual(lang, section.titleEn, section.titleHi)
    : pickBilingual(lang, college.titleEn, college.titleHi);
  const defaultBodyContent = section
    ? pickBilingual(lang, section.contentEn, section.contentHi)
    : pickBilingual(lang, college.contentEn, college.contentHi);

  const sidebarContent = selectedSidebar
    ? pickBilingual(lang, selectedSidebar.contentEn, selectedSidebar.contentHi)
    : null;
  const sidebarPdfUrl = (() => {
    if (!sidebarContent) return null;
    const stripped = sidebarContent.trim().replace(/<[^>]+>/g, "").trim();
    const hrefMatch = sidebarContent.match(/href=["']([^"']+\.pdf)["']/i);
    if (hrefMatch && stripped.length < 200) return hrefMatch[1];
    return null;
  })();
  const bodyContent = sidebarContent || defaultBodyContent;
  const bodyTitle = selectedSidebar
    ? pickBilingual(lang, selectedSidebar.labelEn, selectedSidebar.labelHi)
    : section
      ? title
      : null;

  const heroImage =
    college.featuredImageUrl ??
    "https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80";

  const showHeadOfficer = !section && !selectedSidebar && office.headOfficer;
  const hasLeftSidebar = office.sidebarLeft.length > 0;
  const hasRightSidebar = office.sidebarRight.length > 0;

  return (
    <>
      <section data-site-hero className="relative min-h-[320px] overflow-hidden">
        <Image
          src={heroImage}
          alt={buildImageAlt({ titleEn: `${title} — office`, titleHi: college.titleHi, lang })}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-14 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
            {t("Welcome to The", "में आपका स्वागत है")}
          </p>
          <h1
            className={`mt-2 font-display text-3xl font-bold leading-tight md:text-4xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {hasLeftSidebar && (
            <aside className="w-full shrink-0 lg:w-[260px] xl:w-[280px]">
              <SidebarPanel
                title={t("Quick Links", "त्वरित लिंक")}
                links={office.sidebarLeft}
                activeId={selectedSidebar?.id ?? null}
                onSelectContent={setSelectedSidebar}
              />
            </aside>
          )}

          <div className="min-w-0 flex-1 space-y-8">
            {showHeadOfficer && office.headOfficer && (
              <div className={`overflow-hidden ${publicSectionCardClass}`}>
                <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start sm:gap-8">
                  <StaffPhoto
                    src={office.headOfficer.imageUrl}
                    alt={staffPhotoAlt(
                      {
                        nameEn: office.headOfficer.nameEn,
                        nameHi: office.headOfficer.nameHi,
                        designationEn: office.headOfficer.roleEn,
                        designationHi: office.headOfficer.roleHi,
                      },
                      lang,
                    )}
                    size="xl"
                    rounded="lg"
                    className="mx-auto sm:mx-0"
                  />
                  <div className="text-center sm:text-left">
                    <p
                      className={`font-display text-xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}
                    >
                      {pickBilingual(
                        lang,
                        office.headOfficer.nameEn,
                        office.headOfficer.nameHi,
                      )}
                    </p>
                    {office.headOfficer.roleEn.split("\n").map((line, i) => {
                      if (!line.trim()) return null;
                      return (
                      <p
                        key={`head-officer-role-${i}`}
                        className={`mt-1 text-sm font-semibold text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {lang === "hi" && office.headOfficer?.roleHi
                          ? (office.headOfficer.roleHi.split("\n")[i] ?? line)
                          : line}
                      </p>
                    );
                    })}
                  </div>
                </div>
              </div>
            )}

            {office.contactLines.length > 0 && !selectedSidebar && (
              <div className={`${publicSectionCardClass} p-6`}>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {t("Telephone", "टेलीफोन")}
                </h2>
                <dl className="mt-4 space-y-4">
                  {office.contactLines.map((line) => (
                    <div key={line.labelEn} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <dt
                        className={`text-sm font-bold text-emerald-900 ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {pickBilingual(lang, line.labelEn, line.labelHi)}
                      </dt>
                      <dd
                        className={`mt-1 text-sm text-slate-700 ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {pickBilingual(lang, line.valueEn, line.valueHi)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {office.staff.length > 0 && !selectedSidebar && (
              <div className={`overflow-hidden ${publicSectionCardClass}`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-emerald-50 text-xs font-bold uppercase tracking-wide text-emerald-900">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">{t("Image", "छवि")}</th>
                        <th className="px-4 py-3">{t("Name", "नाम")}</th>
                        <th className="px-4 py-3">{t("Designation", "पदनाम")}</th>
                        <th className="px-4 py-3">{t("Specialization", "विशेषज्ञता")}</th>
                        <th className="px-4 py-3">{t("Details", "विवरण")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {office.staff.map((member, index) => (
                        <tr key={member.nameEn + index} className="text-slate-700">
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3">
                            <StaffPhoto
                              src={member.imageUrl}
                              alt={staffPhotoAlt(member, lang)}
                              size="sm"
                            />
                          </td>
                          <td className={`px-4 py-3 font-medium ${lang === "hi" ? "font-hindi" : ""}`}>
                            {pickBilingual(lang, member.nameEn, member.nameHi)}
                          </td>
                          <td className={`px-4 py-3 ${lang === "hi" ? "font-hindi" : ""}`}>
                            {pickBilingual(lang, member.designationEn, member.designationHi)}
                          </td>
                          <td className={`px-4 py-3 ${lang === "hi" ? "font-hindi" : ""}`}>
                            {pickBilingual(
                              lang,
                              member.specializationEn ?? "—",
                              member.specializationHi,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {member.detailHref ? (
                              <Link
                                href={member.detailHref}
                                className="font-semibold text-emerald-700 hover:underline"
                              >
                                {t("View", "देखें")}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {bodyContent && sidebarPdfUrl && (
              <article className={`${publicSectionCardClass} p-6`}>
                {bodyTitle && (
                  <h2
                    className={`mb-4 font-display text-2xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {bodyTitle}
                  </h2>
                )}
                <iframe
                  src={sidebarPdfUrl}
                  className="h-[80vh] w-full rounded border"
                  title={bodyTitle ?? "PDF"}
                />
              </article>
            )}

            {bodyContent && !sidebarPdfUrl && (
              <article className={`${publicSectionCardClass} overflow-hidden p-0`}>
                {bodyTitle && (
                  <h2
                    className={`border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-3.5 font-display text-xl font-bold text-emerald-900 sm:px-6 sm:text-2xl ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {bodyTitle}
                  </h2>
                )}
                <div className="px-5 py-5 sm:px-6 sm:py-6">
                  <CmsHtmlContent
                    html={bodyContent}
                    className={`prose prose-emerald max-w-none ${lang === "hi" ? "font-hindi" : ""}`}
                  />
                </div>
              </article>
            )}
          </div>

          {hasRightSidebar && (
            <aside className="w-full shrink-0 lg:w-[260px] xl:w-[280px]">
              <SidebarPanel
                title={t("Related Links", "संबंधित लिंक")}
                links={office.sidebarRight}
                activeId={selectedSidebar?.id ?? null}
                onSelectContent={setSelectedSidebar}
              />
            </aside>
          )}
        </div>
      </div>

      {office.officeCtaEnabled && <FarmersPortalSection variant="future" cta={cta} />}
    </>
  );
}
