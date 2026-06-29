import Link from "next/link";
import { notFound } from "next/navigation";

import { getMenuEditorData } from "@/actions/menus";
import { MenuEditor } from "@/components/admin/menu-editor";
import { requireAdminSession } from "@/lib/auth/session";
import { isValidMenuLocation } from "@/lib/validations/menus";
import type { MenuLocation } from "@/lib/database/types";

const LOCATION_LABELS: Record<MenuLocation, string> = {
  header: "Header navigation",
  footer: "Footer links",
  quick_links: "Quick links",
};

export default async function AdminMenuLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  await requireAdminSession();
  const { location } = await params;

  if (!isValidMenuLocation(location)) notFound();

  const data = await getMenuEditorData(location);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/menus" className="text-sm text-emerald-700 hover:underline">
          ← All menus
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">
          {LOCATION_LABELS[location]}
        </h1>
        <p className="text-sm text-slate-500">
          {data.menu.name_hi ? `${data.menu.name_hi} · ` : ""}
          {data.items.length} menu items
        </p>
      </div>

      <MenuEditor
        menu={data.menu}
        location={location}
        items={data.items}
        pages={data.pages}
      />
    </div>
  );
}
