/**
 * Vitest coverage for office-portal schemas: contact lines, staff,
 * news ticker items, and sidebar items (URL/content/linked page rules).
 */
import { describe, expect, it } from "vitest";

import {
  pageContactLineSchema,
  pageSidebarItemSchema,
  pageStaffSchema,
  pageNewsTickerItemSchema,
} from "@/lib/validations/office-portal";

const UUID = "11111111-1111-4111-8111-111111111111";

// Suite: office portal page block field validation.
describe("office-portal schemas", () => {
  // Contact lines need both labelEn and valueEn.
  it("requires contact label and value", () => {
    expect(
      pageContactLineSchema.safeParse({
        labelEn: "Phone",
        valueEn: "01662-123456",
      }).success,
    ).toBe(true);
    expect(
      pageContactLineSchema.safeParse({ labelEn: "Phone", valueEn: "" })
        .success,
    ).toBe(false);
  });

  // Staff requires nameEn and non-empty designationEn.
  it("requires staff name and designation", () => {
    expect(
      pageStaffSchema.safeParse({
        nameEn: "Dr Test",
        designationEn: "Professor",
        email: "a@ccshau.ac.in",
      }).success,
    ).toBe(true);
    expect(
      pageStaffSchema.safeParse({
        nameEn: "Dr Test",
        designationEn: "",
      }).success,
    ).toBe(false);
  });

  // Ticker items require non-empty titleEn.
  it("requires ticker headline", () => {
    expect(
      pageNewsTickerItemSchema.safeParse({ titleEn: "Notice" }).success,
    ).toBe(true);
    expect(pageNewsTickerItemSchema.safeParse({ titleEn: "" }).success).toBe(
      false,
    );
  });

  // Sidebar needs href, contentEn, or linkedPageId; bare label fails.
  it("requires sidebar URL or English content", () => {
    expect(
      pageSidebarItemSchema.safeParse({
        side: "left",
        labelEn: "Link",
        href: "/pages/about",
      }).success,
    ).toBe(true);
    expect(
      pageSidebarItemSchema.safeParse({
        side: "right",
        labelEn: "Block",
        contentEn: "Hello",
      }).success,
    ).toBe(true);
    expect(
      pageSidebarItemSchema.safeParse({
        side: "left",
        labelEn: "Empty",
        linkedPageId: UUID,
      }).success,
    ).toBe(true);
    expect(
      pageSidebarItemSchema.safeParse({
        side: "left",
        labelEn: "Empty",
      }).success,
    ).toBe(false);
  });
});
