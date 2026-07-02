"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createPageContactLineAction,
  createPageSidebarItemAction,
  createPageStaffAction,
  deletePageContactLineAction,
  deletePageSidebarItemAction,
  deletePageStaffAction,
} from "@/actions/office-portal";
import type { PageContactLine, PageSidebarItem, PageStaff } from "@/lib/database/types";

function DeleteButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete this ${label}?`)) return;
        startTransition(onConfirm);
      }}
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      Delete
    </button>
  );
}

export function OfficePortalAdminPanel({
  pageId,
  contactLines,
  staff,
  sidebarItems,
}: {
  pageId: string;
  contactLines: PageContactLine[];
  staff: PageStaff[];
  sidebarItems: PageSidebarItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const leftItems = sidebarItems.filter((item) => item.side === "left");
  const rightItems = sidebarItems.filter((item) => item.side === "right");

  function refresh() {
    router.refresh();
  }

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Save failed.");
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-slate-900">Contact lines</h2>
        <ul className="mt-4 space-y-2">
          {contactLines.map((line) => (
            <li
              key={line.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-slate-800">{line.label_en}</p>
                <p className="text-slate-600">{line.value_en}</p>
              </div>
              <DeleteButton
                label="contact line"
                onConfirm={async () => {
                  await deletePageContactLineAction(pageId, line.id);
                }}
              />
            </li>
          ))}
        </ul>
        <form
          className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
          action={(formData) =>
            runAction(() => createPageContactLineAction(pageId, formData))
          }
        >
          <input name="labelEn" required placeholder="Label (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="labelHi" placeholder="Label (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
          <input name="valueEn" required placeholder="Value (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="valueHi" placeholder="Value (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi sm:col-span-2" />
          <input name="sortOrder" type="number" defaultValue={contactLines.length + 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Add contact line
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-slate-900">Staff directory</h2>
        <ul className="mt-4 space-y-2">
          {staff.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold text-slate-800">{row.name_en}</p>
                <p className="text-slate-600">{row.designation_en}</p>
              </div>
              <DeleteButton
                label="staff row"
                onConfirm={async () => {
                  await deletePageStaffAction(pageId, row.id);
                }}
              />
            </li>
          ))}
        </ul>
        <form
          className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
          action={(formData) => runAction(() => createPageStaffAction(pageId, formData))}
        >
          <input name="nameEn" required placeholder="Name (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="nameHi" placeholder="Name (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
          <input name="designationEn" required placeholder="Designation (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="designationHi" placeholder="Designation (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
          <input name="specializationEn" placeholder="Specialization (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="specializationHi" placeholder="Specialization (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
          <input name="imagePath" placeholder="Photo URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="detailHref" placeholder="Details link URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="sortOrder" type="number" defaultValue={staff.length + 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Add staff member
          </button>
        </form>
      </section>

      <SidebarEditor
        title="Left sidebar quick links"
        side="left"
        items={leftItems}
        pageId={pageId}
        isPending={isPending}
        onAdd={(formData) => runAction(() => createPageSidebarItemAction(pageId, formData))}
        onDelete={(id) => runAction(() => deletePageSidebarItemAction(pageId, id))}
      />

      <SidebarEditor
        title="Right sidebar quick links"
        side="right"
        items={rightItems}
        pageId={pageId}
        isPending={isPending}
        onAdd={(formData) => runAction(() => createPageSidebarItemAction(pageId, formData))}
        onDelete={(id) => runAction(() => deletePageSidebarItemAction(pageId, id))}
      />
    </div>
  );
}

function SidebarEditor({
  title,
  side,
  items,
  pageId,
  isPending,
  onAdd,
  onDelete,
}: {
  title: string;
  side: "left" | "right";
  items: PageSidebarItem[];
  pageId: string;
  isPending: boolean;
  onAdd: (formData: FormData) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-slate-800">{item.label_en}</p>
              <p className="text-slate-500">{item.href ?? "(linked page)"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this sidebar link?")) onDelete(item.id);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
        action={onAdd}
      >
        <input type="hidden" name="side" value={side} />
        <input name="labelEn" required placeholder="Label (English)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="labelHi" placeholder="Label (Hindi)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-hindi" />
        <input name="href" required placeholder="URL e.g. /college/registrar-office" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="sortOrder" type="number" defaultValue={items.length + 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Add {side} link
        </button>
      </form>
    </section>
  );
}
