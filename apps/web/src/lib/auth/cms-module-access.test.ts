/**
 * Tests for cms-module-access: mapping admin paths to CMS modules and
 * enforcing session module allow-lists (null = unrestricted).
 */
import { describe, expect, it } from "vitest";

import {
  cmsModuleForAdminPath,
  sessionCanAccessAdminPathModules,
  sessionCanAccessCmsModule,
} from "@/lib/auth/cms-module-access";

/* Path-to-module mapping and allow-list checks. */
describe("cms-module-access", () => {
  // Content admin URLs resolve to modules; non-CMS paths return null.
  it("maps admin paths to cms modules", () => {
    expect(cmsModuleForAdminPath("/admin/pages")).toBe("pages");
    expect(cmsModuleForAdminPath("/admin/news/abc")).toBe("news");
    expect(cmsModuleForAdminPath("/admin/tenders/new")).toBe("tenders");
    expect(cmsModuleForAdminPath("/admin/users")).toBeNull();
  });

  // Null allow-list means every module and module-backed path is open.
  it("allows all modules when allow-list is null", () => {
    expect(sessionCanAccessCmsModule(null, "pages")).toBe(true);
    expect(sessionCanAccessAdminPathModules(null, "/admin/news")).toBe(true);
  });

  // Listed modules pass; unlisted content modules fail; non-module paths pass.
  it("enforces allow-list for content modules", () => {
    const allowed = ["pages", "news"] as const;
    expect(sessionCanAccessCmsModule([...allowed], "pages")).toBe(true);
    expect(sessionCanAccessCmsModule([...allowed], "tenders")).toBe(false);
    expect(sessionCanAccessAdminPathModules([...allowed], "/admin/tenders")).toBe(
      false,
    );
    expect(sessionCanAccessAdminPathModules([...allowed], "/admin/users")).toBe(
      true,
    );
  });
});
