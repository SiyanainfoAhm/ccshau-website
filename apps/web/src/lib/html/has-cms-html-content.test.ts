/**
 * Tests for `@/lib/html/has-cms-html-content`.
 * Covers detecting meaningful CMS HTML vs empty or script/style-only markup.
 */

import { describe, expect, it } from "vitest";

import { hasCmsHtmlContent } from "@/lib/html/has-cms-html-content";

// Suite: hasCmsHtmlContent.
describe("hasCmsHtmlContent", () => {
  // Null, undefined, and whitespace-only values are empty.
  it("is false for empty values", () => {
    expect(hasCmsHtmlContent(null)).toBe(false);
    expect(hasCmsHtmlContent(undefined)).toBe(false);
    expect(hasCmsHtmlContent("")).toBe(false);
    expect(hasCmsHtmlContent("   ")).toBe(false);
  });

  // Visible text inside tags counts as content.
  it("is true when visible text remains", () => {
    expect(hasCmsHtmlContent("<p>Hello CCS HAU</p>")).toBe(true);
  });

  // Media-only markup (iframe/img) counts even without text.
  it("is true for media-only markup without text", () => {
    expect(
      hasCmsHtmlContent(
        '<iframe src="/documents/college-wise-degree-programmes.pdf" title="PDF"></iframe>',
      ),
    ).toBe(true);
    expect(hasCmsHtmlContent('<img src="/a.jpg" alt="" />')).toBe(true);
  });

  // Script and style text alone do not count as content.
  it("ignores script and style text", () => {
    expect(
      hasCmsHtmlContent("<script>var x=1</script><style>.a{}</style>"),
    ).toBe(false);
  });
});
