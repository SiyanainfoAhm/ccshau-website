import { Suspense } from "react";

import { PublicNewsListing } from "@/components/site/public-news-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublishedNewsPage } from "@/lib/data/public";

export const metadata = {
  title: "News & Notices",
  description: "Latest news, notices, and announcements from CCSHAU Hisar",
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageParam } = await searchParams;
  const activeCategory = category ?? "All";
  const data = await getPublishedNewsPage({
    page: parsePageParam(pageParam),
    category: activeCategory === "All" ? undefined : activeCategory,
  });

  return (
    <Suspense fallback={null}>
      <PublicNewsListing data={data} activeCategory={activeCategory} />
    </Suspense>
  );
}
