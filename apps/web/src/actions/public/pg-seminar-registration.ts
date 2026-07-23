"use server";

import { headers } from "next/headers";

import { verifyCaptcha } from "@/lib/auth/captcha";
import { Tables } from "@/lib/database/names";
import {
  checkRateLimit,
  clientIpFromHeaders,
  PUBLIC_SEMINAR_RATE,
} from "@/lib/security/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import {
  parseYesNo,
  pgSeminarRegistrationSchema,
  yesNoToBoolean,
} from "@/lib/validations/pg-seminar-registration";
import { createAdminClient } from "@/lib/supabase/admin";

async function generateRegistrationNumber(): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PGS-${today}-`;

  const { count } = await admin
    .from(Tables.pgSeminarRegistrations)
    .select("id", { count: "exact", head: true })
    .like("registration_number", `${prefix}%`);

  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

export async function submitPgSeminarRegistrationAction(
  formData: FormData,
): Promise<ActionResult<{ registrationNumber: string }>> {
  const headerStore = await headers();
  const ipAddress = clientIpFromHeaders(headerStore);
  const rate = checkRateLimit(
    `seminar:ip:${ipAddress}`,
    PUBLIC_SEMINAR_RATE.limit,
    PUBLIC_SEMINAR_RATE.windowMs,
  );
  if (!rate.ok) {
    return fail(`Too many submissions. Please try again in ${rate.retryAfterSec} seconds.`);
  }

  const parsed = pgSeminarRegistrationSchema.safeParse({
    studentName: formData.get("studentName"),
    admissionNumber: formData.get("admissionNumber"),
    department: formData.get("department") || undefined,
    studentDegree: formData.get("studentDegree") || undefined,
    gender: formData.get("gender") || undefined,
    category: formData.get("category") || undefined,
    isForeigner: parseYesNo(formData.get("isForeigner")),
    countryName: formData.get("countryName") || undefined,
    seminarTitle: formData.get("seminarTitle") || undefined,
    durationFrom: formData.get("durationFrom"),
    durationTo: formData.get("durationTo"),
    sourceOfAdvertisement: formData.get("sourceOfAdvertisement") || undefined,
    organizingInstituteAddress: formData.get("organizingInstituteAddress") || undefined,
    paperStatus: formData.getAll("paperStatus"),
    lastSubmissionDate: formData.get("lastSubmissionDate") || undefined,
    seminarsAttendedLastTwoYears: formData.get("seminarsAttendedLastTwoYears") || undefined,
    isRelevantToSubject: parseYesNo(formData.get("isRelevantToSubject")),
    fundsFromOutsideAgency: parseYesNo(formData.get("fundsFromOutsideAgency")),
    registrationFee: formData.get("registrationFee") || undefined,
    travelGrant: formData.get("travelGrant") || undefined,
    totalLiability: formData.get("totalLiability") || undefined,
    outsideFundingFullPayment: formData.get("outsideFundingFullPayment") || undefined,
    outsideFundingPartialPayment: formData.get("outsideFundingPartialPayment") || undefined,
    fundingAgencyName: formData.get("fundingAgencyName") || undefined,
    combinedWithOtherPurpose: parseYesNo(formData.get("combinedWithOtherPurpose")),
    otherRelevantInfo: formData.get("otherRelevantInfo") || undefined,
    captchaToken: formData.get("captchaToken") || undefined,
  });

  if (!parsed.success) {
    return fail("Validation failed", parsed.error.flatten().fieldErrors);
  }

  if (!(await verifyCaptcha(parsed.data.captchaToken))) {
    return fail("CAPTCHA verification failed. Please try again.");
  }

  const admin = createAdminClient();
  if (!admin) return fail("Service temporarily unavailable.");

  const registrationNumber = await generateRegistrationNumber();
  if (!registrationNumber) {
    return fail("Could not generate registration number. Please try again.");
  }

  const userAgent = headerStore.get("user-agent");
  const data = parsed.data;

  const { error } = await admin.from(Tables.pgSeminarRegistrations).insert({
    registration_number: registrationNumber,
    student_name: data.studentName,
    admission_number: data.admissionNumber,
    department: data.department || null,
    student_degree: data.studentDegree || null,
    gender: data.gender || null,
    category: data.category || null,
    is_foreigner: yesNoToBoolean(data.isForeigner),
    country_name: data.countryName || null,
    seminar_title: data.seminarTitle || null,
    duration_from: data.durationFrom,
    duration_to: data.durationTo,
    source_of_advertisement: data.sourceOfAdvertisement || null,
    organizing_institute_address: data.organizingInstituteAddress || null,
    paper_status: data.paperStatus,
    last_submission_date: data.lastSubmissionDate || null,
    seminars_attended_last_two_years: data.seminarsAttendedLastTwoYears || null,
    is_relevant_to_subject: yesNoToBoolean(data.isRelevantToSubject),
    funds_from_outside_agency: yesNoToBoolean(data.fundsFromOutsideAgency),
    registration_fee: data.registrationFee ?? null,
    travel_grant: data.travelGrant ?? null,
    total_liability: data.totalLiability ?? null,
    outside_funding_full_payment: data.outsideFundingFullPayment || null,
    outside_funding_partial_payment: data.outsideFundingPartialPayment || null,
    funding_agency_name: data.fundingAgencyName || null,
    combined_with_other_purpose: yesNoToBoolean(data.combinedWithOtherPurpose),
    other_relevant_info: data.otherRelevantInfo || null,
    status: "submitted",
    ip_address: ipAddress === "unknown" ? null : ipAddress,
    user_agent: userAgent,
  });

  if (error) return fail("Submission failed. Please try again later.");

  return ok({ registrationNumber });
}
