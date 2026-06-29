"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminSession } from "@/lib/auth/session";

export function AdminHeader({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Admin Dashboard</p>
        <p className="text-xs text-slate-500">
          {session.displayName} · {session.primaryRole?.replace("_", " ") ?? "no role"}
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {loading ? "Signing out…" : "Sign out"}
      </button>
    </header>
  );
}
