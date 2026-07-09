import { Suspense } from "react";

import { AdminPagination } from "@/components/admin/admin-pagination";
import type { PaginatedResult } from "@/lib/data/pagination";

export function AdminListFooter<T>({
  data,
}: {
  data: Pick<PaginatedResult<T>, "page" | "pageSize" | "total" | "totalPages">;
}) {
  return (
    <Suspense fallback={null}>
      <AdminPagination data={data} />
    </Suspense>
  );
}
