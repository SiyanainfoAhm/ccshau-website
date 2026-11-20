"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { saveMicrositeMenuAction } from "@/actions/microsite-menu";
import type { MicrositeMenuAvailablePage } from "@/lib/data/microsite-menu";
import type { MicrositeMenuDraftItem, MicrositeMenuEditorItem } from "@/lib/pages/microsite-menu";

function insertBeforeContact(items: MicrositeMenuEditorItem[], item: MicrositeMenuEditorItem) {
  const contactIndex = items.findIndex((entry) => entry.kind === "contact");
  if (contactIndex < 0) return [...items, item];
  return [...items.slice(0, contactIndex), item, ...items.slice(contactIndex)];
}

function toDraft(items: MicrositeMenuEditorItem[]): MicrositeMenuDraftItem[] {
  return items.map((item) => ({
    kind: item.kind,
    visible: item.visible,
    labelEn: item.labelEn,
    labelHi: item.labelHi,
    pageId: item.pageId,
    href: item.href,
    openInNewTab: item.openInNewTab,
  }));
}

export function MicrositeMenuForm({
  collegePageId,
  usingSavedMenu,
  initialItems,
  availablePages,
}: {
  collegePageId: string;
  usingSavedMenu: boolean;
  initialItems: MicrositeMenuEditorItem[];
  availablePages: MicrositeMenuAvailablePage[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pages, setPages] = useState(availablePages);
  const [customMenu, setCustomMenu] = useState(usingSavedMenu);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addKind, setAddKind] = useState<"new-page" | "link" | "page">("new-page");
  const [labelEn, setLabelEn] = useState("");
  const [labelHi, setLabelHi] = useState("");
  const [href, setHref] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [existingPageId, setExistingPageId] = useState(availablePages[0]?.id ?? "");

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = items.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    setItems(copy);
    setSaved(false);
  }

  function update(key: string, patch: Partial<MicrositeMenuEditorItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    setSaved(false);
  }

  function remove(item: MicrositeMenuEditorItem) {
    setItems((current) => current.filter((entry) => entry.key !== item.key));
    if (item.kind === "page" && item.pageId && !item.missing) {
      setPages((current) => [
        ...current,
        { id: item.pageId!, titleEn: item.labelEn, titleHi: item.labelHi, slug: "" },
      ]);
      setExistingPageId((current) => current || item.pageId!);
    }
    setSaved(false);
  }

  function addItem() {
    setError(null);
    if (addKind === "page") {
      const page = pages.find((entry) => entry.id === existingPageId);
      if (!page) {
        setError("Choose a page to add.");
        return;
      }
      setItems((current) =>
        insertBeforeContact(current, {
          key: `page:${page.id}`,
          kind: "page",
          visible: true,
          labelEn: page.titleEn,
          labelHi: page.titleHi,
          pageId: page.id,
          href: "",
          openInNewTab: false,
          missing: false,
        }),
      );
      setPages((current) => current.filter((entry) => entry.id !== page.id));
      setExistingPageId("");
      setSaved(false);
      return;
    }
    if (!labelEn.trim()) {
      setError("Enter an English name.");
      return;
    }
    if (addKind === "link") {
      const target = href.trim();
      if (!target.startsWith("/") && !target.startsWith("http://") && !target.startsWith("https://")) {
        setError("Web links must start with / or http:// or https://.");
        return;
      }
      setItems((current) =>
        insertBeforeContact(current, {
          key: `link:${crypto.randomUUID()}`,
          kind: "link",
          visible: true,
          labelEn: labelEn.trim(),
          labelHi: labelHi.trim(),
          pageId: null,
          href: target,
          openInNewTab,
          missing: false,
        }),
      );
    } else {
      setItems((current) =>
        insertBeforeContact(current, {
          key: `new:${crypto.randomUUID()}`,
          kind: "new-page",
          visible: true,
          labelEn: labelEn.trim(),
          labelHi: labelHi.trim(),
          pageId: null,
          href: "",
          openInNewTab: false,
          missing: false,
        }),
      );
    }
    setLabelEn("");
    setLabelHi("");
    setHref("");
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveMicrositeMenuAction(collegePageId, toDraft(items));
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems(result.data.items);
      setPages(result.data.availablePages);
      setCustomMenu(true);
      setSaved(true);
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          {customMenu
            ? "This saved menu is what visitors see."
            : "This matches the menu visitors see now. Save after you add, reorder, or hide items."}
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-sm text-emerald-700">Menu saved.</p>}

        <ul className="mt-4 space-y-3">
          {items.map((item, index) => {
            const locked = item.kind === "home" || item.kind === "contact";
            return (
              <li
                key={item.key}
                className={`rounded-lg border border-slate-200 p-3 ${item.visible ? "bg-white" : "bg-slate-50 opacity-70"}`}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0 || isPending}
                      onClick={() => move(index, -1)}
                      className="rounded border border-slate-200 p-1 text-slate-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === items.length - 1 || isPending}
                      onClick={() => move(index, 1)}
                      className="rounded border border-slate-200 p-1 text-slate-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => update(item.key, { visible: !item.visible })}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      item.visible ? "bg-emerald-50 text-emerald-800" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {item.visible ? "Shown" : "Hidden"}
                  </button>
                  <label className="min-w-[12rem] flex-1 text-sm">
                    <span className="text-slate-500">English</span>
                    <input
                      value={item.labelEn}
                      onChange={(event) => update(item.key, { labelEn: event.target.value })}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                    />
                  </label>
                  <label className="min-w-[12rem] flex-1 text-sm">
                    <span className="text-slate-500">Hindi</span>
                    <input
                      value={item.labelHi}
                      onChange={(event) => update(item.key, { labelHi: event.target.value })}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                    />
                  </label>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="mt-5 inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                  )}
                </div>
                {item.kind === "link" && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 pl-11">
                    <label className="min-w-[16rem] flex-1 text-sm">
                      <span className="text-slate-500">Link</span>
                      <input
                        value={item.href}
                        onChange={(event) => update(item.key, { href: event.target.value })}
                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                      />
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={item.openInNewTab}
                        onChange={(event) => update(item.key, { openInNewTab: event.target.checked })}
                      />
                      Open in a new tab
                    </label>
                  </div>
                )}
                <div className="mt-2 pl-11 text-xs text-slate-500">
                  {item.kind === "home" && "Opens the microsite home page."}
                  {item.kind === "contact" && "Opens the microsite contact page."}
                  {item.kind === "new-page" && "A new page is created when you save. You can add its content afterwards."}
                  {item.kind === "page" && item.missing && "This page is no longer available. Remove it before saving."}
                  {item.kind === "page" && !item.missing && item.pageId && (
                    <Link href={`/admin/pages/${item.pageId}`} className="text-emerald-700 hover:underline">
                      Edit page content
                    </Link>
                  )}
                  {item.kind === "link" && "Opens the address above."}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save menu"}
          </button>
          <Link href={`/admin/register/${collegePageId}`} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
            Back
          </Link>
        </div>
      </div>

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          addItem();
        }}
      >
        <h2 className="font-display text-lg font-bold text-slate-900">Add menu</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={addKind === "new-page"} onChange={() => setAddKind("new-page")} />
            New page
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={addKind === "page"} onChange={() => setAddKind("page")} />
            Existing page
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={addKind === "link"} onChange={() => setAddKind("link")} />
            Web link
          </label>
        </div>

        {addKind === "page" ? (
          <label className="block text-sm">
            <span className="text-slate-600">Page</span>
            <select
              value={existingPageId}
              onChange={(event) => setExistingPageId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
            >
              <option value="">Choose a page</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.titleEn}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">English name</span>
              <input
                value={labelEn}
                onChange={(event) => setLabelEn(event.target.value)}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Hindi name</span>
              <input
                value={labelHi}
                onChange={(event) => setLabelHi(event.target.value)}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
              />
            </label>
            {addKind === "link" && (
              <>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-600">Link</span>
                  <input
                    value={href}
                    onChange={(event) => setHref(event.target.value)}
                    placeholder="https://… or /college/…"
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={openInNewTab}
                    onChange={(event) => setOpenInNewTab(event.target.checked)}
                  />
                  Open in a new tab
                </label>
              </>
            )}
          </div>
        )}

        <button type="submit" className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800">
          Add to menu
        </button>
      </form>
    </div>
  );
}
