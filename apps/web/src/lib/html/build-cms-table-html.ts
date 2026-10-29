export const CMS_TABLE_MAX_ROWS = 20;
export const CMS_TABLE_MAX_COLUMNS = 12;

export type CmsTableStyle = "standard" | "compact" | "plain";

export type CmsTableOptions = {
  headerRow?: boolean;
  headerColumn?: boolean;
  style?: CmsTableStyle;
};

function clampCount(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

/** True when another `<tr>` would pass the insert-dialog budget. The header row counts as one of those rows. */
export function cmsTableAtRowLimit(rowCount: number): boolean {
  return rowCount >= CMS_TABLE_MAX_ROWS;
}

function readOptions(headerRowOrOptions: boolean | CmsTableOptions): Required<CmsTableOptions> {
  if (typeof headerRowOrOptions === "boolean") {
    return { headerRow: headerRowOrOptions, headerColumn: false, style: "standard" };
  }
  return {
    headerRow: headerRowOrOptions.headerRow ?? true,
    headerColumn: headerRowOrOptions.headerColumn ?? false,
    style: headerRowOrOptions.style ?? "standard",
  };
}

function cellTag(rowIndex: number, columnIndex: number, options: Required<CmsTableOptions>): "td" | "th" {
  if (options.headerRow && rowIndex === 0) return "th";
  if (options.headerColumn && columnIndex === 0) return "th";
  return "td";
}

function rowHtml(rowIndex: number, columns: number, options: Required<CmsTableOptions>): string {
  const cells = Array.from({ length: columns }, (_, columnIndex) => {
    const tag = cellTag(rowIndex, columnIndex, options);
    return `<${tag}><br></${tag}>`;
  }).join("");
  return `<tr>${cells}</tr>`;
}

function tableOpenTag(style: CmsTableStyle): string {
  if (style === "compact") return '<table class="cms-table-compact">';
  if (style === "plain") return '<table class="cms-table-plain">';
  return "<table>";
}

/** Table markup for the admin HTML editor. The first row is a header when requested. */
export function buildCmsTableHtml(
  rows: number,
  columns: number,
  headerRowOrOptions: boolean | CmsTableOptions = true,
): string {
  const options = readOptions(headerRowOrOptions);
  const totalRows = clampCount(rows, CMS_TABLE_MAX_ROWS);
  const safeColumns = clampCount(columns, CMS_TABLE_MAX_COLUMNS);
  const headerCount = options.headerRow ? 1 : 0;
  const bodyCount = totalRows - headerCount;
  const parts = [tableOpenTag(options.style)];
  if (headerCount > 0) parts.push(`<thead>${rowHtml(0, safeColumns, options)}</thead>`);
  if (bodyCount > 0) {
    const body = Array.from({ length: bodyCount }, (_, index) =>
      rowHtml(headerCount + index, safeColumns, options),
    ).join("");
    parts.push(`<tbody>${body}</tbody>`);
  }
  parts.push("</table><p><br></p>");
  return parts.join("");
}
