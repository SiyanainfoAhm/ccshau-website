"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FarmersPortalSection } from "@/components/design/shared/home-sections";
import { useLanguage } from "@/components/design/shared/language-context";
import { DepartmentAboutSection } from "@/components/site/department-about-section";
import type { PublicCmsPageData } from "@/components/site/public-cms-page-content";
import type { PublicOfficePortalData, PublicOfficeStaffMember } from "@/lib/data/public-types";
import { buildImageAlt } from "@/lib/a11y/image-alt";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import { getPgStudiesSectionPath } from "@/lib/pages/routes";

function headOfficerAsMember(
  office: PublicOfficePortalData,
): PublicOfficeStaffMember | null {
  if (!office.headOfficer) return null;

  const roleLine = office.headOfficer.roleEn.split("\n").find(Boolean) ?? "Dean";

  return {
    nameEn: office.headOfficer.nameEn,
    nameHi: office.headOfficer.nameHi,
    designationEn: roleLine,
    designationHi: office.headOfficer.roleHi?.split("\n").find(Boolean) ?? null,
    specializationEn: null,
    specializationHi: null,
    imageUrl: office.headOfficer.imageUrl,
    detailHref: null,
    memberType: "hod",
    mobile: null,
    email: null,
    experienceEn: null,
    experienceHi: null,
    qualificationEn: null,
    qualificationHi: null,
    detailContentEn: null,
    detailContentHi: null,
  };
}

export function PublicCmsOfficePageContent({
  page,
  office,
  heroContactHref,
  showHeroContactButton = false,
}: {
  page: PublicCmsPageData & { featuredImageUrl?: string | null };
  office: PublicOfficePortalData;
  heroContactHref?: string;
  showHeroContactButton?: boolean;
}) {
  const { lang, t } = useLanguage();

  const title = pickBilingual(lang, page.titleEn, page.titleHi);
  const aboutHtml = pickBilingual(lang, page.contentEn, page.contentHi);
  const member = headOfficerAsMember(office);

  const heroImage =
    page.featuredImageUrl ??
    "https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80";

  return (
    <>
      <section className="relative min-h-[320px] overflow-hidden">
        <Image
          src={heroImage}
          alt={buildImageAlt({ titleEn: `${title} — ${page.titleEn}`, titleHi: page.titleHi, lang })}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center text-white md:py-16">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {t("Home", "होम")}
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
            {t("Welcome to The", "में आपका स्वागत है")}
          </p>
          <h1
            className={`mt-2 font-display text-3xl font-bold leading-tight md:text-4xl ${lang === "hi" ? "font-hindi" : ""}`}
          >
            {title}
          </h1>
          {showHeroContactButton && (
            <Link
              href={heroContactHref ?? getPgStudiesSectionPath("contact")}
              className="mt-6 inline-flex rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500"
            >
              {t("Contact Us", "संपर्क करें")}
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <DepartmentAboutSection
          sectionTitle={t("About PG Studies", "स्नातकोत्तर अध्ययन के बारे में")}
          member={member}
          contactLines={office.contactLines}
          aboutHtml={aboutHtml}
        />
      </div>

      {office.officeCtaEnabled && <FarmersPortalSection />}
    </>
  );
}
