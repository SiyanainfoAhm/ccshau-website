/**
 * Tests for `@/lib/pages/microsite-kind`.
 * Covers microsite root detection and academic vs directorate kind inference.
 */

import { describe, expect, it } from "vitest";

import {
  inferMicrositeKind,
  isMicrositeRoot,
} from "@/lib/pages/microsite-kind";

// Suite: microsite kind helpers.
describe("microsite-kind", () => {
  // Root when id matches college_root_id and page_type is college.
  it("detects microsite roots", () => {
    expect(
      isMicrositeRoot({
        id: "c1",
        college_root_id: "c1",
        page_type: "college",
      }),
    ).toBe(true);
    expect(
      isMicrositeRoot({
        id: "c1",
        college_root_id: "other",
        page_type: "college",
      }),
    ).toBe(false);
    expect(
      isMicrositeRoot({
        id: "p1",
        college_root_id: "p1",
        page_type: "standard",
      }),
    ).toBe(false);
  });

  // Parent slug "colleges" => academic; otherwise directorate (incl. null parent).
  it("infers academic vs directorate from parent slug", () => {
    const parents = new Map([
      ["p-colleges", "colleges"],
      ["p-other", "directorates"],
    ]);

    expect(
      inferMicrositeKind({ parent_id: "p-colleges" }, parents),
    ).toBe("academic");
    expect(
      inferMicrositeKind({ parent_id: "p-other" }, parents),
    ).toBe("directorate");
    expect(inferMicrositeKind({ parent_id: null }, parents)).toBe(
      "directorate",
    );
  });
});
