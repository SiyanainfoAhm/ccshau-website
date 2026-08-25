import { describe, expect, it } from "vitest";

import {
  extractPdfCaptionFromHtml,
  extractPdfUrlFromHtml,
  isPrimarilyPdfHtml,
} from "@/lib/html/extract-pdf-url";

describe("extractPdfUrlFromHtml", () => {
  it("returns null for empty html", () => {
    expect(extractPdfUrlFromHtml(null)).toBeNull();
    expect(extractPdfUrlFromHtml("")).toBeNull();
    expect(extractPdfUrlFromHtml("   ")).toBeNull();
  });

  it("extracts pdf from iframe src", () => {
    const html =
      '<iframe src="/documents/college-wise-degree-programmes.pdf" title="Degree"></iframe>';
    expect(extractPdfUrlFromHtml(html)).toBe(
      "/documents/college-wise-degree-programmes.pdf",
    );
  });

  it("extracts pdf from anchor href when no iframe", () => {
    const html =
      '<p><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/a.pdf">Download</a></p>';
    expect(extractPdfUrlFromHtml(html)).toBe(
      "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/a.pdf",
    );
  });

  it("returns null when no pdf url is present", () => {
    expect(extractPdfUrlFromHtml("<p>Hello world</p>")).toBeNull();
  });
});

describe("isPrimarilyPdfHtml", () => {
  it("is true for short pdf-only iframe content", () => {
    const html =
      '<iframe src="/documents/college-wise-degree-programmes.pdf" title="Degree"></iframe>';
    expect(isPrimarilyPdfHtml(html)).toBe(true);
  });

  it("is false for long body content that also links a pdf", () => {
    const longText = "x".repeat(300);
    const html = `<p>${longText}</p><a href="/file.pdf">PDF</a>`;
    expect(isPrimarilyPdfHtml(html)).toBe(false);
  });

  it("is false when there is no pdf", () => {
    expect(isPrimarilyPdfHtml("<p>About the college</p>")).toBe(false);
  });
});

describe("extractPdfCaptionFromHtml", () => {
  it("returns short caption text", () => {
    const html =
      '<p>Last Updated :- Fri Mar 22 2024</p><iframe src="/a.pdf"></iframe>';
    expect(extractPdfCaptionFromHtml(html)).toContain("Last Updated");
  });

  it("returns null for long stripped text", () => {
    const html = `<p>${"word ".repeat(100)}</p><a href="/a.pdf">x</a>`;
    expect(extractPdfCaptionFromHtml(html)).toBeNull();
  });
});
