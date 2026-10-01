"use client";

import { useEffect, useRef, useState } from "react";
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

export function AdminHtmlField({ name, label, value, onChange, rows = 12, disabled = false, hindi = false }: {
  name: string; label: string; value: string; onChange: (value: string) => void; rows?: number; disabled?: boolean; hindi?: boolean;
}) {
  const [mode, setMode] = useState<"design" | "html">("design");
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  useEffect(() => {
    if (mode !== "design" || focusedRef.current || !editorRef.current) return;
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
  function switchMode(next: "design" | "html") { if (next === "html") update(); setMode(next); }
  return <div className="block text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-slate-700">{label}</span><div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"><button type="button" onClick={() => switchMode("design")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === "design" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>Design</button><button type="button" onClick={() => switchMode("html")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === "html" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>HTML</button></div></div>
    <p className="mt-1 text-xs text-slate-500">{mode === "design" ? "Format content visually, or insert links, photos and videos without writing HTML." : "HTML source. Switch back to Design to edit as formatted content."}</p>
    {mode === "design" ? <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-2">{tools.map((tool) => <button key={tool.command} type="button" title={tool.label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => command(tool.command, tool.value)} className="min-h-8 rounded border border-transparent px-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-white disabled:opacity-50">{tool.icon}</button>)}<span className="mx-1 h-6 w-px bg-slate-300" /><button type="button" title="Decrease font size by 2pt" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => changeFontSize("decrease")} className="rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-white">A−</button><button type="button" title="Increase font size by 2pt" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => changeFontSize("increase")} className="rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-white">A+</button><label title="Font color" className="flex cursor-pointer items-center gap-1 rounded border border-transparent px-1.5 py-1 hover:border-slate-300 hover:bg-white"><span className="text-xs font-semibold text-slate-700">Color</span><input aria-label="Font color" type="color" defaultValue="#1f2937" disabled={disabled} onChange={(e) => changeFontColor(e.target.value)} className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0" /></label><button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className="rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:border-slate-300 hover:bg-white">Link</button><button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={insertImage} className="rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:border-slate-300 hover:bg-white">Photo</button><button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={insertVideo} className="rounded border border-transparent px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:border-slate-300 hover:bg-white">Video</button><select aria-label="Text style" disabled={disabled} defaultValue="p" onChange={(e) => command("formatBlock", e.target.value)} className="ml-auto rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="pre">Code</option></select></div>
      <div ref={editorRef} role="textbox" aria-label={label} aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning onFocus={() => { focusedRef.current = true; }} onBlur={() => { focusedRef.current = false; update(); }} onInput={update} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); }} className={["cms-html min-h-[12rem] max-h-[36rem] overflow-auto p-4 outline-none", disabled ? "cursor-default" : "cursor-text focus:ring-2 focus:ring-emerald-500/20", hindi ? "font-hindi" : ""].join(" ")} />
    </div> : <textarea rows={rows} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm ${hindi ? "font-hindi" : ""}`} />}
    <input type="hidden" name={name} value={value} />
  </div>;
}
