"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import {
  buildCmsTableHtml,
  CMS_TABLE_MAX_COLUMNS,
  CMS_TABLE_MAX_ROWS,
  type CmsTableOptions,
  type CmsTableStyle,
} from "@/lib/html/build-cms-table-html";
import {
  addColumnAfter,
  addRowAfter,
  deleteColumn,
  deleteRow,
  isHeaderColumn,
  isHeaderRow,
  removeTable,
  setCellAlign,
  setHeaderColumn,
  setHeaderRow,
  setTableStyle,
  tableStyle,
} from "@/lib/html/cms-table-edit";
import { normalizeCmsHtml, sanitizeCmsHtml } from "@/lib/html/sanitize-cms-html";

function renderedHtml(value: string): string {
  const trimmed = value.trim();
  return trimmed ? sanitizeCmsHtml(normalizeCmsHtml(trimmed)) : "";
}

type Tool = { label: string; command: string; value?: string; icon: string };
const tools: Tool[] = [
  { label: "Bold", command: "bold", icon: "B" }, { label: "Italic", command: "italic", icon: "I" },
  { label: "Underline", command: "underline", icon: "U" }, { label: "Strikethrough", command: "strikeThrough", icon: "S" },
  { label: "Bulleted list", command: "insertUnorderedList", icon: "• List" }, { label: "Numbered list", command: "insertOrderedList", icon: "1. List" },
  { label: "Align left", command: "justifyLeft", icon: "Left" }, { label: "Align center", command: "justifyCenter", icon: "Center" },
  { label: "Align right", command: "justifyRight", icon: "Right" }, { label: "Block quote", command: "formatBlock", value: "blockquote", icon: "Quote" },
];

const GRID_ROWS = 8;
const GRID_COLUMNS = 8;
const toolbarButtonClass =
  "rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-white disabled:opacity-50";
const insertButtonClass =
  "rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:border-slate-300 hover:bg-white disabled:opacity-50";

function parseTableCount(value: string, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(max, Math.max(1, parsed));
}

function TableInsertControl({
  disabled,
  onPrepare,
  onInsert,
  onCancel,
  onOpenChange,
}: {
  disabled: boolean;
  onPrepare: () => void;
  onInsert: (rows: number, columns: number, options: CmsTableOptions) => void;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rowsText, setRowsText] = useState("3");
  const [columnsText, setColumnsText] = useState("3");
  const [headerRow, setHeaderRow] = useState(true);
  const [headerColumn, setHeaderColumn] = useState(false);
  const [style, setStyle] = useState<CmsTableStyle>("standard");
  const [hover, setHover] = useState<{ rows: number; columns: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rowsInputRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    onOpenChange(open);
    return () => {
      if (open) onOpenChange(false);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    rowsInputRef.current?.focus();
    rowsInputRef.current?.select();
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setHover(null);
      onCancelRef.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setHover(null);
      onCancelRef.current();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const rows = parseTableCount(rowsText, CMS_TABLE_MAX_ROWS);
  const columns = parseTableCount(columnsText, CMS_TABLE_MAX_COLUMNS);
  const previewRows = hover?.rows ?? rows;
  const previewColumns = hover?.columns ?? columns;

  function close() {
    setOpen(false);
    setHover(null);
    onCancel();
  }

  function add() {
    onInsert(rows, columns, { headerRow, headerColumn, style });
    setOpen(false);
    setHover(null);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title="Insert table"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onMouseDown={(event) => {
          event.preventDefault();
          if (!open) onPrepare();
        }}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        className={insertButtonClass}
      >
        Table
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Insert table"
          onKeyDown={(event) => {
            if (event.key !== "Enter" || (event.target as HTMLElement).closest("button")) return;
            event.preventDefault();
            event.stopPropagation();
            add();
          }}
          className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <p className="text-xs font-semibold text-slate-800">Insert table</p>
          <p className="mt-0.5 text-xs text-emerald-800">
            {previewRows} {previewRows === 1 ? "row" : "rows"} × {previewColumns}{" "}
            {previewColumns === 1 ? "column" : "columns"}
          </p>
          <div
            className="mt-2 grid w-fit gap-0.5"
            style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
            onMouseLeave={() => setHover(null)}
          >
            {Array.from({ length: GRID_ROWS * GRID_COLUMNS }, (_, index) => {
              const cellRow = Math.floor(index / GRID_COLUMNS) + 1;
              const cellColumn = (index % GRID_COLUMNS) + 1;
              const selected = cellRow <= previewRows && cellColumn <= previewColumns;
              return (
                <button
                  key={`${cellRow}-${cellColumn}`}
                  type="button"
                  tabIndex={-1}
                  aria-label={`${cellRow} rows by ${cellColumn} columns`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHover({ rows: cellRow, columns: cellColumn })}
                  onClick={() => {
                    setRowsText(String(cellRow));
                    setColumnsText(String(cellColumn));
                    setHover(null);
                  }}
                  className={`h-4 w-4 rounded-sm border ${selected ? "border-emerald-600 bg-emerald-200" : "border-slate-200 bg-slate-50 hover:border-emerald-300"}`}
                />
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-slate-600">
              Rows
              <input
                ref={rowsInputRef}
                aria-label="Number of rows"
                type="number"
                min={1}
                max={CMS_TABLE_MAX_ROWS}
                inputMode="numeric"
                value={rowsText}
                onChange={(event) => setRowsText(event.target.value)}
                onBlur={() => setRowsText(String(rows))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-800"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Columns
              <input
                aria-label="Number of columns"
                type="number"
                min={1}
                max={CMS_TABLE_MAX_COLUMNS}
                inputMode="numeric"
                value={columnsText}
                onChange={(event) => setColumnsText(event.target.value)}
                onBlur={() => setColumnsText(String(columns))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-800"
              />
            </label>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Up to {CMS_TABLE_MAX_ROWS} rows and {CMS_TABLE_MAX_COLUMNS} columns.
          </p>
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-600">Style</p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["standard", "compact", "plain"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setStyle(item)}
                  className={`rounded border px-1.5 py-1 text-[11px] font-semibold capitalize ${style === item ? "border-emerald-700 bg-emerald-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={headerRow} onChange={(event) => setHeaderRow(event.target.checked)} />
            Header row (counts as the first row)
          </label>
          <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={headerColumn} onChange={(event) => setHeaderColumn(event.target.checked)} />
            Header column
          </label>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            After it is added, click inside the table to change rows, columns, style, and alignment.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={add}
              className="rounded bg-emerald-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-900"
            >
              Add table
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type TableContext = {
  style: CmsTableStyle;
  headerRow: boolean;
  headerColumn: boolean;
  rows: number;
  columns: number;
};

type TableEdit =
  | "add-row"
  | "delete-row"
  | "add-column"
  | "delete-column"
  | "header-row"
  | "header-column"
  | "delete-table"
  | { type: "style"; style: CmsTableStyle }
  | { type: "align"; align: "left" | "center" | "right" };

const tableToolClass =
  "rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-900 hover:border-emerald-400 disabled:opacity-40";
const tableToolActiveClass =
  "rounded border border-emerald-700 bg-emerald-800 px-2 py-1 text-[11px] font-semibold text-white";

function TableDesignBar({
  disabled,
  context,
  onEdit,
}: {
  disabled: boolean;
  context: TableContext;
  onEdit: (action: TableEdit) => void;
}) {
  function press(action: TableEdit) {
    return {
      onMouseDown: (event: ReactMouseEvent) => event.preventDefault(),
      onClick: () => onEdit(action),
    };
  }
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-emerald-100 bg-emerald-50/80 px-2 py-1.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-900">Table</span>
      <button type="button" disabled={disabled || context.rows >= CMS_TABLE_MAX_ROWS} className={tableToolClass} {...press("add-row")}>+ Row</button>
      <button type="button" disabled={disabled || context.rows <= 1} className={tableToolClass} {...press("delete-row")}>− Row</button>
      <button type="button" disabled={disabled || context.columns >= CMS_TABLE_MAX_COLUMNS} className={tableToolClass} {...press("add-column")}>+ Column</button>
      <button type="button" disabled={disabled || context.columns <= 1} className={tableToolClass} {...press("delete-column")}>− Column</button>
      <span className="mx-1 h-4 w-px bg-emerald-200" />
      <button type="button" disabled={disabled} aria-pressed={context.headerRow} className={context.headerRow ? tableToolActiveClass : tableToolClass} {...press("header-row")}>Header row</button>
      <button type="button" disabled={disabled} aria-pressed={context.headerColumn} className={context.headerColumn ? tableToolActiveClass : tableToolClass} {...press("header-column")}>Header column</button>
      <span className="mx-1 h-4 w-px bg-emerald-200" />
      {(["standard", "compact", "plain"] as const).map((item) => (
        <button key={item} type="button" disabled={disabled} className={`capitalize ${context.style === item ? tableToolActiveClass : tableToolClass}`} {...press({ type: "style", style: item })}>{item}</button>
      ))}
      <span className="mx-1 h-4 w-px bg-emerald-200" />
      <button type="button" disabled={disabled} title="Align cell left" className={tableToolClass} {...press({ type: "align", align: "left" })}>Left</button>
      <button type="button" disabled={disabled} title="Align cell center" className={tableToolClass} {...press({ type: "align", align: "center" })}>Center</button>
      <button type="button" disabled={disabled} title="Align cell right" className={tableToolClass} {...press({ type: "align", align: "right" })}>Right</button>
      <button type="button" disabled={disabled} className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:border-red-300" {...press("delete-table")}>Delete</button>
    </div>
  );
}

export function AdminHtmlField({ name, label, value, onChange, rows = 12, disabled = false, hindi = false }: {
  name: string; label: string; value: string; onChange: (value: string) => void; rows?: number; disabled?: boolean; hindi?: boolean;
}) {
  const [mode, setMode] = useState<"design" | "html">("design");
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableContext, setTableContext] = useState<TableContext | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const suspendSyncRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  function syncTableTools() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const node = selection?.anchorNode ?? null;
    const element = node instanceof Element ? node : node?.parentElement ?? null;
    const cell = element?.closest("td, th");
    const table = cell?.closest("table");
    if (!editor || !table || !cell || !editor.contains(table)) {
      activeTableRef.current = null;
      setTableContext((current) => (current ? null : current));
      return;
    }
    activeTableRef.current = table;
    const next: TableContext = {
      style: tableStyle(table),
      headerRow: isHeaderRow(table),
      headerColumn: isHeaderColumn(table),
      rows: table.rows.length,
      columns: Math.max(0, ...[...table.rows].map((row) => row.cells.length)),
    };
    setTableContext((current) =>
      current &&
      current.style === next.style &&
      current.headerRow === next.headerRow &&
      current.headerColumn === next.headerColumn &&
      current.rows === next.rows &&
      current.columns === next.columns
        ? current
        : next,
    );
  }

  const syncTableToolsRef = useRef(syncTableTools);
  syncTableToolsRef.current = syncTableTools;

  useEffect(() => {
    if (mode !== "design") return;
    function onSelectionChange() {
      syncTableToolsRef.current();
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [mode]);

  useEffect(() => {
    if (mode !== "design" || focusedRef.current || suspendSyncRef.current || !editorRef.current) return;
    const html = renderedHtml(value);
    if (editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html;
  }, [value, mode]);

  function update() { if (editorRef.current) onChange(editorRef.current.innerHTML); }
  function command(commandName: string, commandValue?: string) { editorRef.current?.focus(); document.execCommand(commandName, false, commandValue); update(); }
  function changeFontSize(direction: "increase" | "decrease") {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const anchor = selection?.anchorNode?.parentElement;
    const currentSize = anchor ? parseFloat(window.getComputedStyle(anchor).fontSize) * 0.75 : 12;
    const nextSize = Math.max(6, Math.round(currentSize / 2) * 2 + (direction === "increase" ? 2 : -2));
    document.execCommand("fontSize", false, "7");
    (editor.querySelectorAll('font[size="7"]') as NodeListOf<HTMLElement>).forEach((element) => {
      element.removeAttribute("size");
      element.style.fontSize = `${nextSize}pt`;
    });
    update();
  }
  function changeFontColor(color: string) {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    update();
  }
  function insertLink() { const url = window.prompt("Enter the link URL"); if (url) command("createLink", url.trim()); }
  function insertImage() { const url = window.prompt("Enter the image URL"); if (!url) return; const alt = window.prompt("Image description (optional)") ?? ""; editorRef.current?.focus(); document.execCommand("insertHTML", false, `<img src="${url.trim()}" alt="${alt}" />`); update(); }
  function insertVideo() { const url = window.prompt("Enter a YouTube or video embed URL"); if (!url) return; editorRef.current?.focus(); document.execCommand("insertHTML", false, `<iframe src="${url.trim()}" title="Embedded video" width="560" height="315" allowfullscreen></iframe><p><br></p>`); update(); }

  function prepareTableInsert() {
    suspendSyncRef.current = true;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      savedRangeRef.current = null;
      return;
    }
    const range = selection.getRangeAt(0);
    savedRangeRef.current = editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  function cancelTableInsert() {
    suspendSyncRef.current = false;
    savedRangeRef.current = null;
    const editor = editorRef.current;
    if (!editor || focusedRef.current) return;
    const html = renderedHtml(valueRef.current);
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }

  function placeCaret(target: Node) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertTable(rowCount: number, columnCount: number, options: CmsTableOptions) {
    const editor = editorRef.current;
    if (!editor) return;
    suspendSyncRef.current = false;
    editor.focus();
    const selection = window.getSelection();
    const saved = savedRangeRef.current;
    if (saved && selection && editor.contains(saved.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(saved);
    }
    const html = buildCmsTableHtml(rowCount, columnCount, options).replace("<table", '<table data-cms-new="true"');
    const existingTables = new Set(editor.querySelectorAll("table"));
    document.execCommand("insertHTML", false, html);
    let table = editor.querySelector("table[data-cms-new]");
    if (!table) {
      table = [...editor.querySelectorAll("table")].find((item) => !existingTables.has(item)) ?? null;
    }
    if (!table) {
      editor.insertAdjacentHTML("beforeend", html);
      table = editor.querySelector("table[data-cms-new]");
    }
    table?.removeAttribute("data-cms-new");
    const cell = table?.querySelector("th, td");
    if (cell && selection) {
      const range = document.createRange();
      range.setStart(cell, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    savedRangeRef.current = null;
    update();
    syncTableTools();
  }

  function editTable(action: TableEdit) {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const node = selection?.anchorNode ?? null;
    const element = node instanceof Element ? node : node?.parentElement ?? null;
    const selectedCell = element?.closest("td, th");
    const table = selectedCell?.closest("table") ?? activeTableRef.current;
    if (!editor || !table || !editor.contains(table)) return;
    const cell = (selectedCell && table.contains(selectedCell) ? selectedCell : table.querySelector("td, th")) as HTMLTableCellElement | null;
    if (!cell) return;
    const rowIndex = Math.max(0, [...table.rows].indexOf(cell.parentElement as HTMLTableRowElement));
    const cellIndex = cell.cellIndex;
    let focusTarget: Node | null = cell;
    if (action === "add-row") focusTarget = addRowAfter(table, cell);
    else if (action === "delete-row") focusTarget = deleteRow(table, cell);
    else if (action === "add-column") focusTarget = addColumnAfter(table, cell);
    else if (action === "delete-column") focusTarget = deleteColumn(table, cell);
    else if (action === "delete-table") focusTarget = removeTable(table);
    else if (action === "header-row" || action === "header-column") {
      if (action === "header-row") setHeaderRow(table, !isHeaderRow(table));
      else setHeaderColumn(table, !isHeaderColumn(table));
      const row = table.rows[Math.min(rowIndex, table.rows.length - 1)];
      focusTarget = row?.cells[Math.min(cellIndex, Math.max(0, row.cells.length - 1))] ?? null;
    } else if (action.type === "style") setTableStyle(table, action.style);
    else setCellAlign(cell, action.align);
    if (focusTarget?.isConnected) placeCaret(focusTarget);
    activeTableRef.current = table.isConnected ? table : null;
    update();
    syncTableTools();
  }

  function switchMode(next: "design" | "html") {
    suspendSyncRef.current = false;
    savedRangeRef.current = null;
    activeTableRef.current = null;
    setTableContext(null);
    if (next === "html") update();
    setMode(next);
  }

  return <div className="block text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-slate-700">{label}</span><div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"><button type="button" onClick={() => switchMode("design")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === "design" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>Design</button><button type="button" onClick={() => switchMode("html")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === "html" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>HTML</button></div></div>
    <p className="mt-1 text-xs text-slate-500">{mode === "design" ? "Format content visually, or insert links, photos, videos and tables without writing HTML." : "HTML source. Switch back to Design to edit as formatted content."}</p>
    {mode === "design" ? <div className={`relative mt-2 rounded-lg border border-slate-200 bg-white shadow-sm ${tablePickerOpen ? "z-30" : ""}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-2">{tools.map((tool) => <button key={tool.command} type="button" title={tool.label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => command(tool.command, tool.value)} className="min-h-8 rounded border border-transparent px-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-white disabled:opacity-50">{tool.icon}</button>)}<span className="mx-1 h-6 w-px bg-slate-300" /><button type="button" title="Decrease font size by 2pt" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => changeFontSize("decrease")} className={toolbarButtonClass}>A−</button><button type="button" title="Increase font size by 2pt" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => changeFontSize("increase")} className={toolbarButtonClass}>A+</button><label title="Font color" className="flex cursor-pointer items-center gap-1 rounded border border-transparent px-1.5 py-1 hover:border-slate-300 hover:bg-white"><span className="text-xs font-semibold text-slate-700">Color</span><input aria-label="Font color" type="color" defaultValue="#1f2937" disabled={disabled} onChange={(e) => changeFontColor(e.target.value)} className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0" /></label><button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className={insertButtonClass}>Link</button><button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={insertImage} className={insertButtonClass}>Photo</button><button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={insertVideo} className={insertButtonClass}>Video</button><TableInsertControl disabled={disabled} onPrepare={prepareTableInsert} onInsert={insertTable} onCancel={cancelTableInsert} onOpenChange={setTablePickerOpen} /><select aria-label="Text style" disabled={disabled} defaultValue="p" onChange={(e) => command("formatBlock", e.target.value)} className="ml-auto rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="pre">Code</option></select></div>
      {tableContext ? <TableDesignBar disabled={disabled} context={tableContext} onEdit={editTable} /> : null}
      <div ref={editorRef} role="textbox" aria-label={label} aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning onFocus={() => { focusedRef.current = true; }} onBlur={() => { focusedRef.current = false; update(); }} onInput={update} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); }} className={["cms-html min-h-[12rem] max-h-[36rem] overflow-auto rounded-b-lg p-4 outline-none", disabled ? "cursor-default" : "cursor-text focus:ring-2 focus:ring-emerald-500/20", hindi ? "font-hindi" : ""].join(" ")} />
    </div> : <textarea rows={rows} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm ${hindi ? "font-hindi" : ""}`} />}
    <input type="hidden" name={name} value={value} />
  </div>;
}
