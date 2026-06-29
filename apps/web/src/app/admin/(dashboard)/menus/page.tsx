import Link from "next/link";
import { Menu } from "lucide-react";

import { listMenusForAdmin } from "@/actions/menus";
import { requireAdminSession } from "@/lib/auth/session";

const LOCATION_LABELS: Record<string, string> = {
  header: "Header navigation",
  footer: "Footer links",
  quick_links: "Quick links",
};

export default async function AdminMenusPage() {
  await requireAdminSession();
  const menus = await listMenusForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Menu manager</h1>
        <p className="text-sm text-slate-500">Manage header, footer, and quick-link navigation</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {menus.map((menu) => (
          <Link
            key={menu.id}
            href={`/admin/menus/${menu.location}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                <Menu className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {LOCATION_LABELS[menu.location] ?? menu.name_en}
                </p>
                <p className="mt-1 text-sm text-slate-500">{menu.item_count} items</p>
                <p className="mt-2 text-xs capitalize text-emerald-700">
                  {menu.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
