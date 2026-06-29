import { Suspense } from "react";

import { PublicDownloadsListing } from "@/components/site/public-downloads-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublishedDownloadsPage } from "@/lib/data/public";

export const metadata = {
  title: "Downloads",
  description: "Forms, prospectus, syllabus and official documents from CCSHAU Hisar",
};

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { category, q, page: pageParam } = await searchParams;
  const data = await getPublishedDownloadsPage({
    category,
    query: q,
    page: parsePageParam(pageParam),
  });

  return (
    <Suspense fallback={null}>
      <PublicDownloadsListing
        data={data}
        activeCategory={category ?? "all"}
        initialQuery={q ?? ""}
      />
    </Suspense>
  );
}
