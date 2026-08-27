import { describe, expect, it } from "vitest";

import {
  DEPARTMENT_HOD_EDITABLE_LAYOUT_KEYS,
  LAYOUT_PRESETS,
  departmentHodHiddenLayoutKeys,
  hasCompleteLayoutConfig,
  isCollegeLayoutPage,
  mergeLayoutConfig,
  needsOfficePortalData,
  parseLayoutConfigJson,
  preserveDepartmentHodLockedLayoutKeys,
  presetForLayoutTemplate,
  usesConfigurableCollegeLayout,
} from "@/lib/pages/layout-config";

describe("layout-config", () => {
  it("returns presets by template", () => {
    expect(presetForLayoutTemplate("office_portal").staff).toBe(true);
    expect(presetForLayoutTemplate("college_home").collegeTopMenu).toBe(true);
    expect(presetForLayoutTemplate("standard").hero).toBe(false);
  });

  it("merges stored boolean overrides onto presets", () => {
    const merged = mergeLayoutConfig(
      { hero: false, gallery: true },
      "office_portal",
    );
    expect(merged.hero).toBe(false);
    expect(merged.gallery).toBe(true);
    expect(merged.staff).toBe(true);
  });

  it("detects complete layout config and parses JSON", () => {
    expect(hasCompleteLayoutConfig(LAYOUT_PRESETS.minimal)).toBe(true);
    expect(hasCompleteLayoutConfig({ hero: true })).toBe(false);
    expect(hasCompleteLayoutConfig(null)).toBe(false);

    expect(parseLayoutConfigJson({ hero: true, junk: 1 })).toEqual({
      hero: true,
    });
    expect(parseLayoutConfigJson("nope")).toBeNull();
  });

  it("preserves locked layout keys when HOD saves", () => {
    const existing = LAYOUT_PRESETS.office_portal;
    const next = {
      ...existing,
      contacts: false,
      staff: false,
      hero: false,
    };
    const preserved = preserveDepartmentHodLockedLayoutKeys(next, existing);

    expect(preserved.hero).toBe(false);
    expect(preserved.contacts).toBe(true);
    expect(preserved.staff).toBe(true);
    expect(departmentHodHiddenLayoutKeys()).toContain("contacts");
    expect(DEPARTMENT_HOD_EDITABLE_LAYOUT_KEYS).toContain("hero");
  });

  it("detects college layout pages and office data needs", () => {
    expect(isCollegeLayoutPage({ page_type: "college" })).toBe(true);
    expect(
      isCollegeLayoutPage({
        page_type: "standard",
        layout_template: "office_portal",
      }),
    ).toBe(true);
    expect(
      isCollegeLayoutPage({
        page_type: "standard",
        layout_config: LAYOUT_PRESETS.minimal,
      }),
    ).toBe(false);

    expect(needsOfficePortalData(LAYOUT_PRESETS.office_portal)).toBe(true);
    expect(needsOfficePortalData(LAYOUT_PRESETS.minimal)).toBe(false);
    expect(usesConfigurableCollegeLayout("college", "college_home")).toBe(true);
    expect(usesConfigurableCollegeLayout("college", "standard")).toBe(false);
  });
});
