import { describe, expect, it } from "vitest";

import {
  cmsModuleForAdminPath,
  sessionCanAccessAdminPathModules,
  sessionCanAccessCmsModule,
} from "@/lib/auth/cms-module-access";

describe("cms-module-access", () => {
  it("maps admin paths to cms modules", () => {
    expect(cmsModuleForAdminPath("/admin/pages")).toBe("pages");
    expect(cmsModuleForAdminPath("/admin/news/abc")).toBe("news");
    expect(cmsModuleForAdminPath("/admin/tenders/new")).toBe("tenders");
    expect(cmsModuleForAdminPath("/admin/users")).toBeNull();
  });

  it("allows all modules when allow-list is null", () => {
    expect(sessionCanAccessCmsModule(null, "pages")).toBe(true);
    expect(sessionCanAccessAdminPathModules(null, "/admin/news")).toBe(true);
  });

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
