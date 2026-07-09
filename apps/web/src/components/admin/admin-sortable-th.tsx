"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { SortOrder } from "@/lib/data/admin-list";

export function AdminSortableTh({
  label,
  column,
  currentSort,
  currentOrder,
  align = "left",
}: {
  label: string;
  column: string;
  currentSort: string;
  currentOrder: SortOrder;
  align?: "left" | "right";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = currentSort === column;
  const nextOrder: SortOrder = isActive && currentOrder === "asc" ? "desc" : "asc";

  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", column);
  params.set("order", isActive ? nextOrder : "asc");
  params.delete("page");
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  const alignClass = align === "right" ? "text-right" : "text-left";

  return (
    <th className={`px-4 py-3 ${alignClass} font-semibold text-slate-700`}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 hover:text-emerald-800 ${align === "right" ? "float-right" : ""}`}
        aria-sort={isActive ? (currentOrder === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        )}
      </Link>
    </th>
  );
}
