"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

function AdminListSearchField({
  initialQuery,
  placeholder,
  ariaLabel,
  totalLabel,
}: {
  initialQuery: string;
  placeholder: string;
  ariaLabel: string;
  totalLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const applySearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, query, router, searchParams]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        className="relative max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          aria-label={ariaLabel}
        />
      </form>
      {totalLabel ? <p className="text-sm text-slate-500">{totalLabel}</p> : null}
    </div>
  );
}

export function AdminListSearch({
  search,
  placeholder,
  ariaLabel,
  totalLabel,
}: {
  search?: string;
  placeholder: string;
  ariaLabel: string;
  totalLabel?: string;
}) {
  return (
    <AdminListSearchField
      key={search ?? ""}
      initialQuery={search ?? ""}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      totalLabel={totalLabel}
    />
  );
}
