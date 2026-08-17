"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { FarmersPortalSection, NewsTicker } from "@/components/design/shared/home-sections";
import { useLanguage } from "@/components/design/shared/language-context";
import { CmsHtmlContent } from "@/components/site/cms-html-content";
import { DepartmentAboutSection } from "@/components/site/department-about-section";
import { FacultyProfileDialog } from "@/components/site/faculty-profile-dialog";
import { buildImageAlt, staffPhotoAlt } from "@/lib/a11y/image-alt";
import { formatMenuLabel } from "@/lib/i18n/menu-label";
import {
  extractPdfCaptionFromHtml,
  extractPdfUrlFromHtml,
  isPrimarilyPdfHtml,
} from "@/lib/html/extract-pdf-url";
import { StaffPhoto } from "@/components/site/staff-photo";
import { PublicCollegeGallery } from "@/components/site/public-college-gallery";
import { PublicPdfViewer } from "@/components/site/public-pdf-viewer";
import { PublicStudentCornerSection } from "@/components/site/public-student-corner-section";
import { RegionalResearchStationsGrid } from "@/components/site/regional-research-stations-grid";
import type { HomepageCtaItem } from "@/lib/data/homepage";
import type {
  PublicCollegePage,
  PublicCollegeSection,
  PublicCollegeSubsection,
  PublicOfficePortalData,
  PublicGalleryImage,
  PublicNewsTickerItem,
  PublicStudentCornerItem,
  PublicOfficeStaffMember,
  PublicResearchStationCard,
  PublicSidebarLink,
} from "@/lib/data/public-types";
import { publicEmptyStateClass, publicSectionCardClass, publicSidebarClass } from "@/lib/design/public-page-classes";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { PageLayoutConfig } from "@/lib/pages/layout-config";
import { getCollegeContactPath } from "@/lib/pages/routes";

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
          const label = formatMenuLabel(
            t(link.labelEn, link.labelHi ?? link.labelEn),
            lang,
            "title",
          );
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


function hasStaffDetails(member: {
  detailHref?: string | null;
  detailContentEn?: string | null;
  detailContentHi?: string | null;
  qualificationEn?: string | null;
  experienceEn?: string | null;
  mobile?: string | null;
  email?: string | null;
}) {
  return Boolean(
    member.detailHref?.trim() ||
      member.detailContentEn?.trim() ||
      member.detailContentHi?.trim() ||
      member.qualificationEn?.trim() ||
      member.experienceEn?.trim() ||
      member.mobile?.trim() ||
      member.email?.trim(),
  );
}

function StaffDirectoryTable({
  staff,
  title,
}: {
  staff: PublicOfficeStaffMember[];
  title?: string | null;
}) {
  const { lang, t } = useLanguage();
  const [selectedMember, setSelectedMember] = useState<PublicOfficeStaffMember | null>(null);

  return (
    <>
      <div className={`overflow-hidden ${publicSectionCardClass}`}>
      {title && (
        <h2
          className={`border-b border-slate-100 px-6 py-4 font-display text-2xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}
        >
          {title}
        </h2>
      )}
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
            {staff.map((member, index) => (
              <tr key={`${member.nameEn}-${index}`} className="text-slate-700">
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
                  {member.memberType === "hod" && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      HOD
                    </span>
                  )}
                </td>
                <td className={`px-4 py-3 ${lang === "hi" ? "font-hindi" : ""}`}>
                  {pickBilingual(lang, member.designationEn, member.designationHi)}
                </td>
                <td className={`px-4 py-3 ${lang === "hi" ? "font-hindi" : ""}`}>
                  {pickBilingual(lang, member.specializationEn ?? "—", member.specializationHi)}
                </td>
                <td className="px-4 py-3">
                  {hasStaffDetails(member) ? (
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {t("Details", "विवरण")}
                    </button>
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

      {selectedMember && (
        <FacultyProfileDialog
          member={selectedMember}
          open={Boolean(selectedMember)}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}


export function PublicConfigurablePage({
  college,
  layoutConfig,
  office,
  section,
  subsection,
  galleryImages,
  newsTickerItems,
  studentCornerItems,
  researchStations,
  cta,
}: {
  college: PublicCollegePage;
  layoutConfig: PageLayoutConfig;
  office?: PublicOfficePortalData | null;
  section?: PublicCollegeSection | null;
  subsection?: PublicCollegeSubsection | null;
  galleryImages?: PublicGalleryImage[];
  newsTickerItems?: PublicNewsTickerItem[];
  studentCornerItems?: PublicStudentCornerItem[];
  researchStations?: PublicResearchStationCard[];
  cta?: HomepageCtaItem | null;
}) {
  const { lang, t } = useLanguage();
  const [selectedSidebar, setSelectedSidebar] = useState<PublicSidebarLink | null>(null);

  const contentPage = subsection ?? section ?? null;
  const title = formatMenuLabel(
    contentPage
      ? pickBilingual(lang, contentPage.titleEn, contentPage.titleHi)
      : pickBilingual(lang, college.titleEn, college.titleHi),
    lang,
    "title",
  );
  const excerpt = contentPage
    ? pickBilingual(lang, contentPage.excerptEn, contentPage.excerptHi)
    : pickBilingual(lang, college.excerptEn, college.excerptHi);
  const defaultBodyContent = contentPage
    ? pickBilingual(lang, contentPage.contentEn, contentPage.contentHi)
    : pickBilingual(lang, college.contentEn, college.contentHi);

  const sidebarContent = selectedSidebar
    ? pickBilingual(lang, selectedSidebar.contentEn, selectedSidebar.contentHi)
    : null;
  const sidebarHasContent = Boolean(sidebarContent?.trim());
  const sidebarPdfUrl =
    sidebarContent && isPrimarilyPdfHtml(sidebarContent)
      ? extractPdfUrlFromHtml(sidebarContent)
      : null;
  const sidebarPdfCaption = sidebarPdfUrl
    ? extractPdfCaptionFromHtml(sidebarContent)
    : null;
  const isFacultySidebar =
    Boolean(selectedSidebar) &&
    !sidebarHasContent &&
    (selectedSidebar!.labelEn.toLowerCase().includes("faculty") ||
      Boolean(selectedSidebar!.labelHi?.includes("संकाय")));
  const isAboutSidebar =
    Boolean(selectedSidebar) &&
    !sidebarHasContent &&
    (selectedSidebar!.labelEn.toLowerCase().includes("about") ||
      Boolean(selectedSidebar!.labelHi?.includes("परिचय")));
  const isHodSidebar =
    Boolean(selectedSidebar) &&
    !sidebarHasContent &&
    (selectedSidebar!.labelEn.toLowerCase().includes("head of department") ||
      Boolean(selectedSidebar!.labelHi?.includes("विभागाध्यक्ष")));

  const hodMember = office?.staff.find((member) => member.memberType === "hod") ?? null;
  const isDepartmentLanding = Boolean(subsection) && !selectedSidebar;
  const aboutTitle = contentPage
    ? `${t("About", "के बारे में")} ${title}`
    : title;
  const bodyContent =
    isFacultySidebar || isHodSidebar || isAboutSidebar
      ? null
      : selectedSidebar
        ? sidebarContent
        : defaultBodyContent;
  const bodyTitle = selectedSidebar
    ? pickBilingual(lang, selectedSidebar.labelEn, selectedSidebar.labelHi)
    : contentPage
      ? title
      : null;

  const heroImage =
    contentPage?.featuredImageUrl ??
    college.featuredImageUrl ??
    "https://hau.ac.in/public/images/intro.jpg";
  const heroLogo = contentPage?.logoImageUrl ?? college.logoImageUrl;

  const isRootPage = !contentPage;
  const showHeadOfficer =
    layoutConfig.headOfficer && isRootPage && !selectedSidebar && office?.headOfficer;
  const hasContactLines = (office?.contactLines.length ?? 0) > 0;
  const showContacts =
    layoutConfig.contacts && !selectedSidebar && hasContactLines && !showHeadOfficer;
  const showHeadOfficerContacts =
    showHeadOfficer && layoutConfig.contacts && hasContactLines;
  const showStaffTable =
    isFacultySidebar && (office?.staff.length ?? 0) > 0;
  const showResearchStationsGrid =
    (researchStations?.length ?? 0) > 0 && !selectedSidebar;
  const showDepartmentAbout =
    !showResearchStationsGrid &&
    (isDepartmentLanding || isAboutSidebar) &&
    Boolean(hodMember || defaultBodyContent);
  const showHodSidebarProfile = isHodSidebar;
  const showMainContent =
    !showResearchStationsGrid &&
    layoutConfig.mainContent &&
    Boolean(bodyContent) &&
    !showDepartmentAbout;
  const showLeftSidebar =
    layoutConfig.leftSidebar && (office?.sidebarLeft.length ?? 0) > 0;
  const showRightSidebar =
    layoutConfig.rightSidebar && (office?.sidebarRight.length ?? 0) > 0;
  const showFarmersCta =
    layoutConfig.farmersCta && (office?.officeCtaEnabled ?? false);
  const showGallery = layoutConfig.gallery && (galleryImages?.length ?? 0) > 0 && !selectedSidebar;
  const showNewsTicker =
    layoutConfig.newsTicker && (newsTickerItems?.length ?? 0) > 0 && !selectedSidebar;
  const showStudentCorner =
    layoutConfig.studentCorner && (studentCornerItems?.length ?? 0) > 0 && !selectedSidebar;

  const heroMinHeight = layoutConfig.heroContactButton || heroLogo ? "min-h-[420px]" : "min-h-[320px]";

  return (
    <>
      {showNewsTicker && newsTickerItems && (
        <NewsTicker
          variant="future"
          headlines={newsTickerItems.map((item) => ({
            titleEn: item.titleEn,
            titleHi: item.titleHi ?? item.titleEn,
            href: item.href,
            isNew: item.isNew,
          }))}
        />
      )}

      {layoutConfig.hero && (
        <section data-site-hero className={`relative ${heroMinHeight} overflow-hidden`}>
          <Image
            src={heroImage}
            alt={buildImageAlt({ titleEn: `${title} — campus`, titleHi: college.titleHi, lang })}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-14 text-center text-white md:py-16">
            {heroLogo && (
              <div className="mb-4 overflow-hidden rounded-xl bg-white p-2 shadow-xl dark:bg-emerald-950/40">
                <Image
                  src={heroLogo}
                  alt={buildImageAlt({ titleEn: `${title} logo`, titleHi: college.titleHi ? `${college.titleHi} लोगो` : null, lang })}
                  width={96}
                  height={96}
                  className="h-20 w-20 object-contain"
                />
              </div>
            )}
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
              {t("Welcome to The", "में आपका स्वागत है")}
            </p>
            <h1
              className={`mt-2 font-display text-3xl font-bold leading-tight md:text-4xl ${lang === "hi" ? "font-hindi" : ""}`}
            >
              {title}
            </h1>
            {excerpt && (
              <p
                className={`mt-4 max-w-2xl text-lg text-emerald-100 ${lang === "hi" ? "font-hindi" : ""}`}
              >
                {excerpt}
              </p>
            )}
            {layoutConfig.heroContactButton && (
              <Link
                href={getCollegeContactPath(college.collegeSlug)}
                className="mt-8 inline-flex rounded-full bg-[#6b9b37] px-8 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#5a8530]"
              >
                {t("Contact Us", "संपर्क करें")}
              </Link>
            )}
          </div>
        </section>
      )}

      {!layoutConfig.hero && contentPage && (
        <div className="border-b border-slate-200 bg-white dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <h1
              className={`font-display text-3xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}
            >
              {title}
            </h1>
            {excerpt && (
              <p className={`mt-2 text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>{excerpt}</p>
            )}
          </div>
        </div>
      )}

      {showStudentCorner && studentCornerItems && (
        <PublicStudentCornerSection items={studentCornerItems} />
      )}

      <div
        className={`mx-auto max-w-7xl px-4 py-10 ${layoutConfig.hero ? "" : contentPage ? "" : "pt-6"}`}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {showLeftSidebar && office && (
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
            {showResearchStationsGrid && researchStations && (
              <RegionalResearchStationsGrid stations={researchStations} />
            )}

            {showHeadOfficer && office?.headOfficer && (
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
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p
                      className={`font-display text-xl font-bold text-red-900 ${lang === "hi" ? "font-hindi" : ""}`}
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
                        className={`mt-1 text-sm font-semibold text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {lang === "hi" && office.headOfficer?.roleHi
                          ? (office.headOfficer.roleHi.split("\n")[i] ?? line)
                          : line}
                      </p>
                    );
                    })}
                    {showHeadOfficerContacts && (
                      <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-left">
                        {office.contactLines.map((line) => (
                          <div key={line.labelEn}>
                            <dt
                              className={`text-sm font-bold text-blue-800 ${lang === "hi" ? "font-hindi" : ""}`}
                            >
                              {pickBilingual(lang, line.labelEn, line.labelHi)}
                            </dt>
                            <dd
                              className={`mt-0.5 text-sm text-slate-700 ${lang === "hi" ? "font-hindi" : ""}`}
                            >
                              {pickBilingual(lang, line.valueEn, line.valueHi)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showContacts && office && (
              <div className={`${publicSectionCardClass} p-6`}>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {t("Telephone", "टेलीफोन")}
                </h2>
                <dl className="mt-4 space-y-4">
                  {office.contactLines.map((line) => (
                    <div
                      key={line.labelEn}
                      className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
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

            {showDepartmentAbout && office && (
              <DepartmentAboutSection
                sectionTitle={aboutTitle}
                member={hodMember}
                contactLines={office.contactLines}
                aboutHtml={defaultBodyContent}
              />
            )}

            {showHodSidebarProfile && office && (
              hodMember ? (
                <DepartmentAboutSection
                  sectionTitle={bodyTitle ?? t("Head of Department", "विभागाध्यक्ष")}
                  member={hodMember}
                  contactLines={office.contactLines}
                  aboutHtml={defaultBodyContent}
                />
              ) : (
                <p className={`${publicEmptyStateClass} p-6 shadow-sm`}>
                  {t("Head of Department has not been assigned yet.", "विभागाध्यक्ष अभी नियुक्त नहीं किया गया है।")}
                </p>
              )
            )}

            {showStaffTable && office && (
              <StaffDirectoryTable staff={office.staff} title={isFacultySidebar ? bodyTitle : null} />
            )}

            {showGallery && galleryImages && (
              <PublicCollegeGallery images={galleryImages} />
            )}

            {showMainContent && sidebarPdfUrl && (
              <article className={`${publicSectionCardClass} overflow-hidden p-0`}>
                {bodyTitle && (
                  <h2
                    className={`border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-3.5 font-display text-xl font-bold text-emerald-900 sm:px-6 sm:text-2xl ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {bodyTitle}
                  </h2>
                )}
                <PublicPdfViewer
                  src={sidebarPdfUrl}
                  title={bodyTitle}
                  caption={sidebarPdfCaption}
                />
              </article>
            )}

            {showMainContent && !sidebarPdfUrl && (
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
                    html={bodyContent!}
                    className={`prose prose-emerald max-w-none ${lang === "hi" ? "font-hindi" : ""}`}
                  />
                </div>
              </article>
            )}

            {!showMainContent && !showHeadOfficer && !showContacts && !showStaffTable && !showDepartmentAbout && !showHodSidebarProfile && !showGallery && !showStudentCorner && !showResearchStationsGrid && !selectedSidebar && (
              <p className="text-center text-slate-500">{t("Content coming soon.", "सामग्री जल्द आ रही है।")}</p>
            )}
          </div>

          {showRightSidebar && office && (
            <aside className="w-full shrink-0 lg:w-[260px] xl:w-[280px]">
              <SidebarPanel
                title={
                  showLeftSidebar
                    ? t("Related Links", "संबंधित लिंक")
                    : t("Quick Links", "त्वरित लिंक")
                }
                links={office.sidebarRight}
                activeId={selectedSidebar?.id ?? null}
                onSelectContent={setSelectedSidebar}
              />
            </aside>
          )}
        </div>
      </div>

      {showFarmersCta && <FarmersPortalSection variant="future" cta={cta} />}
    </>
  );
}
