/**
 * Vitest coverage for mid-size admin form schemas: banners, circulars,
 * homepage (quote/dignitary/initiative/CTA), related links, feedback updates,
 * and college contact-email parse/normalize helpers.
 */
import { describe, expect, it } from "vitest";

import { bannerFormSchema } from "@/lib/validations/banners";
import { circularFormSchema } from "@/lib/validations/circulars";
import {
  homepageCtaSchema,
  homepageDignitarySchema,
  homepageInitiativeSchema,
  homepageQuoteSchema,
} from "@/lib/validations/homepage";
import { relatedLinkFormSchema } from "@/lib/validations/related-links";
import { feedbackUpdateSchema } from "@/lib/validations/feedback";
import {
  collegeContactEmailsSchema,
  normalizeContactEmails,
  parseContactEmails,
} from "@/lib/validations/contact-emails";

// Suite: banner form title and optional target URL rules.
describe("bannerFormSchema", () => {
  // Accepts title; optional URL must be valid when set.
  it("requires title and accepts optional URL", () => {
    expect(
      bannerFormSchema.safeParse({ title: "Convocation" }).success,
    ).toBe(true);
    expect(bannerFormSchema.safeParse({ title: "" }).success).toBe(false);
    expect(
      bannerFormSchema.safeParse({
        title: "X",
        targetUrl: "https://hau.ac.in",
      }).success,
    ).toBe(true);
    expect(
      bannerFormSchema.safeParse({
        title: "X",
        targetUrl: "not-a-url",
      }).success,
    ).toBe(false);
  });
});

// Suite: circular English title and status requirements.
describe("circularFormSchema", () => {
  // Rejects empty titleEn; accepts draft with title.
  it("requires English title and status", () => {
    expect(
      circularFormSchema.safeParse({
        titleEn: "Notice",
        status: "draft",
      }).success,
    ).toBe(true);
    expect(
      circularFormSchema.safeParse({
        titleEn: "",
        status: "draft",
      }).success,
    ).toBe(false);
  });
});

// Suite: homepage quote, dignitary, initiative, and CTA schemas.
describe("homepage schemas", () => {
  // Accepts minimal valid blocks; CTA rejects empty linkHref.
  it("validates quote, dignitary, initiative, and CTA", () => {
    expect(
      homepageQuoteSchema.safeParse({
        authorEn: "VC",
        quoteEn: "Excellence",
      }).success,
    ).toBe(true);
    expect(
      homepageDignitarySchema.safeParse({
        nameEn: "Dr X",
        roleEn: "Chancellor",
      }).success,
    ).toBe(true);
    expect(
      homepageInitiativeSchema.safeParse({
        titleEn: "NAHEP",
        descriptionEn: "World Bank project",
      }).success,
    ).toBe(true);
    expect(
      homepageCtaSchema.safeParse({
        titleEn: "Apply",
        buttonEn: "Go",
        linkHref: "/admissions",
      }).success,
    ).toBe(true);
    expect(
      homepageCtaSchema.safeParse({
        titleEn: "Apply",
        buttonEn: "Go",
        linkHref: "",
      }).success,
    ).toBe(false);
  });
});

// Suite: related-link title and URL validation.
describe("relatedLinkFormSchema", () => {
  // Accepts https URL; rejects non-URL strings.
  it("requires title and valid URL", () => {
    expect(
      relatedLinkFormSchema.safeParse({
        titleEn: "ICAR",
        url: "https://icar.org.in",
      }).success,
    ).toBe(true);
    expect(
      relatedLinkFormSchema.safeParse({
        titleEn: "ICAR",
        url: "not-a-url",
      }).success,
    ).toBe(false);
  });
});

// Suite: admin feedback status update payload.
describe("feedbackUpdateSchema", () => {
  // Accepts known status + remarks; rejects unknown status.
  it("accepts admin status updates", () => {
    expect(
      feedbackUpdateSchema.safeParse({
        status: "resolved",
        adminRemarks: "Fixed",
      }).success,
    ).toBe(true);
    expect(
      feedbackUpdateSchema.safeParse({ status: "unknown" }).success,
    ).toBe(false);
  });
});

// Suite: contact-email list parsing and required/optional schema.
describe("contact-emails helpers", () => {
  // Splits on ;/, and normalizes to comma-separated list.
  it("parses and normalizes email lists", () => {
    expect(parseContactEmails("a@x.com; b@y.com , c@z.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
    ]);
    expect(normalizeContactEmails("a@x.com; b@y.com")).toBe(
      "a@x.com, b@y.com",
    );
  });

  // Required mode rejects empty; optional mode allows empty.
  it("enforces required contact emails when configured", () => {
    const required = collegeContactEmailsSchema({ required: true });
    expect(required.safeParse("").success).toBe(false);
    expect(required.safeParse("dean@hau.ac.in").success).toBe(true);

    const optional = collegeContactEmailsSchema();
    expect(optional.safeParse("").success).toBe(true);
  });
});
