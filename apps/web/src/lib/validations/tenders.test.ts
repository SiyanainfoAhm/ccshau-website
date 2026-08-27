/**
 * Vitest coverage for tenderFormSchema, corrigendumFormSchema, and
 * formatTenderCategory helper (slug/title, lifecycle statuses, labels).
 */
import { describe, expect, it } from "vitest";

import {
  corrigendumFormSchema,
  formatTenderCategory,
  tenderFormSchema,
} from "@/lib/validations/tenders";

const baseTender = {
  titleEn: "Supply of Lab Equipment",
  slug: "supply-of-lab-equipment",
  status: "draft" as const,
};

// Suite: tender create/edit form validation.
describe("tenderFormSchema", () => {
  // Accepts minimal draft tender.
  it("accepts a minimal valid tender", () => {
    expect(tenderFormSchema.safeParse(baseTender).success).toBe(true);
  });

  // Rejects empty titleEn and underscore/invalid slug.
  it("requires english title and slug format", () => {
    expect(
      tenderFormSchema.safeParse({ ...baseTender, titleEn: "" }).success,
    ).toBe(false);
    expect(
      tenderFormSchema.safeParse({ ...baseTender, slug: "Bad_Slug" }).success,
    ).toBe(false);
  });

  // Accepts open/closed/cancelled/archived statuses.
  it("accepts known lifecycle statuses", () => {
    for (const status of ["open", "closed", "cancelled", "archived"] as const) {
      expect(
        tenderFormSchema.safeParse({ ...baseTender, status }).success,
      ).toBe(true);
    }
  });
});

// Suite: corrigendum title requirement.
describe("corrigendumFormSchema", () => {
  // Accepts non-empty title; rejects empty title.
  it("requires a title", () => {
    expect(corrigendumFormSchema.safeParse({ title: "Corrigendum 1" }).success).toBe(
      true,
    );
    expect(corrigendumFormSchema.safeParse({ title: "" }).success).toBe(false);
  });
});

// Suite: tender category display helper.
describe("formatTenderCategory", () => {
  // Capitalizes known labels; null becomes em dash.
  it("capitalizes category labels", () => {
    expect(formatTenderCategory("goods")).toBe("Goods");
    expect(formatTenderCategory(null)).toBe("—");
  });
});
