/**
 * Tests for content/tender status option helpers: which workflow statuses
 * appear in UI selects based on publish permission.
 */
import { describe, expect, it } from "vitest";

import { contentStatusOptions } from "@/lib/auth/content-status-options";
import { tenderStatusOptions } from "@/lib/auth/tender-status-options";

/* CMS content status select options vs canPublish. */
describe("contentStatusOptions", () => {
  // Without publish rights, published is omitted but pending_review remains.
  it("hides published when user cannot publish", () => {
    expect(contentStatusOptions(true).map((o) => o.value)).toContain(
      "published",
    );
    expect(contentStatusOptions(false).map((o) => o.value)).not.toContain(
      "published",
    );
    expect(contentStatusOptions(false).map((o) => o.value)).toContain(
      "pending_review",
    );
  });
});

/* Tender status select options vs canPublish. */
describe("tenderStatusOptions", () => {
  // Without publish rights, open is omitted but pending_review remains.
  it("hides open when user cannot publish", () => {
    expect(tenderStatusOptions(true).map((o) => o.value)).toContain("open");
    expect(tenderStatusOptions(false).map((o) => o.value)).not.toContain(
      "open",
    );
    expect(tenderStatusOptions(false).map((o) => o.value)).toContain(
      "pending_review",
    );
  });
});
