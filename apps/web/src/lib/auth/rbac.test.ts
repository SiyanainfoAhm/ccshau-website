import { describe, expect, it } from "vitest";

import { hasRole, highestRole } from "@/lib/auth/rbac";
import type { UserRoleAssignment } from "@/lib/auth/rbac";

describe("hasRole", () => {
  it("matches allowed roles", () => {
    const assignments: UserRoleAssignment[] = [
      { role: "editor", departmentId: "dept-a" },
    ];
    expect(hasRole(assignments, ["editor", "dept_admin"])).toBe(true);
    expect(hasRole(assignments, ["super_admin"])).toBe(false);
  });

  it("treats super_admin as allowed when listed", () => {
    const assignments: UserRoleAssignment[] = [
      { role: "super_admin", departmentId: null },
    ];
    expect(hasRole(assignments, ["super_admin", "editor"])).toBe(true);
    expect(hasRole(assignments, ["editor"])).toBe(false);
  });

  it("scopes by department when departmentId is provided", () => {
    const assignments: UserRoleAssignment[] = [
      { role: "editor", departmentId: "dept-a" },
      { role: "viewer", departmentId: null },
    ];
    expect(hasRole(assignments, ["editor"], "dept-a")).toBe(true);
    expect(hasRole(assignments, ["editor"], "dept-b")).toBe(false);
    expect(hasRole(assignments, ["viewer"], "dept-b")).toBe(true);
  });
});

describe("highestRole", () => {
  it("returns the highest ranked role", () => {
    expect(
      highestRole([
        { role: "viewer", departmentId: null },
        { role: "editor", departmentId: "dept-a" },
        { role: "dept_admin", departmentId: "dept-a" },
      ]),
    ).toBe("dept_admin");

    expect(
      highestRole([{ role: "super_admin", departmentId: null }]),
    ).toBe("super_admin");
  });

  it("returns null when there are no assignments", () => {
    expect(highestRole([])).toBeNull();
  });
});
