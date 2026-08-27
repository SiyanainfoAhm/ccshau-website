/**
 * Tests for rbac primitives: hasRole matching (with optional department
 * scope) and highestRole ranking over role assignments.
 */
import { describe, expect, it } from "vitest";

import { hasRole, highestRole } from "@/lib/auth/rbac";
import type { UserRoleAssignment } from "@/lib/auth/rbac";

/* hasRole: allow-list match, super_admin, and department scoping. */
describe("hasRole", () => {
  // Returns true only when an assignment intersects the allowed role list.
  it("matches allowed roles", () => {
    const assignments: UserRoleAssignment[] = [
      { role: "editor", departmentId: "dept-a" },
    ];
    expect(hasRole(assignments, ["editor", "dept_admin"])).toBe(true);
    expect(hasRole(assignments, ["super_admin"])).toBe(false);
  });

  // Super admin matches only when included in the allowed list.
  it("treats super_admin as allowed when listed", () => {
    const assignments: UserRoleAssignment[] = [
      { role: "super_admin", departmentId: null },
    ];
    expect(hasRole(assignments, ["super_admin", "editor"])).toBe(true);
    expect(hasRole(assignments, ["editor"])).toBe(false);
  });

  // Dept-scoped roles require matching dept; null-dept roles apply globally.
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

/* highestRole: rank among assignments and empty-list edge case. */
describe("highestRole", () => {
  // Picks the top-ranked role from mixed assignments (dept_admin / super_admin).
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

  // Empty assignment list yields null rather than a default role.
  it("returns null when there are no assignments", () => {
    expect(highestRole([])).toBeNull();
  });
});
