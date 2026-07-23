"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";

import { submitPgSeminarRegistrationAction } from "@/actions/public/pg-seminar-registration";
import { useLanguage } from "@/components/design/shared/language-context";
import {
  getRecaptchaToken,
  RecaptchaWidget,
  resetRecaptcha,
} from "@/components/shared/recaptcha-widget";
import type { CaptchaClientConfig } from "@/lib/auth/captcha";
import type { PublicPgStudiesHub } from "@/lib/data/public-types";
import { buildImageAlt } from "@/lib/a11y/image-alt";
import { getPgStudiesHubPath } from "@/lib/pages/routes";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}

function YesNoRadios({ name, legend }: { name: string; legend: string }) {
  return (
    <fieldset>
      <legend className={`${labelClass} mb-2`}>{legend}</legend>
      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name={name} value="yes" className="text-emerald-600" />
          Yes
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name={name} value="no" className="text-emerald-600" />
          No
        </label>
      </div>
    </fieldset>
  );
}

export function PublicPgSeminarRegistrationForm({
  hub,
  captcha,
}: {
  hub: PublicPgStudiesHub;
  captcha: CaptchaClientConfig;
}) {
  const { lang, t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);

  const heroImage =
    hub.featuredImageUrl ??
    "https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80";

  function fieldError(name: string) {
    const messages = fieldErrors[name];
    if (!messages?.length) return null;
    return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    if (captcha.required) {
      const token = getRecaptchaToken();
      if (!token) {
        setError(t("Please complete the CAPTCHA.", "कृपया कैप्चा पूरा करें।"));
        return;
      }
      formData.set("captchaToken", token);
    }
    startTransition(async () => {
      const result = await submitPgSeminarRegistrationAction(formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (captcha.required) resetRecaptcha();
        return;
      }
      setRegistrationNumber(result.data.registrationNumber);
    });
  }

  return (
    <>
      <section className="relative min-h-[220px] overflow-hidden">
        <Image
          src={heroImage}
          alt={buildImageAlt({
            contextEn: "PG Studies seminar registration",
            altHi: "पीजी अध्ययन सेमिनार पंजीकरण",
            lang,
          })}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
        <div className="relative mx-auto max-w-4xl px-4 py-10 text-center text-white md:py-12">
          <Link
            href={getPgStudiesHubPath()}
            className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {t("PG Studies Home", "स्नातकोत्तर अध्ययन होम")}
          </Link>
          <h1 className={`font-display text-3xl font-bold md:text-4xl ${lang === "hi" ? "font-hindi" : ""}`}>
            {t("Registration Form", "पंजीकरण प्रपत्र")}
          </h1>
          <p className={`mt-2 text-sm text-emerald-100 md:text-base ${lang === "hi" ? "font-hindi" : ""}`}>
            {t(
              "Online application form for attending Seminar/Workshop etc. for RA/SRF/JRF/M.Tech./Ph.D students",
              "आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्रों के लिए सेमिनार/कार्यशाला आदि में भाग लेने हेतु ऑनलाइन आवेदन पत्र",
            )}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {registrationNumber ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
            <h2 className="font-display text-2xl font-bold text-emerald-900">
              {t("Registration Submitted", "पंजीकरण जमा हो गया")}
            </h2>
            <p className="mt-3 text-slate-600">
              {t(
                "Your seminar registration has been received successfully.",
                "आपका सेमिनार पंजीकरण सफलतापूर्वक प्राप्त हो गया है।",
              )}
            </p>
            <p className="mt-4 font-mono text-lg font-bold text-[#0b3d2e]">{registrationNumber}</p>
            <p className="mt-2 text-sm text-slate-500">
              {t("Please save this registration number for future reference.", "कृपया भविष्य के संदर्भ हेतु यह पंजीकरण संख्या सहेजें।")}
            </p>
          </div>
        ) : (
          <form
            action={handleSubmit}
            className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="text-center font-display text-xl font-bold uppercase tracking-wide text-slate-800">
              {t("Registration Form", "पंजीकरण प्रपत्र")}
            </h2>
            <p className={`mt-2 text-center text-sm text-slate-600 ${lang === "hi" ? "font-hindi" : ""}`}>
              {t(
                "Online application form for attending Seminar/Workshop etc. for RA/SRF/JRF/M.Tech./Ph.D students",
                "आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्रों के लिए सेमिनार/कार्यशाला आदि में भाग लेने हेतु ऑनलाइन आवेदन पत्र",
              )}
            </p>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="studentName" required>
                  {t("Name", "नाम")}
                </FieldLabel>
                <input
                  id="studentName"
                  name="studentName"
                  required
                  placeholder={t("Student Name", "छात्र का नाम")}
                  className={inputClass}
                />
                {fieldError("studentName")}
              </div>

              <div>
                <FieldLabel htmlFor="admissionNumber" required>
                  {t("Admission Number", "प्रवेश संख्या")}
                </FieldLabel>
                <input
                  id="admissionNumber"
                  name="admissionNumber"
                  required
                  placeholder={t("Admission Number", "प्रवेश संख्या")}
                  className={inputClass}
                />
                {fieldError("admissionNumber")}
              </div>

              <div>
                <FieldLabel htmlFor="department">{t("Department", "विभाग")}</FieldLabel>
                <input
                  id="department"
                  name="department"
                  placeholder={t("Department", "विभाग")}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="studentDegree">
                  {t("Whether RA/SRF/JRF/M.Tech/Ph.D student", "क्या आरए/एसआरएफ/जेआरएफ/एम.टेक/पीएच.डी. छात्र हैं")}
                </FieldLabel>
                <input
                  id="studentDegree"
                  name="studentDegree"
                  placeholder={t("Student Degree", "छात्र की डिग्री")}
                  className={inputClass}
                />
              </div>

              <div>
                <fieldset>
                  <legend className={`${labelClass} mb-2`}>{t("Gender", "लिंग")}</legend>
                  <div className="flex gap-4 text-sm text-slate-700">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="gender" value="male" className="text-emerald-600" />
                      {t("Male", "पुरुष")}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="gender" value="female" className="text-emerald-600" />
                      {t("Female", "महिला")}
                    </label>
                  </div>
                </fieldset>
              </div>

              <div>
                <FieldLabel htmlFor="category">{t("Category", "श्रेणी")}</FieldLabel>
                <select id="category" name="category" className={inputClass} defaultValue="">
                  <option value="">{t("Select Category", "श्रेणी चुनें")}</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="OBC">OBC</option>
                  <option value="PH">PH</option>
                  <option value="GEN">GEN</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <YesNoRadios
                  name="isForeigner"
                  legend={t(
                    "Whether the Candidate is Foreigner Student? If so, name of Country",
                    "क्या उम्मीदवार विदेशी छात्र है? यदि हाँ, तो देश का नाम",
                  )}
                />
                <input
                  name="countryName"
                  placeholder={t("Country Name", "देश का नाम")}
                  className={`${inputClass} mt-3`}
                />
                {fieldError("countryName")}
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="seminarTitle">
                  {t(
                    "Title of Seminars/Conferences/Workshop/Project Meeting/Summer/Winter School",
                    "सेमिनार/सम्मेलन/कार्यशाला/परियोजना बैठक/ग्रीष्म/शीत विद्यालय का शीर्षक",
                  )}
                </FieldLabel>
                <input
                  id="seminarTitle"
                  name="seminarTitle"
                  placeholder={t("Seminar Title", "सेमिनार शीर्षक")}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="durationFrom" required>
                  {t("Duration (From date)", "अवधि (प्रारंभ तिथि)")}
                </FieldLabel>
                <input id="durationFrom" name="durationFrom" type="date" required className={inputClass} />
                {fieldError("durationFrom")}
              </div>

              <div>
                <FieldLabel htmlFor="durationTo" required>
                  {t("Duration (To date)", "अवधि (समाप्ति तिथि)")}
                </FieldLabel>
                <input id="durationTo" name="durationTo" type="date" required className={inputClass} />
                {fieldError("durationTo")}
              </div>

              <div>
                <FieldLabel htmlFor="sourceOfAdvertisement">
                  {t("Source of Advertisement", "विज्ञापन का स्रोत")}
                </FieldLabel>
                <input
                  id="sourceOfAdvertisement"
                  name="sourceOfAdvertisement"
                  placeholder={t("Source of Advertisement", "विज्ञापन का स्रोत")}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="lastSubmissionDate">
                  {t("Last date of Submission", "जमा करने की अंतिम तिथि")}
                </FieldLabel>
                <input id="lastSubmissionDate" name="lastSubmissionDate" type="date" className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="organizingInstituteAddress">
                  {t("Name of organizing Institute/society & address", "आयोजक संस्थान/सोसाइटी का नाम और पता")}
                </FieldLabel>
                <textarea
                  id="organizingInstituteAddress"
                  name="organizingInstituteAddress"
                  rows={3}
                  placeholder={t("Add here", "यहाँ लिखें")}
                  className={inputClass}
                />
              </div>

              <div>
                <fieldset>
                  <legend className={`${labelClass} mb-2`}>
                    {t("Status of the proposed paper", "प्रस्तावित पत्र की स्थिति")}
                  </legend>
                  <div className="space-y-2 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="paperStatus" value="oral" className="text-emerald-600" />
                      {t("Oral Presentation", "मौखिक प्रस्तुति")}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="paperStatus" value="poster" className="text-emerald-600" />
                      {t("Poster Presentation", "पोस्टर प्रस्तुति")}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="paperStatus"
                        value="participation"
                        className="text-emerald-600"
                      />
                      {t("Only Participation", "केवल भागीदारी")}
                    </label>
                  </div>
                </fieldset>
              </div>

              <div>
                <FieldLabel htmlFor="seminarsAttendedLastTwoYears">
                  {t(
                    "Seminars/Conferences/Workshop attended by the student in last two years",
                    "पिछले दो वर्षों में छात्र द्वारा भाग लिए गए सेमिनार/सम्मेलन/कार्यशाला",
                  )}
                </FieldLabel>
                <input
                  id="seminarsAttendedLastTwoYears"
                  name="seminarsAttendedLastTwoYears"
                  placeholder={t("Last Seminar Attended", "अंतिम सेमिनार")}
                  className={inputClass}
                />
              </div>

              <div>
                <YesNoRadios
                  name="isRelevantToSubject"
                  legend={t(
                    "Is the Seminar/Conference/Workshop relevant to the subject",
                    "क्या सेमिनार/सम्मेलन/कार्यशाला विषय से संबंधित है",
                  )}
                />
              </div>

              <div>
                <YesNoRadios
                  name="fundsFromOutsideAgency"
                  legend={t("Whether funds arranged from outside funding Agency?", "क्या बाहरी फंडिंग एजेंसी से धन व्यवस्थित है?")}
                />
              </div>

              <div className="md:col-span-2">
                <p className={`${labelClass} mb-2`}>{t("Financial liability, if any", "वित्तीय देयता, यदि कोई हो")}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="registrationFee">{t("Registration Fee", "पंजीकरण शुल्क")}</FieldLabel>
                    <input id="registrationFee" name="registrationFee" type="number" min="0" step="0.01" className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="travelGrant">{t("Travel Grant", "यात्रा अनुदान")}</FieldLabel>
                    <input id="travelGrant" name="travelGrant" type="number" min="0" step="0.01" className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="totalLiability">{t("Total", "कुल")}</FieldLabel>
                    <input id="totalLiability" name="totalLiability" type="number" min="0" step="0.01" className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <p className={`${labelClass} mb-2`}>
                  {t(
                    "Whether outside funding agency providing 100% funds or making partial payment",
                    "क्या बाहरी फंडिंग एजेंसी 100% धन या आंशिक भुगतान प्रदान कर रही है",
                  )}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="outsideFundingFullPayment">{t("If 100%", "यदि 100%")}</FieldLabel>
                    <input
                      id="outsideFundingFullPayment"
                      name="outsideFundingFullPayment"
                      placeholder={t("Full Payment", "पूर्ण भुगतान")}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="outsideFundingPartialPayment">{t("If partial", "यदि आंशिक")}</FieldLabel>
                    <input
                      id="outsideFundingPartialPayment"
                      name="outsideFundingPartialPayment"
                      placeholder={t("Partial Payment", "आंशिक भुगतान")}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="fundingAgencyName">
                  {t("If yes, name of funding agency", "यदि हाँ, फंडिंग एजेंसी का नाम")}
                </FieldLabel>
                <input
                  id="fundingAgencyName"
                  name="fundingAgencyName"
                  placeholder={t("Funding Agency Name", "फंडिंग एजेंसी का नाम")}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <YesNoRadios
                  name="combinedWithOtherPurpose"
                  legend={t(
                    "Whether proposed visit is combined with any other purpose",
                    "क्या प्रस्तावित यात्रा किसी अन्य उद्देश्य के साथ संयुक्त है",
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="otherRelevantInfo">
                  {t("Other relevant information, if any", "अन्य प्रासंगिक जानकारी, यदि कोई हो")}
                </FieldLabel>
                <textarea
                  id="otherRelevantInfo"
                  name="otherRelevantInfo"
                  rows={4}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col items-end gap-4">
              {captcha.required && captcha.siteKey ? (
                <RecaptchaWidget siteKey={captcha.siteKey} />
              ) : null}
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[#146c43] px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b3d2e] disabled:opacity-60"
              >
                {isPending ? t("Submitting...", "जमा हो रहा है...") : t("Submit", "जमा करें")}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
