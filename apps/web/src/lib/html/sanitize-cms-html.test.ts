/**
 * Tests for `@/lib/html/sanitize-cms-html`.
 * Covers HTML sanitization (iframes, styles, scripts) and plain-text normalization.
 */

import { describe, expect, it } from "vitest";

import { normalizeCmsHtml, sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

// Suite: sanitizeCmsHtml.
describe("sanitizeCmsHtml", () => {
  // Empty input stays empty.
  it("returns empty string for empty input", () => {
    expect(sanitizeCmsHtml("")).toBe("");
  });

  // Same-origin PDF iframe sources are preserved.
  it("keeps same-origin pdf iframe src", () => {
    const html =
      '<iframe src="/documents/college-wise-degree-programmes.pdf" title="Degree" width="100%" height="720" loading="lazy"></iframe>';
    const out = sanitizeCmsHtml(html);
    expect(out).toContain('src="/documents/college-wise-degree-programmes.pdf"');
    expect(out).toContain("<iframe");
  });

  // Azure blob PDF iframe sources are preserved.
  it("keeps azure blob pdf iframe src", () => {
    const html =
      '<iframe src="https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/1697605726.pdf" title="Degree"></iframe>';
    const out = sanitizeCmsHtml(html);
    expect(out).toContain(
      "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/1697605726.pdf",
    );
  });

  // Strips font-family/text-align but keeps other safe style props.
  it("strips font-family and text-align from inline styles", () => {
    const html =
      '<p style="font-family: Times New Roman; text-align: justify; margin-top: 8px;">Body</p>';
    const out = sanitizeCmsHtml(html);
    expect(out).not.toMatch(/font-family/i);
    expect(out).not.toMatch(/text-align/i);
    expect(out).toMatch(/margin-top:\s*8px/i);
    expect(out).toContain("Body");
  });

  // Strips legacy Word background paint from inline styles.
  it("strips background and background-color from inline styles", () => {
    const html =
      '<span style="font-size: 18px; background: white; background-color: rgb(255, 255, 255); margin: 0;">Text</span>';
    const out = sanitizeCmsHtml(html);
    expect(out).not.toMatch(/background/i);
    expect(out).not.toMatch(/font-size/i);
    expect(out).toContain("Text");
  });

  // Script tags are removed while surrounding safe content remains.
  it("removes script tags", () => {
    const out = sanitizeCmsHtml('<p>Safe</p><script>alert(1)</script>');
    expect(out).toContain("Safe");
    expect(out).not.toContain("<script");
  });

  // Iframes without title get a default title attribute.
  it("adds a default title on iframe without title", () => {
    const out = sanitizeCmsHtml(
      '<iframe src="/documents/file.pdf" width="100%" height="720"></iframe>',
    );
    expect(out).toMatch(/title="PDF document"/i);
  });
});

// Suite: normalizeCmsHtml.
describe("normalizeCmsHtml", () => {
  // Short plain lines become h2 headings.
  it("promotes a single short plain line to h2", () => {
    expect(normalizeCmsHtml("Hello")).toBe("<h2>Hello</h2>");
  });

  // Longer plain sentences wrap in a paragraph.
  it("wraps longer plain sentence text in a paragraph", () => {
    expect(
      normalizeCmsHtml(
        "This is a longer sentence that should stay as body copy.",
      ),
    ).toBe(
      "<p>This is a longer sentence that should stay as body copy.</p>",
    );
  });

  // Heading-like first lines become h2; following text becomes p.
  it("promotes plain heading-like lines to h2", () => {
    const out = normalizeCmsHtml("About the College\nDetails about programmes.");
    expect(out).toContain("<h2>About the College</h2>");
    expect(out).toContain("<p>Details about programmes.</p>");
  });

  // Existing block HTML is left unchanged.
  it("leaves existing block html intact", () => {
    const html = "<p>Already HTML</p>";
    expect(normalizeCmsHtml(html)).toBe(html);
  });
});
