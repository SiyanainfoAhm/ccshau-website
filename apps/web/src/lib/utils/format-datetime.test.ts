import { describe, expect, it } from "vitest";

import { formatAdminDateTime, isExpiredAt } from "@/lib/utils/format-datetime";

describe("format-datetime", () => {
  it("formats valid ISO timestamps in Asia/Kolkata", () => {
    const formatted = formatAdminDateTime("2026-01-15T06:30:00.000Z");
    expect(formatted).toMatch(/15\/01\/2026/);
    expect(formatted).toMatch(/12:00:00|12:00/);
  });

  it("returns original string for invalid dates", () => {
    expect(formatAdminDateTime("not-a-date")).toBe("not-a-date");
  });

  it("detects expiry against now", () => {
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    expect(isExpiredAt("2026-05-01T00:00:00.000Z", now)).toBe(true);
    expect(isExpiredAt("2026-07-01T00:00:00.000Z", now)).toBe(false);
    expect(isExpiredAt("bad", now)).toBe(false);
  });
});
