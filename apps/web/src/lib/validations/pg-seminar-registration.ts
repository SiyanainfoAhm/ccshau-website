import { z } from "zod";

const yesNo = z.enum(["yes", "no"]).optional();

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : undefined;
  });

export const pgSeminarRegistrationSchema = z
  .object({
    studentName: z.string().min(2, "Name is required"),
    admissionNumber: z.string().min(1, "Admission number is required"),
    department: z.string().optional(),
    studentDegree: z.string().optional(),
    gender: z.enum(["male", "female"]).optional(),
    category: z.enum(["SC", "ST", "OBC", "PH", "GEN"]).optional(),
    isForeigner: yesNo,
    countryName: z.string().optional(),
    seminarTitle: z.string().optional(),
    durationFrom: z.string().min(1, "From date is required"),
    durationTo: z.string().min(1, "To date is required"),
    sourceOfAdvertisement: z.string().optional(),
    organizingInstituteAddress: z.string().optional(),
    paperStatus: z.array(z.enum(["oral", "poster", "participation"])).default([]),
    lastSubmissionDate: z.string().optional(),
    seminarsAttendedLastTwoYears: z.string().optional(),
    isRelevantToSubject: yesNo,
    fundsFromOutsideAgency: yesNo,
    registrationFee: optionalNumber,
    travelGrant: optionalNumber,
    totalLiability: optionalNumber,
    outsideFundingFullPayment: z.string().optional(),
    outsideFundingPartialPayment: z.string().optional(),
    fundingAgencyName: z.string().optional(),
    combinedWithOtherPurpose: yesNo,
    otherRelevantInfo: z.string().optional(),
    captchaToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.durationFrom && data.durationTo && data.durationTo < data.durationFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "To date must be on or after from date",
        path: ["durationTo"],
      });
    }
    if (data.isForeigner === "yes" && !data.countryName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Country name is required for foreign students",
        path: ["countryName"],
      });
    }
  });

export type PgSeminarRegistrationInput = z.infer<typeof pgSeminarRegistrationSchema>;

export function parseYesNo(value: FormDataEntryValue | null): "yes" | "no" | undefined {
  if (value === "yes" || value === "no") return value;
  return undefined;
}

export function yesNoToBoolean(value: "yes" | "no" | undefined): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}
