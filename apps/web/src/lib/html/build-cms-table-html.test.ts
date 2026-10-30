import { describe, expect, it } from "vitest";

import { buildCmsTableHtml, CMS_TABLE_ADD_ROW_MAX, CMS_TABLE_MAX_ROWS, cmsTableAtRowLimit } from "@/lib/html/build-cms-table-html";
import { sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

describe("buildCmsTableHtml", () => {
  it("builds a header row plus body rows", () => {
    const html = buildCmsTableHtml(3, 2, true);
    expect(html).toContain("<thead>");
    expect(html.match(/<th>/g)).toHaveLength(2);
    expect(html.match(/<td>/g)).toHaveLength(4);
    expect(html).toContain("<br>");
    expect(html.endsWith("</table><p><br></p>")).toBe(true);
  });

  it("builds a header-only table when there is a single row", () => {
    const html = buildCmsTableHtml(1, 2, true);
    expect(html).toContain("<thead>");
    expect(html).not.toContain("<tbody>");
    expect(html.match(/<th>/g)).toHaveLength(2);
  });

  it("builds body cells only when the header is off", () => {
    const html = buildCmsTableHtml(2, 3, false);
    expect(html).not.toContain("<thead>");
    expect(html).not.toContain("<th>");
    expect(html.match(/<td>/g)).toHaveLength(6);
  });

  it("clamps row and column counts", () => {
    expect(buildCmsTableHtml(0, 0, false).match(/<td>/g)).toHaveLength(1);
    expect(buildCmsTableHtml(100, 100, false).match(/<tr>/g)).toHaveLength(20);
    expect(buildCmsTableHtml(100, 100, false).match(/<td>/g)).toHaveLength(20 * 12);
  });

  it("lets + Row grow a table to 500 rows", () => {
    expect(cmsTableAtRowLimit(CMS_TABLE_ADD_ROW_MAX - 1)).toBe(false);
    expect(cmsTableAtRowLimit(CMS_TABLE_ADD_ROW_MAX)).toBe(true);
  });

  it("counts the header row inside the 20-row cap", () => {
    const html = buildCmsTableHtml(CMS_TABLE_MAX_ROWS, 2, true);
    expect(html.match(/<tr>/g)).toHaveLength(CMS_TABLE_MAX_ROWS);
    const body = html.match(/<tbody>[\s\S]*<\/tbody>/)?.[0] ?? "";
    expect(body.match(/<tr>/g)).toHaveLength(CMS_TABLE_MAX_ROWS - 1);
  });

  it("keeps table markup after sanitizing", () => {
    const out = sanitizeCmsHtml(buildCmsTableHtml(2, 2, true));
    expect(out).toContain("<table>");
    expect(out).toContain("<thead>");
    expect(out).toContain("<tbody>");
    expect(out).toContain("<th>");
    expect(out).toContain("<td>");
  });

  it("builds a header column and keeps the style class after sanitizing", () => {
    const html = buildCmsTableHtml(2, 2, { headerRow: false, headerColumn: true, style: "compact" });
    expect(html).toContain('class="cms-table-compact"');
    expect(html).not.toContain("<thead>");
    expect(html.match(/<th>/g)).toHaveLength(2);
    expect(html.match(/<td>/g)).toHaveLength(2);
    const out = sanitizeCmsHtml(html);
    expect(out).toContain("cms-table-compact");
    expect(out).toContain("<th>");
  });

  it("keeps a plain table class and cell alignment", () => {
    const out = sanitizeCmsHtml(
      `${buildCmsTableHtml(1, 1, { headerRow: false, style: "plain" })}`,
    );
    expect(out).toContain("cms-table-plain");
    expect(sanitizeCmsHtml('<td style="text-align: center">A</td>')).toContain("text-align:center");
  });
});
