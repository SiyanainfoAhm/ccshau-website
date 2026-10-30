import { CMS_TABLE_MAX_COLUMNS, cmsTableAtRowLimit, type CmsTableStyle } from "@/lib/html/build-cms-table-html";

const STYLE_CLASSES = ["cms-table-compact", "cms-table-plain"] as const;

function columnCount(table: HTMLTableElement): number {
  return Math.max(0, ...[...table.rows].map((row) => row.cells.length));
}

function ensureBody(table: HTMLTableElement): HTMLTableSectionElement {
  const existing = table.tBodies[0];
  if (existing) return existing;
  const body = table.ownerDocument.createElement("tbody");
  table.appendChild(body);
  return body;
}

function replaceCell(cell: HTMLTableCellElement, tag: "td" | "th"): HTMLTableCellElement {
  if (cell.tagName === tag.toUpperCase()) return cell;
  const next = cell.ownerDocument.createElement(tag);
  next.innerHTML = cell.innerHTML || "<br>";
  const style = cell.getAttribute("style");
  if (style) next.setAttribute("style", style);
  if (cell.className) next.className = cell.className;
  cell.replaceWith(next);
  return next;
}

function emptyCell(documentRef: Document, tag: "td" | "th"): HTMLTableCellElement {
  const cell = documentRef.createElement(tag);
  cell.innerHTML = "<br>";
  return cell;
}

function rowInTableHead(row: HTMLTableRowElement | undefined): boolean {
  return row?.parentElement?.tagName === "THEAD";
}

function firstRowUsesHeaderCells(table: HTMLTableElement): boolean {
  const row = table.rows[0];
  if (!row || row.cells.length === 0) return false;
  return [...row.cells].every((cell) => cell.tagName === "TH");
}

/** True only when the first row is a `<thead>` of header cells. `<th>` inside `<tbody>` is not a header row. */
export function isHeaderRow(table: HTMLTableElement): boolean {
  const row = table.rows[0];
  return firstRowUsesHeaderCells(table) && rowInTableHead(row);
}

export function isHeaderColumn(table: HTMLTableElement): boolean {
  const rows = [...table.rows];
  if (rows.length === 0) return false;
  return rows.every((row) => row.cells[0]?.tagName === "TH");
}

export function tableStyle(table: HTMLTableElement): CmsTableStyle {
  if (table.classList.contains("cms-table-compact")) return "compact";
  if (table.classList.contains("cms-table-plain")) return "plain";
  return "standard";
}

export function setTableStyle(table: HTMLTableElement, style: CmsTableStyle) {
  table.classList.remove(...STYLE_CLASSES);
  if (style === "compact") table.classList.add("cms-table-compact");
  if (style === "plain") table.classList.add("cms-table-plain");
}

export function setCellAlign(cell: HTMLTableCellElement, align: "left" | "center" | "right") {
  cell.style.textAlign = align;
}

export function setHeaderRow(table: HTMLTableElement, enabled: boolean) {
  const row = table.rows[0];
  if (!row) return;
  const alreadyHeaderCells = firstRowUsesHeaderCells(table);
  const inHead = rowInTableHead(row);
  if (enabled && alreadyHeaderCells && inHead) return;
  if (!enabled && !alreadyHeaderCells) return;
  const headerColumn = isHeaderColumn(table);
  if (enabled !== alreadyHeaderCells) {
    [...row.cells].forEach((cell, index) => {
      const tag = enabled || (headerColumn && index === 0) ? "th" : "td";
      replaceCell(cell, tag);
    });
  }
  const updated = table.rows[0];
  if (!updated) return;
  if (enabled) {
    if (!rowInTableHead(updated)) {
      const head = table.tHead ?? table.ownerDocument.createElement("thead");
      if (!table.tHead) table.insertBefore(head, table.firstChild);
      head.appendChild(updated);
    }
    if (table.tBodies[0] && table.tBodies[0].rows.length === 0) table.tBodies[0].remove();
    return;
  }
  if (rowInTableHead(updated)) {
    const body = ensureBody(table);
    body.insertBefore(updated, body.firstChild);
    if (table.tHead && table.tHead.rows.length === 0) table.tHead.remove();
  }
}

export function setHeaderColumn(table: HTMLTableElement, enabled: boolean) {
  if (isHeaderColumn(table) === enabled) return;
  const headerRow = firstRowUsesHeaderCells(table);
  [...table.rows].forEach((row, rowIndex) => {
    const cell = row.cells[0];
    if (!cell) return;
    const tag = enabled || (headerRow && rowIndex === 0) ? "th" : "td";
    replaceCell(cell, tag);
  });
}

export function addRowAfter(table: HTMLTableElement, cell: HTMLTableCellElement): HTMLTableCellElement | null {
  if (cmsTableAtRowLimit(table.rows.length)) return cell;
  const current = cell.parentElement;
  if (!(current instanceof HTMLTableRowElement)) return cell;
  const width = Math.max(1, columnCount(table));
  const headerColumn = isHeaderColumn(table);
  const row = table.ownerDocument.createElement("tr");
  for (let index = 0; index < width; index += 1) {
    row.appendChild(emptyCell(table.ownerDocument, headerColumn && index === 0 ? "th" : "td"));
  }
  if (current.parentElement?.tagName === "THEAD") {
    const body = ensureBody(table);
    body.insertBefore(row, body.firstChild);
  } else {
    current.after(row);
  }
  return row.cells[Math.min(cell.cellIndex, row.cells.length - 1)] ?? null;
}

export function addColumnAfter(table: HTMLTableElement, cell: HTMLTableCellElement): HTMLTableCellElement | null {
  if (columnCount(table) >= CMS_TABLE_MAX_COLUMNS) return cell;
  const index = cell.cellIndex;
  const headerRow = firstRowUsesHeaderCells(table);
  let placed: HTMLTableCellElement | null = null;
  [...table.rows].forEach((row, rowIndex) => {
    const next = emptyCell(table.ownerDocument, headerRow && rowIndex === 0 ? "th" : "td");
    const ref = row.cells[index];
    if (ref) ref.after(next);
    else row.appendChild(next);
    if (row === cell.parentElement) placed = next;
  });
  return placed;
}

export function deleteRow(table: HTMLTableElement, cell: HTMLTableCellElement): HTMLTableCellElement | null {
  if (table.rows.length <= 1) return cell;
  const row = cell.parentElement;
  if (!(row instanceof HTMLTableRowElement)) return cell;
  const index = cell.cellIndex;
  const rowIndex = [...table.rows].indexOf(row);
  const section = row.parentElement;
  row.remove();
  if (section && section !== table && section instanceof HTMLTableSectionElement && section.rows.length === 0) {
    section.remove();
  }
  const fallback = table.rows[Math.min(rowIndex, table.rows.length - 1)];
  if (!fallback) return null;
  return fallback.cells[Math.min(index, fallback.cells.length - 1)] ?? null;
}

export function deleteColumn(table: HTMLTableElement, cell: HTMLTableCellElement): HTMLTableCellElement | null {
  if (columnCount(table) <= 1) return cell;
  const index = cell.cellIndex;
  const row = cell.parentElement;
  [...table.rows].forEach((item) => item.cells[index]?.remove());
  const focusRow = row instanceof HTMLTableRowElement && row.isConnected ? row : table.rows[0];
  if (!focusRow) return null;
  return focusRow.cells[Math.min(index, focusRow.cells.length - 1)] ?? null;
}

export function removeTable(table: HTMLTableElement): HTMLElement {
  const paragraph = table.ownerDocument.createElement("p");
  paragraph.innerHTML = "<br>";
  table.replaceWith(paragraph);
  return paragraph;
}
