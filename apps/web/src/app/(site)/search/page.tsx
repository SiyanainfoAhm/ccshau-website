import { Suspense } from "react";

import { PublicSearchPage } from "@/components/site/public-search-page";
import type { PublicSearchContentType } from "@/lib/data/public-types";
import { parsePageParam } from "@/lib/data/pagination";
import { searchPublishedContentPage } from "@/lib/data/search";

export const metadata = {
  title: "Search",
  description: "Search CCSHAU Hisar website — pages, news, tenders, circulars, downloads and media",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { q = "", type, page: pageParam } = await searchParams;
  const types =
    type && type !== "all" ? ([type] as PublicSearchContentType[]) : undefined;
  const data =
    q.trim().length >= 2
      ? await searchPublishedContentPage({
          query: q,
          types,
          page: parsePageParam(pageParam),
        })
      : {
          items: [],
          total: 0,
          page: 1,
          pageSize: 15,
          totalPages: 1,
        };

  return (
    <Suspense fallback={null}>
      <PublicSearchPage data={data} query={q} />
    </Suspense>
  );
}
