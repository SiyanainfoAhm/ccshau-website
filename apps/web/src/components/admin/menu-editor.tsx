"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  createMenuItemAction,
  deleteMenuItemAction,
  updateMenuItemAction,
} from "@/actions/menus";
import type { Menu, MenuItem, MenuLocation, PageType } from "@/lib/database/types";
import { getPublicPagePath } from "@/lib/pages/routes";

interface PageOption {
  id: string;
  slug: string;
  title_en: string;
  page_type?: PageType;
}

function resolveHref(item: MenuItem, pages: PageOption[]): string {
  if (item.page_id) {
    const page = pages.find((p) => p.id === item.page_id);
    return page ? getPublicPagePath(page.slug, page.page_type ?? "standard") : "(page)";
  }
  return item.href ?? "—";
}

function isDescendant(items: MenuItem[], ancestorId: string, itemId: string): boolean {
  let current = items.find((i) => i.id === itemId);
  while (current?.parent_id) {
    if (current.parent_id === ancestorId) return true;
    current = items.find((i) => i.id === current!.parent_id);
  }
  return false;
}

function MenuItemForm({
  menu,
  location,
  item,
  items,
  pages,
  onDone,
}: {
  menu: Menu;
  location: MenuLocation;
  item?: MenuItem;
  items: MenuItem[];
  pages: PageOption[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<"url" | "page">(item?.page_id ? "page" : "url");

  const parentOptions = items.filter(
    (i) => i.id !== item?.id && (!item?.id || !isDescendant(items, item.id, i.id)),
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    if (linkType === "page") {
      formData.set("href", "");
    } else {
      formData.set("pageId", "");
    }

    startTransition(async () => {
      const result = item
        ? await updateMenuItemAction(item.id, menu.id, location, formData)
        : await createMenuItemAction(menu.id, location, formData);

      if (!result.success) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        {item ? "Edit menu item" : "Add menu item"}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Label (English)</span>
          <input
            name="labelEn"
            required
            defaultValue={item?.label_en ?? ""}
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Label (Hindi)</span>
          <input
            name="labelHi"
            defaultValue={item?.label_hi ?? ""}
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
          />
        </label>
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={linkType === "url"}
            onChange={() => setLinkType("url")}
          />
          Custom URL
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={linkType === "page"}
            onChange={() => setLinkType("page")}
          />
          CMS page
        </label>
      </div>

      {linkType === "url" ? (
        <label className="block text-sm">
          <span className="text-slate-600">URL</span>
          <input
            name="href"
            defaultValue={item?.href ?? ""}
            placeholder="/about or https://..."
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
          />
        </label>
      ) : (
        <label className="block text-sm">
          <span className="text-slate-600">Page</span>
          <select
            name="pageId"
            defaultValue={item?.page_id ?? ""}
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
          >
            <option value="">Select page</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title_en} (/{page.slug})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600">Parent</span>
          <select
            name="parentId"
            defaultValue={item?.parent_id ?? ""}
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
          >
            <option value="">Top level</option>
            {parentOptions.map((parent) => {
              const depth = parent.parent_id ? "↳ " : "";
              return (
                <option key={parent.id} value={parent.id}>
                  {depth}
                  {parent.label_en}
                </option>
              );
            })}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={item?.sort_order ?? 0}
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5"
          />
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              name="openInNewTab"
              type="checkbox"
              defaultChecked={item?.open_in_new_tab ?? false}
            />
            Open in new tab
          </label>
          <label className="flex items-center gap-2">
            <input name="isActive" type="checkbox" defaultChecked={item?.is_active ?? true} />
            Active
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0b3d2e] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : item ? "Update" : "Add item"}
        </button>
        {item && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function MenuEditor({
  menu,
  location,
  items,
  pages,
}: {
  menu: Menu;
  location: MenuLocation;
  items: MenuItem[];
  pages: PageOption[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(items.length === 0);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    setEditingId(null);
    setShowAdd(false);
    router.refresh();
  }

  function handleDelete(itemId: string) {
    if (!confirm("Delete this menu item?")) return;
    startTransition(async () => {
      const result = await deleteMenuItemAction(itemId, location);
      if (!result.success) {
        alert(result.error);
        return;
      }
      refresh();
    });
  }

  function renderRows(parentId: string | null, depth = 0): ReactNode[] {
    return items
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((item) => [
        <tr key={item.id} className={!item.is_active ? "bg-slate-50 opacity-60" : depth > 0 ? "bg-slate-50/50" : ""}>
          <td className="px-4 py-3 font-medium text-slate-900" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
            {depth > 0 ? "↳ " : ""}
            {item.label_en}
          </td>
          <td className="px-4 py-3 text-slate-600">{resolveHref(item, pages)}</td>
          <td className="px-4 py-3 text-slate-500">{item.sort_order}</td>
          <td className="px-4 py-3">
            {item.is_active ? (
              <span className="text-emerald-700">Active</span>
            ) : (
              <span className="text-slate-400">Hidden</span>
            )}
          </td>
          <td className="px-4 py-3 text-right">
            <button
              type="button"
              onClick={() => setEditingId(item.id)}
              className="text-emerald-700 hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(item.id)}
              className="ml-3 text-red-600 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </td>
        </tr>,
        editingId === item.id ? (
          <tr key={`edit-${item.id}`}>
            <td colSpan={5} className="px-4 py-3">
              <MenuItemForm
                menu={menu}
                location={location}
                item={item}
                items={items}
                pages={pages}
                onDone={refresh}
              />
            </td>
          </tr>
        ) : null,
        ...renderRows(item.id, depth + 1),
      ]);
  }

  return (
    <div className="space-y-6">
      {showAdd && (
        <MenuItemForm
          menu={menu}
          location={location}
          items={items}
          pages={pages}
          onDone={refresh}
        />
      )}

      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg border border-dashed border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          + Add menu item
        </button>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Label</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Link</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No items yet. Add your first link above.
                </td>
              </tr>
            ) : (
              renderRows(null)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
