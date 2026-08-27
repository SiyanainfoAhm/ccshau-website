import { describe, expect, it } from "vitest";

import { contentStatusOptions } from "@/lib/auth/content-status-options";
import { tenderStatusOptions } from "@/lib/auth/tender-status-options";

describe("contentStatusOptions", () => {
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

describe("tenderStatusOptions", () => {
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
