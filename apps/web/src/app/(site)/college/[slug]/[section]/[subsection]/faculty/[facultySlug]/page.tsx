import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { FacultyProfileContent } from "@/components/site/faculty-profile-content";
import { FacultyProfilePrintButton } from "@/components/site/faculty-profile-print-button";
import { StaffPhoto } from "@/components/site/staff-photo";
import { staffPhotoAlt } from "@/lib/a11y/image-alt";
import { getPublishedFacultyProfile } from "@/lib/data/public";
import { publicMainClass } from "@/lib/design/public-page-classes";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; section: string; subsection: string; facultySlug: string }>;
}) {
  const { slug, section, subsection, facultySlug } = await params;
  const data = await getPublishedFacultyProfile(slug, section, subsection, facultySlug);
  if (!data) return { title: "Faculty not found" };
  return {
    title: `${data.staff.nameEn} — ${data.department.titleEn}`,
  };
}

export default async function FacultyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; section: string; subsection: string; facultySlug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, section, subsection, facultySlug } = await params;
  const { lang: langParam } = await searchParams;
  const lang = langParam === "hi" ? "hi" : "en";

  const data = await getPublishedFacultyProfile(slug, section, subsection, facultySlug);
  if (!data) notFound();

  const { staff, department, college, section: sectionData } = data;
  const detailHtml =
    lang === "hi" && staff.detailContentHi ? staff.detailContentHi : staff.detailContentEn;

  return (
    <>
      <SiteHeader variant="future" homeHref={`/college/${slug}`} college={college} />
      <main id="main-content" className={publicMainClass}>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <nav className="mb-6 text-sm text-emerald-800">
            <Link href={`/college/${slug}`} className="hover:underline">
              {college.titleEn}
            </Link>
            <span className="mx-2 text-slate-400">/</span>
            <Link href={`/college/${slug}/${section}`} className="hover:underline">
              {sectionData.titleEn}
            </Link>
            <span className="mx-2 text-slate-400">/</span>
            <Link href={`/college/${slug}/${section}/${subsection}`} className="hover:underline">
              {department.titleEn}
            </Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-600">{staff.nameEn}</span>
          </nav>

          <article className="faculty-profile-print-root overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="faculty-profile-print-body border-b border-slate-100 bg-emerald-50 px-6 py-8">
              <div className="mb-4 flex justify-end faculty-profile-no-print">
                <FacultyProfilePrintButton />
              </div>
              <div className="md:flex md:items-center md:gap-6">
                <StaffPhoto
                  src={staff.imageUrl}
                  alt={staffPhotoAlt(staff, lang)}
                  size="md"
                  className="mx-auto border-4 border-white shadow md:mx-0"
                />
                <div className="mt-4 text-center md:mt-0 md:text-left">
                  <h1 className={`font-display text-2xl font-bold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}>
                    {pickBilingual(lang, staff.nameEn, staff.nameHi)}
                  </h1>
                  <p className={`mt-1 text-emerald-800 ${lang === "hi" ? "font-hindi" : ""}`}>
                    {pickBilingual(lang, staff.designationEn, staff.designationHi)}
                  </p>
                  {staff.specializationEn && (
                    <p className={`mt-2 text-sm text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>
                      {pickBilingual(lang, staff.specializationEn, staff.specializationHi)}
                    </p>
                  )}
                  {staff.alsoAt && staff.alsoAt.length > 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Also affiliated with:{" "}
                      {staff.alsoAt.map((item, index) => (
                        <span key={`${item.titleEn}-${index}`}>
                          {index > 0 ? ", " : null}
                          {item.href ? (
                            <Link href={item.href} className="text-emerald-800 hover:underline">
                              {item.titleEn}
                            </Link>
                          ) : (
                            item.titleEn
                          )}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <dl className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-slate-600 md:justify-start">
                    {staff.qualificationEn && (
                      <div>
                        <dt className="sr-only">Qualification</dt>
                        <dd>
                          Qualification: {pickBilingual(lang, staff.qualificationEn, staff.qualificationHi)}
                        </dd>
                      </div>
                    )}
                    {staff.experienceEn && (
                      <div>
                        <dt className="sr-only">Experience</dt>
                        <dd>Experience: {pickBilingual(lang, staff.experienceEn, staff.experienceHi)}</dd>
                      </div>
                    )}
                    {staff.mobile && (
                      <div>
                        <dt className="sr-only">Mobile</dt>
                        <dd>Mobile: {staff.mobile}</dd>
                      </div>
                    )}
                    {staff.email && (
                      <div>
                        <dt className="sr-only">Email</dt>
                        <dd>
                          <a href={`mailto:${staff.email}`} className="text-emerald-700 hover:underline">
                            {staff.email}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>

            {detailHtml ? (
              <FacultyProfileContent
                html={detailHtml}
                className={`px-6 py-8 ${lang === "hi" ? "font-hindi" : ""}`}
              />
            ) : (
              <p className="px-6 py-8 text-sm text-slate-500">Full profile content is not available yet.</p>
            )}
          </article>
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
