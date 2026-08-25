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

describe("tenderFormSchema", () => {
  it("accepts a minimal valid tender", () => {
    expect(tenderFormSchema.safeParse(baseTender).success).toBe(true);
  });

  it("requires english title and slug format", () => {
    expect(
      tenderFormSchema.safeParse({ ...baseTender, titleEn: "" }).success,
    ).toBe(false);
    expect(
      tenderFormSchema.safeParse({ ...baseTender, slug: "Bad_Slug" }).success,
    ).toBe(false);
  });

  it("accepts known lifecycle statuses", () => {
    for (const status of ["open", "closed", "cancelled", "archived"] as const) {
      expect(
        tenderFormSchema.safeParse({ ...baseTender, status }).success,
      ).toBe(true);
    }
  });
});

describe("corrigendumFormSchema", () => {
  it("requires a title", () => {
    expect(corrigendumFormSchema.safeParse({ title: "Corrigendum 1" }).success).toBe(
      true,
    );
    expect(corrigendumFormSchema.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("formatTenderCategory", () => {
  it("capitalizes category labels", () => {
    expect(formatTenderCategory("goods")).toBe("Goods");
    expect(formatTenderCategory(null)).toBe("—");
  });
});
