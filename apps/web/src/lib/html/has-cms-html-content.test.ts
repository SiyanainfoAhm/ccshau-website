import { describe, expect, it } from "vitest";

import { hasCmsHtmlContent } from "@/lib/html/has-cms-html-content";

describe("hasCmsHtmlContent", () => {
  it("is false for empty values", () => {
    expect(hasCmsHtmlContent(null)).toBe(false);
    expect(hasCmsHtmlContent(undefined)).toBe(false);
    expect(hasCmsHtmlContent("")).toBe(false);
    expect(hasCmsHtmlContent("   ")).toBe(false);
  });

  it("is true when visible text remains", () => {
    expect(hasCmsHtmlContent("<p>Hello CCS HAU</p>")).toBe(true);
  });

  it("is true for media-only markup without text", () => {
    expect(
      hasCmsHtmlContent(
        '<iframe src="/documents/college-wise-degree-programmes.pdf" title="PDF"></iframe>',
      ),
    ).toBe(true);
    expect(hasCmsHtmlContent('<img src="/a.jpg" alt="" />')).toBe(true);
  });

  it("ignores script and style text", () => {
    expect(
      hasCmsHtmlContent("<script>var x=1</script><style>.a{}</style>"),
    ).toBe(false);
  });
});
