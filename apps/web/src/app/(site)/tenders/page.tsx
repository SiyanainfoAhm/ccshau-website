import { Suspense } from "react";

import { PublicTendersListing } from "@/components/site/public-tenders-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublicTenderFilterDepartments, getPublicTendersPage } from "@/lib/data/public";

export const metadata = {
  title: "Tenders",
  description: "Open and archived tenders from CCSHAU Hisar",
};

const TENDERS_PAGE_SIZE = 10;

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    category?: string;
    department?: string;
    q?: string;
  }>;
}) {
  const { status = "all", page: pageParam, category, department, q } = await searchParams;
  const [data, departments] = await Promise.all([
    getPublicTendersPage({
      page: parsePageParam(pageParam),
      pageSize: TENDERS_PAGE_SIZE,
      status: status as "open" | "closed" | "archived" | "cancelled" | "all",
      category: category || undefined,
      departmentId: department || undefined,
      q: q || undefined,
    }),
    getPublicTenderFilterDepartments(),
  ]);

  return (
    <Suspense fallback={null}>
      <PublicTendersListing
        data={data}
        activeStatus={status}
        activeCategory={category ?? ""}
        activeDepartmentId={department ?? ""}
        searchQuery={q ?? ""}
        departments={departments}
      />
    </Suspense>
  );
}
